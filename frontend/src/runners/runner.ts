import JavascriptRunner from './javascript-runner';
import TypescriptRunner from './typescript-runner';
import GoRunner from './go-runner';
import PythonRunner from './python-runner';
import type { RunResult } from 'coderjam-shared';

export type Runner = {
    // Initializes the runner environment, optionally taking a progress callback
    // Note that some runners may not support progress callback
    init: () => Promise<RunResult>;
    isReady?: () => boolean;
    runCode: (code: string) => Promise<RunResult>;
};

export const RUNNERS: Record<string, Runner> = {
    javascript: {
        init: JavascriptRunner.init,
        isReady: JavascriptRunner.isReady,
        runCode: JavascriptRunner.runCode,
    },
    typescript: {
        init: TypescriptRunner.init,
        isReady: TypescriptRunner.isReady,
        runCode: TypescriptRunner.runCode,
    },
    go: {
        init: GoRunner.init,
        isReady: GoRunner.isReady,
        runCode: GoRunner.runCode,
    },
    python: {
        init: PythonRunner.init,
        isReady: PythonRunner.isReady,
        runCode: PythonRunner.runCode,
    },
};
