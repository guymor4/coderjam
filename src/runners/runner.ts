import JavascriptRunner from './javascript-runner';
import TypescriptRunner from './typescript-runner';
import GoRunner from './go-runner';
import PythonRunner from './python-runner';

export type OutputEntry = {
    text: string;
    type: 'log' | 'error';
};

export type RunResult = {
    output: OutputEntry[];
};

export type Runner = {
    codeSample: string;

    init?: () => Promise<RunResult>;
    runCode: (code: string) => Promise<RunResult>;
    // dispose?: () => void; // Uncomment if you want to support cleanup
};

export const RUNNERS: Record<string, Runner> = {
    javascript: {
        runCode: JavascriptRunner.runCode,
        codeSample: JavascriptRunner.CODE_SAMPLE,
    },
    typescript: {
        init: TypescriptRunner.init,
        runCode: TypescriptRunner.runCode,
        codeSample: TypescriptRunner.CODE_SAMPLE,
    },
    go: {
        init: GoRunner.onInit,
        runCode: GoRunner.runCode,
        codeSample: GoRunner.CODE_SAMPLE,
    },
    python: {
        init: PythonRunner.init,
        runCode: PythonRunner.runCode,
        codeSample: PythonRunner.CODE_SAMPLE,
    },
};
