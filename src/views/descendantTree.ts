import { MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { buildTaskGraph, TaskNode } from '../taskGraph';

/**
 * Registers a code block processor for ```kuwadate-tree``` blocks.
 * When placed in a kuwadate task note, renders the full subtree below that task.
 */
export function registerDescendantTreeProcessor(plugin: Plugin) {
    plugin.registerMarkdownCodeBlockProcessor('kuwadate-tree', (source, el, ctx) => {
        const graph = buildTaskGraph(plugin.app);
        const currentFile = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!currentFile) return;

        const basename = currentFile.name.replace(/\.md$/, '');
        const node = graph.get(basename);

        if (!node) {
            el.createEl('div', { text: 'Not a kuwadate task.', cls: 'kuwadate-tree-empty' });
            return;
        }

        if (node.children.length === 0) {
            el.createEl('div', { text: 'No subtasks.', cls: 'kuwadate-tree-empty' });
            return;
        }

        const treeEl = el.createEl('div', { cls: 'kuwadate-descendant-tree' });
        for (const child of sortChildren(node.children)) {
            renderDescendant(treeEl, child, plugin, 0);
        }
    });
}

function renderDescendant(parentEl: HTMLElement, node: TaskNode, plugin: Plugin, depth: number) {
    const itemEl = parentEl.createEl('div', { cls: 'kuwadate-tree-item' });
    itemEl.style.paddingLeft = `${depth * 16}px`;

    const rowEl = itemEl.createEl('div', { cls: 'kuwadate-tree-row' });

    const statusIcon = getStatusIcon(node.status);
    rowEl.createEl('span', { text: statusIcon + ' ', cls: `kuwadate-status-${node.status}` });

    const link = rowEl.createEl('a', { text: node.name, cls: 'kuwadate-tree-link' });
    link.addEventListener('click', (e) => {
        e.preventDefault();
        plugin.app.workspace.getLeaf().openFile(node.file);
    });

    for (const child of sortChildren(node.children)) {
        renderDescendant(itemEl, child, plugin, depth + 1);
    }
}

function sortChildren(children: TaskNode[]): TaskNode[] {
    return [...children].sort((a, b) => {
        const pa = a.priority ?? 999;
        const pb = b.priority ?? 999;
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name);
    });
}

function getStatusIcon(status: string): string {
    switch (status) {
        case 'done': return '✓';
        case 'in-progress': return '→';
        case 'blocked': return '⊘';
        case 'waiting': return '⏳';
        case 'cancelled': return '✗';
        case 'todo':
        default: return '○';
    }
}
