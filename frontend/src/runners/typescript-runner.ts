import type { RunResult } from './runner';
import JavascriptRunner from './javascript-runner';
import type TS from 'typescript';

type Typescript = typeof TS;

const CODE_SAMPLE = `\
function greet(name: string): string {
    return \`Hello, \${name}!\`;
}
console.log(greet('World'));
`;

let typescriptModule: Typescript;

async function init(): Promise<RunResult> {
    try {
        typescriptModule = await getTS();
    } catch (err: any) {
        console.error('Error initializing Typescript environment:', err);
        return { output: [{ type: 'error', text: String(err.message) }] };
    }

    return { output: [{ type: 'log', text: `Typescript ${typescriptModule.version}` }] };
}

async function getTS(): Promise<Typescript> {
    if (typescriptModule) {
        return typescriptModule;
    }

    // replace with actual url
    // @ts-expect-error dynamically imported js for now
    return (await import('http://localhost:5173/typescript.js')).default as unknown as Typescript;
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
export default { init, runCode, CODE_SAMPLE };
