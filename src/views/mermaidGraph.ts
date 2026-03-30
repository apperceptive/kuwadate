import { MarkdownRenderer, Plugin } from 'obsidian';
import { buildTaskGraph, TaskNode, getDescendants } from '../taskGraph';

interface GraphOptions {
    title: string | null;
    depth: number;
}

function parseOptions(source: string, defaultTitle: string): GraphOptions {
    const opts: GraphOptions = { title: defaultTitle, depth: Infinity };
    for (const line of source.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
        if (!match) continue;
        const [, key, value] = match;
        switch (key.toLowerCase()) {
            case 'title':
                opts.title = value.trim();
                break;
            case 'depth':
                opts.depth = parseInt(value.trim(), 10) || Infinity;
                break;
        }
    }
    return opts;
}

/** Get descendants up to a certain depth. */
function getDescendantsToDepth(node: TaskNode, maxDepth: number, currentDepth = 1): TaskNode[] {
    if (currentDepth > maxDepth) return [];
    const result: TaskNode[] = [];
    for (const child of node.children) {
        result.push(child);
        result.push(...getDescendantsToDepth(child, maxDepth, currentDepth + 1));
    }
    return result;
}

/**
 * Registers a code block processor for ```kuwadate-graph``` blocks.
 * Renders a Mermaid diagram showing parent-child and dependency relationships.
 *
 * Options (in block content):
 *   title: Diagram title (default: current note name)
 *   depth: How many levels of descendants to show (default: all)
 */
export function registerMermaidGraphProcessor(plugin: Plugin) {
    plugin.registerMarkdownCodeBlockProcessor('kuwadate-graph', (source, el, ctx) => {
        const graph = buildTaskGraph(plugin.app);
        const currentFile = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!currentFile) return;

        const basename = currentFile.name.replace(/\.md$/, '');
        const rootNode = graph.get(basename);
        const opts = parseOptions(source, basename);

        // Build node list
        const nodes = rootNode
            ? [rootNode, ...getDescendantsToDepth(rootNode, opts.depth)]
            : Array.from(graph.values());

        if (nodes.length === 0) {
            el.createEl('div', { text: 'No tasks found.', cls: 'kuwadate-tree-empty' });
            return;
        }

        const lines: string[] = ['graph TD'];
        const nodeIds = new Map<string, string>();

        // Generate safe IDs for Mermaid
        nodes.forEach((node, i) => {
            nodeIds.set(node.name, `n${i}`);
        });

        // Node definitions with status styling
        for (const node of nodes) {
            const id = nodeIds.get(node.name)!;
            const label = node.name.replace(/"/g, "'");
            lines.push(`    ${id}["${label}"]`);
        }

        // Parent-child edges (solid)
        for (const node of nodes) {
            if (node.parent && nodeIds.has(node.parent)) {
                const parentId = nodeIds.get(node.parent)!;
                const childId = nodeIds.get(node.name)!;
                lines.push(`    ${parentId} --> ${childId}`);
            }
        }

        // Dependency edges (dashed)
        for (const node of nodes) {
            for (const dep of node.dependsOn) {
                if (nodeIds.has(dep)) {
                    const depId = nodeIds.get(dep)!;
                    const nodeId = nodeIds.get(node.name)!;
                    lines.push(`    ${depId} -.->|blocks| ${nodeId}`);
                }
            }
        }

        // Status-based styling
        const statusClasses: Record<string, string[]> = {};
        for (const node of nodes) {
            const status = node.status || 'todo';
            if (!statusClasses[status]) statusClasses[status] = [];
            statusClasses[status].push(nodeIds.get(node.name)!);
        }

        lines.push('');
        lines.push('    classDef done fill:#a3be8c,stroke:#689d6a,color:#2e3440');
        lines.push('    classDef inprogress fill:#88c0d0,stroke:#5e81ac,color:#2e3440');
        lines.push('    classDef maintenance fill:#b48ead,stroke:#9a7a9a,color:#2e3440');
        lines.push('    classDef blocked fill:#bf616a,stroke:#a54e56,color:#eceff4');
        lines.push('    classDef waiting fill:#ebcb8b,stroke:#d08770,color:#2e3440');
        lines.push('    classDef cancelled fill:#4c566a,stroke:#3b4252,color:#d8dee9');
        lines.push('    classDef todo fill:#d8dee9,stroke:#4c566a,color:#2e3440');

        for (const [status, ids] of Object.entries(statusClasses)) {
            const cls = status === 'in-progress' ? 'inprogress' : status;
            lines.push(`    class ${ids.join(',')} ${cls}`);
        }

        const mermaidCode = lines.join('\n');

        // Build markdown with optional title
        let markdown = '';
        if (opts.title) {
            markdown += `**${opts.title}**\n\n`;
        }
        markdown += '```mermaid\n' + mermaidCode + '\n```';

        MarkdownRenderer.render(plugin.app, markdown, el, ctx.sourcePath, plugin);

        // After rendering, attach click handlers to navigate to tasks
        const observer = new MutationObserver(() => {
            const svg = el.querySelector('svg');
            if (!svg) return;
            observer.disconnect();

            for (const [name, id] of nodeIds.entries()) {
                const nodeEl = svg.querySelector(`[id^="flowchart-${id}-"]`);
                if (nodeEl) {
                    (nodeEl as HTMLElement).style.cursor = 'pointer';
                    nodeEl.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = graph.get(name)?.file;
                        if (file) plugin.app.workspace.getLeaf().openFile(file);
                    });
                }
            }
        });
        observer.observe(el, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 5000);
    });
}
