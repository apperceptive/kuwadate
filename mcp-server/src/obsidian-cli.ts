import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const OBSIDIAN_CMD = process.env.OBSIDIAN_CMD || 'obsidian';

interface ExecResult {
    stdout: string;
    stderr: string;
}

async function run(args: string[]): Promise<ExecResult> {
    try {
        return await execFileAsync(OBSIDIAN_CMD, args, {
            timeout: 15000,
            maxBuffer: 1024 * 1024,
        });
    } catch (err: any) {
        if (err.stdout || err.stderr) {
            return { stdout: err.stdout || '', stderr: err.stderr || '' };
        }
        throw new Error(`Obsidian CLI error: ${err.message}`);
    }
}

/** Read a file's content from the vault. */
export async function readFile(path: string): Promise<string> {
    const { stdout } = await run(['files', 'read', path]);
    return stdout;
}

/** Write content to a file in the vault. */
export async function writeFile(path: string, content: string): Promise<void> {
    await run(['files', 'write', path, content]);
}

/** Read a frontmatter property from a file. */
export async function readProperty(path: string, key: string): Promise<string> {
    const { stdout } = await run(['properties', 'read', path, key]);
    return stdout.trim();
}

/** Set a frontmatter property on a file. */
export async function setProperty(path: string, key: string, value: string): Promise<void> {
    await run(['properties', 'set', path, key, value]);
}

/** Evaluate JavaScript in Obsidian's runtime. */
export async function evaluate(code: string): Promise<string> {
    const { stdout } = await run(['eval', code]);
    return stdout.trim();
}

/** Search vault content. */
export async function searchContent(query: string): Promise<string> {
    const { stdout } = await run(['search', 'content', query]);
    return stdout;
}

/** List files in the vault. */
export async function listFiles(): Promise<string> {
    const { stdout } = await run(['files', 'list']);
    return stdout;
}
