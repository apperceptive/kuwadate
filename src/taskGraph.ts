import { App, TFile, CachedMetadata, getLinkpath } from 'obsidian';

export interface TaskNode {
    file: TFile;
    name: string;
    status: string;
    priority: number | null;
    urgency: number | null;
    parent: string | null;       // file name (without extension) of parent
    dependsOn: string[];         // file names of dependencies
    duration: string | null;
    start: string | null;
    due: string | null;
    children: TaskNode[];
}

/** Check if a file is a kuwadate task by looking for the kuwadate property. */
export function isKuwadateTask(meta: CachedMetadata | null, file?: { path: string }): boolean {
    if (!meta?.frontmatter) return false;
    if (meta.frontmatter.kuwadate == null) return false;
    // Exclude template files
    if (file && file.path.includes('Template')) return false;
    return true;
}

/** Extract the display name from a wikilink value like "[[Some Page]]" or "Some Page". */
function resolveLink(value: unknown): string | null {
    if (!value) return null;
    const str = String(value);
    const match = str.match(/^\[\[(.+?)(?:\|.+?)?\]\]$/);
    return match ? match[1] : str;
}

/** Extract an array of link names from a frontmatter list field. */
function resolveLinkList(value: unknown): string[] {
    if (!value) return [];
    if (!Array.isArray(value)) return resolveLink(value) ? [resolveLink(value)!] : [];
    return value.map(resolveLink).filter((v): v is string => v !== null && v !== '');
}

/** Build a TaskNode from a file and its cached metadata. */
export function buildTaskNode(file: TFile, meta: CachedMetadata): TaskNode {
    const fm = meta.frontmatter!;
    return {
        file,
        name: file.basename,
        status: fm.status ?? 'todo',
        priority: typeof fm.priority === 'number' ? fm.priority : null,
        urgency: typeof fm.urgency === 'number' ? fm.urgency : null,
        parent: resolveLink(fm.parent),
        dependsOn: resolveLinkList(fm['depends-on']),
        duration: fm.duration ?? null,
        start: fm.start ?? null,
        due: fm.due ?? null,
        children: [],
    };
}

/** Build the full task graph: a map of name→TaskNode with children populated. */
export function buildTaskGraph(app: App): Map<string, TaskNode> {
    const nodes = new Map<string, TaskNode>();

    for (const file of app.vault.getMarkdownFiles()) {
        const meta = app.metadataCache.getFileCache(file);
        if (!meta || !isKuwadateTask(meta, file)) continue;
        nodes.set(file.basename, buildTaskNode(file, meta));
    }

    // Wire up children
    for (const node of nodes.values()) {
        if (node.parent && nodes.has(node.parent)) {
            nodes.get(node.parent)!.children.push(node);
        }
    }

    return nodes;
}

/** Get root nodes (tasks with no parent or whose parent isn't a kuwadate task). */
export function getRoots(nodes: Map<string, TaskNode>): TaskNode[] {
    return Array.from(nodes.values()).filter(
        n => !n.parent || !nodes.has(n.parent)
    );
}

/** Walk ancestors from a node up to the root. Returns array from immediate parent to root. */
export function getAncestors(nodes: Map<string, TaskNode>, name: string): TaskNode[] {
    const ancestors: TaskNode[] = [];
    let current = nodes.get(name);
    while (current?.parent && nodes.has(current.parent)) {
        current = nodes.get(current.parent)!;
        ancestors.push(current);
    }
    return ancestors;
}

/** Get all descendants of a node recursively (flat list). */
export function getDescendants(node: TaskNode): TaskNode[] {
    const result: TaskNode[] = [];
    for (const child of node.children) {
        result.push(child);
        result.push(...getDescendants(child));
    }
    return result;
}
