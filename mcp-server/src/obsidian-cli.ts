import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const OBSIDIAN_CMD = process.env.OBSIDIAN_CMD || 'obsidian';
const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT || '';

const VAULT_ARG = OBSIDIAN_VAULT ? [`vault=${OBSIDIAN_VAULT}`] : [];

interface ExecResult {
    stdout: string;
    stderr: string;
}

async function run(args: string[]): Promise<ExecResult> {
    try {
        return await execFileAsync(OBSIDIAN_CMD, [...VAULT_ARG, ...args], {
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
    const { stdout } = await run(['read', `path=${path}`]);
    return stdout;
}

/** Write content to a file in the vault (creates or overwrites). */
export async function writeFile(path: string, content: string): Promise<void> {
    const escaped = content.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    await run(['create', `path=${path}`, `content=${escaped}`, 'overwrite']);
}

/** Read a frontmatter property from a file. */
export async function readProperty(path: string, key: string): Promise<string> {
    const { stdout } = await run(['property:read', `name=${key}`, `path=${path}`]);
    return stdout.trim();
}

/** Set a frontmatter property on a file. */
export async function setProperty(path: string, key: string, value: string): Promise<void> {
    await run(['property:set', `name=${key}`, `value=${value}`, `path=${path}`]);
}

/** Evaluate JavaScript in Obsidian's runtime. */
export async function evaluate(code: string): Promise<string> {
    const { stdout } = await run(['eval', `code=${code}`]);
    return stdout.trim().replace(/^=> /, '');
}

/** Search vault content. */
export async function searchContent(query: string): Promise<string> {
    const { stdout } = await run(['search', `query=${query}`]);
    return stdout;
}

/** List files in the vault. */
export async function listFiles(): Promise<string> {
    const { stdout } = await run(['files']);
    return stdout;
}
