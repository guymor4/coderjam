import type { OutputEntry } from './runner';
import type { RunResult } from './runner';

type Go = {
    childProcess: GoChildProcess;
    fs: GoFS;
    hackpad: GoHackpad;
};

type GoChildProcess = {
    spawn: (name: string, args: string[], options?: Record<string, unknown>) => Process;
    wait: (
        pid: number,
        callback: (err: Error | null, process?: Process) => void
    ) => Promise<Process>;
    execCommand: (
        command: string,
        args: string[]
    ) => Promise<{
        exitCode: number;
        pid: number;
        stdout: string;
        stderr: string;
    }>;
};

type GoFS = {
    openSync: (filename: string, flags: number, mode?: number) => number;
    writeSync: (
        fd: number,
        buffer: string | Uint8Array,
        offset?: number,
        length?: number,
        position?: number
    ) => number;
    closeSync: (fd: number) => void;
    mkdirSync: (path: string, options: unknown) => void;
};

type GoHackpad = {
    overlayTarGzip: (
        targetPath: string,
        tarGzipPath: string,
        options: {
            persist?: boolean;
            skipCacheDirs?: string[];
            progress?: (percentage: number) => void;
        }
    ) => Promise<void>;
    overlayIndexedDB: (targetPath: string, options?: { cache?: boolean }) => Promise<void>;
};

type Process = {
    pid: number;
    exitCode?: number;
    error?: Error;
    kill: (signal?: string) => void;
};

const GO_WASM_URL = `/go.wasm`;
const WASM_EXEC_PATH = './wasm_exec.js'; // Path to the Go WASM exec JS file
const USER_CODE_FILENAME = '/userCode.go'; // Must be in root directory
const O_CREAT = 0x40; // Create file if it does not exist
const O_TRUNC = 0x200; // Truncate file to zero length
const O_WRONLY = 0x1; // Write only
const allPermissions = 0o777; // All permissions

const CODE_SAMPLE = `\
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`;

let singletonGo: Go | undefined = undefined;
let cmd: WebAssembly.WebAssemblyInstantiatedSource;

async function init(): Promise<RunResult> {
    try {
        await getGo();
        return await runGoCommand(['version'], false);
    } catch (err: any) {
        console.error('Error initializing Go environment:', err);
        return { output: [{ type: 'error', text: String(err.message) }] };
    }
}

async function getGo(): Promise<Go> {
    if (singletonGo) {
        return singletonGo;
    }

    await import(WASM_EXEC_PATH);
    // @ts-expect-error dynamically imported js
    const goJsWrapper = new window.Go();
    // Load Go WASM module
    // It will be loaded to the global `window` object
    cmd = await WebAssembly.instantiateStreaming(fetch(GO_WASM_URL), goJsWrapper.importObject);
    goJsWrapper.env = {
        // GOMODCACHE: '/home/me/.cache/go-mod',
        GOPROXY: 'https://proxy.golang.org/',
        GOROOT: '/usr/local/go',
        HOME: '/home/me',
        PATH: '/bin:/home/me/go/bin:/usr/local/go/bin/js_wasm:/usr/local/go/pkg/tool/js_wasm',
    };
    goJsWrapper.run(cmd.instance);

    singletonGo = {
        // @ts-expect-error dynamically imported js
        childProcess: window.child_process,
        // @ts-expect-error dynamically imported js
        fs: window.fs,
        // @ts-expect-error dynamically imported js
        hackpad: window.hackpad,
    };

    console.log('Creating /bin and /home/me directories...');
    singletonGo.fs.mkdirSync('/bin', { mode: 0o700 });
    await singletonGo.hackpad.overlayIndexedDB('/bin', { cache: true });
    await singletonGo.hackpad.overlayIndexedDB('/home/me');
    // console.log('Creating /home/me/.cache directory...');
    // await singletonGo.fs.mkdirSync('/home/me/.cache', { recursive: true, mode: 0o700 });
    // await singletonGo.hackpad.overlayIndexedDB('/home/me/.cache', { cache: true });

    console.log('Creating /usr/local/go directory...');
    await singletonGo.fs.mkdirSync('/usr/local/go', {
        recursive: true,
        mode: 0o700,
    });

    await singletonGo.hackpad.overlayTarGzip('/usr/local/go', '/go.gzip', {
        persist: true,
        skipCacheDirs: ['/usr/local/go/pkg/mod', '/usr/local/go/pkg/tool/js_wasm'],
    });
    console.log('Done setting up Go environment.');

    return singletonGo;
}

async function runCode(code: string): Promise<RunResult> {
    const go = await getGo();

    // Write the user code to a temporary file
    let userFD: number | undefined;
    try {
        // Create the file with write permissions
        userFD = go.fs.openSync(USER_CODE_FILENAME, O_WRONLY | O_CREAT | O_TRUNC, allPermissions);

        // Convert the code to a Uint8Array of UTF-8
        const content = new TextEncoder().encode(code);

        // Write the content to the file
        const bytesWritten = go.fs.writeSync(userFD, content);
        if (bytesWritten != content.length) {
            return {
                output: [
                    {
                        type: 'error',
                        text: `Failed to write all bytes to file: ${USER_CODE_FILENAME}`,
                    },
                ],
            };
        }
    } catch (err: any) {
        console.error('Error writing code to file:', err);
        return { output: [{ type: 'error', text: String(err.message) }] };
    } finally {
        // Ensure the file is closed
        if (userFD !== undefined) {
            go.fs.closeSync(userFD);
        }
    }

    // Run the Go code using the child process
    return await runGoCommand(['run', USER_CODE_FILENAME]);
}

async function runGoCommand(args: string[], printExitCode: boolean = true): Promise<RunResult> {
    const go = await getGo();

    try {
        const result = await go.childProcess.execCommand('go', args);

        const runOutput: OutputEntry[] = [];
        if (result.stdout.length > 0) {
            for (const line of result.stdout.split('\n')) {
                runOutput.push({ type: 'log', text: line });
            }
        }
        if (result.stderr.length > 0) {
            for (const line of result.stderr.split('\n')) {
                runOutput.push({ type: 'error', text: line });
            }
        }

        // Log the exit code
        if (printExitCode) {
            runOutput.push({
                type: result.exitCode === 0 ? 'log' : 'error',
                text: `Go command exited with code ${result.exitCode}`,
            });
        }
        return { output: runOutput };
    } catch (err: unknown) {
        // console.error(`Error running '${filename}' :`, err);
        return { output: [{ type: 'error', text: String(err) }] };
    }
}

// noinspection JSUnusedGlobalSymbols
export default { onInit: init, runCode, runGoCommand, CODE_SAMPLE };
