import JavascriptRunner from './javascript-runner';
import type TS from 'typescript';
import type { RunResult } from 'coderjam-shared';

type Typescript = typeof TS;

const CODE_SAMPLE = `\
function greet(name: string): string {
    return \`Hello, \${name}!\`;
}
console.log(greet('World'));
`;

let typescriptModule: Typescript;

function isReady(): boolean {
    return typescriptModule !== undefined;
}

async function init(): Promise<RunResult> {
    try {
        typescriptModule = await getTS();
    } catch (errRaw: unknown) {
        const err = errRaw as Error;
        console.error('Error initializing Typescript environment:', err);
        return { output: [{ type: 'error', text: String(err.message) }] };
    }

    return { output: [{ type: 'log', text: `Typescript ${typescriptModule.version}` }] };
}

async function getTS(): Promise<Typescript> {
    if (typescriptModule) {
        return typescriptModule;
    }

    return (await import(window.location.origin + '/typescript.js'))
        .default as unknown as Typescript;
}

async function runCode(code: string): Promise<RunResult> {
    const ts = await getTS();

    // TODO THIS DOES NOT TYPE CHECK
    const jsCode = ts.transpile(code, {
        module: 1, // ModuleKind.CommonJS
        target: 2, // ScriptTarget.ES2015
        noEmitOnError: true,
        esModuleInterop: true,
        strict: true,
        alwaysStrict: true,
        isolatedModules: true,
        noLib: true,
        noResolve: true,
    });

    return JavascriptRunner.runCode(jsCode);
}

// noinspection JSUnusedGlobalSymbols
export default { init, runCode, isReady, CODE_SAMPLE };
