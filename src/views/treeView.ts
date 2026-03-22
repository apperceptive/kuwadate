import { ItemView, WorkspaceLeaf } from 'obsidian';
import { buildTaskGraph, getRoots, TaskNode } from '../taskGraph';

export const TREE_VIEW_TYPE = 'kuwadate-tree-view';

export class KuwadateTreeView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return TREE_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Kuwadate Tasks';
    }

    getIcon(): string {
        return 'list-tree';
    }

    async onOpen() {
        this.refresh();

        // Refresh on metadata changes
        this.registerEvent(
            this.app.metadataCache.on('changed', () => this.refresh())
        );
    }

    refresh() {
        const container = this.containerEl.children[1];
        container.empty();

        const graph = buildTaskGraph(this.app);
        const roots = getRoots(graph);

        // Sort roots by priority then name
        roots.sort((a, b) => {
            const pa = a.priority ?? 999;
            const pb = b.priority ?? 999;
            if (pa !== pb) return pa - pb;
            return a.name.localeCompare(b.name);
        });

        if (roots.length === 0) {
            container.createEl('div', {
                text: 'No kuwadate tasks found.',
                cls: 'kuwadate-tree-empty',
            });
            return;
        }

        const treeEl = container.createEl('div', { cls: 'kuwadate-tree' });
        for (const root of roots) {
            this.renderNode(treeEl, root);
        }
    }

    private renderNode(parentEl: HTMLElement, node: TaskNode, depth = 0) {
        const itemEl = parentEl.createEl('div', { cls: 'kuwadate-tree-item' });
        itemEl.style.paddingLeft = `${depth * 16}px`;

        const rowEl = itemEl.createEl('div', { cls: `kuwadate-tree-row kuwadate-status-${node.status}` });

        // Collapse toggle if has children
        if (node.children.length > 0) {
            const toggle = rowEl.createEl('span', {
                cls: 'kuwadate-tree-toggle',
                text: '▼ ',
            });
            let collapsed = false;
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                collapsed = !collapsed;
                toggle.textContent = collapsed ? '▶ ' : '▼ ';
                childrenEl.style.display = collapsed ? 'none' : '';
            });
        } else {
            rowEl.createEl('span', { text: '  ', cls: 'kuwadate-tree-spacer' });
        }

        // Status indicator
        const statusIcon = getStatusIcon(node.status);
        rowEl.createEl('span', {
            text: statusIcon,
            cls: `kuwadate-status-icon`,
        });

        // Task name link
        const link = rowEl.createEl('a', {
            text: node.name,
            cls: 'kuwadate-tree-link',
        });
        link.addEventListener('click', (e) => {
            e.preventDefault();
            this.app.workspace.getLeaf().openFile(node.file);
        });

        // Children container
        const childrenEl = itemEl.createEl('div', { cls: 'kuwadate-tree-children' });
        const sortedChildren = [...node.children].sort((a, b) => {
            const pa = a.priority ?? 999;
            const pb = b.priority ?? 999;
            if (pa !== pb) return pa - pb;
            return a.name.localeCompare(b.name);
        });
        for (const child of sortedChildren) {
            this.renderNode(childrenEl, child, depth + 1);
        }
    }
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
