// Import types only - won't be included in bundle
import type { PyodideInterface } from 'pyodide';
import type { RunResult, OutputEntry } from 'coderjam-shared';

let pyodide: PyodideInterface;

function isReady(): boolean {
    return pyodide !== undefined;
}

async function init(): Promise<RunResult> {
    await import(window.location.origin + '/pyodide/pyodide.js');

    if (!Object.hasOwn(window, 'loadPyodide')) {
        throw new Error('Pyodide failed to load');
    }

    // @ts-expect-error dynamically imported js for now
    pyodide = await window.loadPyodide();
    const pythonVersionStr: string = await pyodide.runPythonAsync(
        'import platform; f"{platform.python_version()} ({\' \'.join(platform.python_build())})"'
    );
    return {
        output: [
            { type: 'log', text: `Pyodide ${pyodide.version}` },
            { type: 'log', text: `Python ${pythonVersionStr}` },
        ],
    };
}

async function getPyodide(): Promise<PyodideInterface> {
    if (pyodide) {
        return pyodide;
    }

    await init();
    return pyodide;
}

async function runCode(code: string): Promise<RunResult> {
    const pyodide = await getPyodide();

    await pyodide.loadPackagesFromImports(code, {
        errorCallback: (error) => console.error(`Pyodide import: ${error}`),
    });

    const outputEntries: OutputEntry[] = [];
    const addStdout = (text: string) => outputEntries.push({ text, type: 'log' });
    const addStderr = (text: string) => outputEntries.push({ text, type: 'error' });
    pyodide.setStdout({ batched: addStdout });
    pyodide.setStderr({ batched: addStderr });
    try {
        await pyodide.runPythonAsync(code);
    } catch (error: any) {
        console.error('Pyodide error:', error);
        outputEntries.push({
            text: `${error.name}: ${error.message}`,
            type: 'error',
        });
    }
    pyodide.setStdout({});
    pyodide.setStderr({});
    return {
        output: outputEntries,
    };
}

export default { runCode, init, isReady };
