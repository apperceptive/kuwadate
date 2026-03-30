import { Plugin } from 'obsidian';
import { buildTaskGraph } from '../taskGraph';

/**
 * Registers a code block processor for ```kuwadate-progress``` blocks.
 * Renders a progress indicator showing how many children are done.
 */
export function registerProgressProcessor(plugin: Plugin) {
    plugin.registerMarkdownCodeBlockProcessor('kuwadate-progress', (source, el, ctx) => {
        const graph = buildTaskGraph(plugin.app);
        const currentFile = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!currentFile) return;

        const basename = currentFile.name.replace(/\.md$/, '');
        const node = graph.get(basename);

        if (!node || node.children.length === 0) {
            el.createEl('div', { text: 'No subtasks.', cls: 'kuwadate-progress-empty' });
            return;
        }

        const total = node.children.length;
        const done = node.children.filter(c => c.status === 'done').length;
        const pct = Math.round((done / total) * 100);

        const container = el.createEl('div', { cls: 'kuwadate-progress' });

        // Progress bar
        const bar = container.createEl('div', { cls: 'kuwadate-progress-bar' });
        bar.style.width = '100%';
        bar.style.backgroundColor = 'var(--background-modifier-border)';
        bar.style.borderRadius = '4px';
        bar.style.overflow = 'hidden';
        bar.style.height = '8px';

        const fill = bar.createEl('div');
        fill.style.width = `${pct}%`;
        fill.style.backgroundColor = 'var(--interactive-accent)';
        fill.style.height = '100%';
        fill.style.transition = 'width 0.3s ease';

        // Text label
        container.createEl('div', {
            text: `${done}/${total} subtasks done (${pct}%)`,
            cls: 'kuwadate-progress-label',
        });
    });
}
