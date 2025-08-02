import { type JSModuleLoadResult, QuickJSContext, QuickJSWASMModule } from 'quickjs-emscripten';
import { newQuickJSWASMModuleFromVariant, newVariant, RELEASE_SYNC } from 'quickjs-emscripten';
import wasmLocation from '@jitl/quickjs-wasmfile-release-sync/wasm?url';

import type { RunResult } from 'coderjam-shared';

const CODE_SAMPLE = `\
console.log('Hello World!');
`;

const variant = newVariant(RELEASE_SYNC, {
    wasmLocation,
});

let quickJSModule: QuickJSWASMModule;

function isReady(): boolean {
    return quickJSModule !== undefined;
}

async function init(): Promise<RunResult> {
    try {
        quickJSModule = await getJS();
    } catch (errRaw: unknown) {
        const err = errRaw as Error;
        console.error('Error initializing Javascript environment:', err);
        return { output: [{ type: 'error', text: String(err.message) }] };
    }

    return { output: [{ type: 'log', text: `Javascript ` }] };
}

async function getJS(): Promise<QuickJSWASMModule> {
    if (quickJSModule) {
        console.log(quickJSModule);
        return quickJSModule;
    }

    return await newQuickJSWASMModuleFromVariant(variant);
}

async function runCode(code: string): Promise<RunResult> {
    const js = await getJS();

    let interruptCycles = 0;
    const runtime = js.newRuntime({
        interruptHandler: () => ++interruptCycles > 1024,
        moduleLoader: (moduleName): JSModuleLoadResult => {
            console.info('Tried to load module:', moduleName);
            return {
                error: new Error('Loading modules is not supported'),
            };
        },
    });
    const vm = runtime.newContext();

    vm.evalCode(`
        globalThis.output = [];
        globalThis.console = {
            log: (...args) => {
                const entry = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                globalThis.output.push(entry);
            },
            error: (...args) => {
                const entry = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                globalThis.output.push('%%ERROR%%' + entry);
            }
        };
    `);

    const result = vm.evalCode(code);

    if (result.error) {
        const error: Error = vm.dump(result.error);
        console.error(`${error.name}: ${error.message}`, error);
        result.error.dispose();

        return {
            output: [{ text: `${error.name}: ${error.message}`, type: 'error' }],
        };
    }
    result.dispose();

    const codedOutput = extractArrayFromVM(vm, 'output');

    const runResult: RunResult = {
        output: codedOutput.map((entry) => {
            if (entry.startsWith('%%ERROR%%')) {
                return {
                    text: entry.slice(9),
                    type: 'error',
                };
            }
            return {
                text: entry,
                type: 'log',
            };
        }),
    };

    vm.dispose();

    return runResult;
}

const extractArrayFromVM = (vm: QuickJSContext, name: string): string[] => {
    const arrayHandle = vm.getProp(vm.global, name);
    const arr: string[] = [];
    const lenHandle = vm.getProp(arrayHandle, 'length');
    const len = vm.getNumber(lenHandle);
    lenHandle.dispose();

    for (let i = 0; i < len; i++) {
        const itemHandle = vm.getProp(arrayHandle, i);
        arr.push(vm.getString(itemHandle));
        itemHandle.dispose();
    }
    arrayHandle.dispose();
    return arr;
};

export default { runCode, init, isReady, CODE_SAMPLE };
