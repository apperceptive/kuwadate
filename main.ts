import { Plugin, TFile } from 'obsidian';
import { registerCommands } from './src/commands';
import { TREE_VIEW_TYPE, KuwadateTreeView } from './src/views/treeView';
import { registerDescendantTreeProcessor } from './src/views/descendantTree';
import { registerProgressProcessor } from './src/automation/progress';
import { registerMermaidGraphProcessor } from './src/views/mermaidGraph';
import { checkAndUpdateBlockStatus, propagateCompletion } from './src/automation/blockDetection';
import { computeEndDate, rollupParentDates } from './src/automation/dateRollup';
import { isKuwadateTask } from './src/taskGraph';
import { bootstrapKuwadate } from './src/bootstrap';
import { KuwadateSettings, DEFAULT_SETTINGS, KuwadateSettingTab } from './src/settings';

export default class KuwadatePlugin extends Plugin {
    settings: KuwadateSettings = DEFAULT_SETTINGS;
    private processing = new Set<string>();

    async onload() {
        // Load settings
        await this.loadSettings();
        this.addSettingTab(new KuwadateSettingTab(this.app, this));

        // Bootstrap system files on first run
        this.app.workspace.onLayoutReady(() => bootstrapKuwadate(this.app));

        // Register commands
        registerCommands(this, () => this.settings);

        // Register tree sidebar view
        this.registerView(TREE_VIEW_TYPE, (leaf) => new KuwadateTreeView(leaf));
        this.addRibbonIcon('japanese-yen', 'Kuwadate task tree', () => {
            this.activateTreeView();
        }).querySelector('svg')?.replaceWith((() => {
            const el = document.createElement('span');
            el.textContent = '企';
            el.style.fontSize = '18px';
            el.style.lineHeight = '1';
            return el;
        })());
        this.addCommand({
            id: 'open-tree-view',
            name: 'Open task tree',
            callback: () => this.activateTreeView(),
        });

        // Register code block processors
        registerDescendantTreeProcessor(this);
        registerProgressProcessor(this);
        registerMermaidGraphProcessor(this);

        // Auto-block detection on file open
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    checkAndUpdateBlockStatus(this.app, file);
                }
            })
        );

        // Auto-unblock and date rollup on metadata change
        this.registerEvent(
            this.app.metadataCache.on('changed', (file) => {
                if (this.processing.has(file.path)) return;
                this.processing.add(file.path);

                // Use setTimeout to debounce and avoid recursive triggers
                setTimeout(async () => {
                    try {
                        const meta = this.app.metadataCache.getFileCache(file);
                        if (!meta || !isKuwadateTask(meta)) return;

                        const fm = meta.frontmatter!;

                        // Auto-fill: if a note has the kuwadate property but is missing
                        // standard fields, fill them in (e.g. created via Base + button)
                        await this.autoFillKuwadateNote(file, fm);

                        // If task was just marked done, propagate to dependents
                        if (fm['kd-status'] === 'done') {
                            await propagateCompletion(this.app, file);
                        }

                        // Compute end date from start + duration
                        await computeEndDate(this.app, file);

                        // Rollup dates to parent
                        await rollupParentDates(this.app, file);
                    } finally {
                        this.processing.delete(file.path);
                    }
                }, 200);
            })
        );
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(TREE_VIEW_TYPE);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /** Auto-fill missing kuwadate fields on notes created via Base + button. */
    private async autoFillKuwadateNote(file: TFile, fm: Record<string, unknown>) {
        let needsUpdate = false;

        // Check if parent is raw text (not a wikilink) and convert it
        const parentVal = fm['kd-parent'];
        const hasRawParent = parentVal && typeof parentVal === 'string'
            && !String(parentVal).startsWith('[[');

        // Check if essential fields are missing
        const missingStatus = fm['kd-status'] === undefined || fm['kd-status'] === null;
        const missingType = fm['kd-type'] === undefined || fm['kd-type'] === null;
        const missingCreated = fm['kd-created'] === undefined || fm['kd-created'] === null;

        if (hasRawParent || missingStatus || missingType || missingCreated) {
            needsUpdate = true;
        }

        if (!needsUpdate) return;

        await this.app.fileManager.processFrontMatter(file, (fmData) => {
            // Convert raw parent text to wikilink
            if (fmData['kd-parent'] && typeof fmData['kd-parent'] === 'string'
                && !fmData['kd-parent'].startsWith('[[')) {
                fmData['kd-parent'] = `[[${fmData['kd-parent']}]]`;
            }

            // Fill in missing standard fields
            if (fmData['kd-status'] == null) fmData['kd-status'] = 'todo';
            if (fmData['kd-type'] == null) fmData['kd-type'] = 'task';
            if (fmData['kd-created'] == null) {
                fmData['kd-created'] = new Date().toISOString().slice(0, 10);
            }
        });

        // Append body sections if the note is mostly empty
        const content = await this.app.vault.read(file);
        if (!content.includes('## Description')) {
            const body = '\n\n## Description\n\n\n## Notes\n\n\n## Subtasks\n![[Kuwadate Descendants.base#Children]]\n\n## Other Tasks\n![[Kuwadate.base#Ancestors]]\n';
            await this.app.vault.modify(file, content.trimEnd() + body);
        }
    }

    private async activateTreeView() {
        const existing = this.app.workspace.getLeavesOfType(TREE_VIEW_TYPE);
        if (existing.length > 0) {
            this.app.workspace.revealLeaf(existing[0]);
            return;
        }
        const leaf = this.app.workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({ type: TREE_VIEW_TYPE, active: true });
            this.app.workspace.revealLeaf(leaf);
        }
    }
}
