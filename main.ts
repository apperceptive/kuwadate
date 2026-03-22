import { Plugin, TFile } from 'obsidian';
import { registerCommands } from './src/commands';
import { TREE_VIEW_TYPE, KuwadateTreeView } from './src/views/treeView';
import { registerDescendantTreeProcessor } from './src/views/descendantTree';
import { registerProgressProcessor } from './src/automation/progress';
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
        this.addCommand({
            id: 'open-tree-view',
            name: 'Open task tree',
            callback: () => this.activateTreeView(),
        });

        // Register code block processors
        registerDescendantTreeProcessor(this);
        registerProgressProcessor(this);

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

                        // If task was just marked done, propagate to dependents
                        if (fm.status === 'done') {
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
