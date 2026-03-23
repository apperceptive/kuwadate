import { Plugin, TFile } from 'obsidian';
import { NewTaskModal } from './modals';
import { createTask, adaptNote, getFolderOf } from './taskCreation';
import { isKuwadateTask, buildTaskGraph } from './taskGraph';
import { KuwadateSettings } from './settings';

export function registerCommands(plugin: Plugin, getSettings: () => KuwadateSettings) {
    plugin.addCommand({
        id: 'new-task',
        name: 'New task',
        callback: () => {
            const currentFolder = getFolderOf(plugin.app);
            new NewTaskModal(plugin.app, async (result) => {
                const file = await createTask(plugin.app, {
                    ...result,
                    currentFolder,
                }, getSettings());
                await plugin.app.workspace.getLeaf().openFile(file);
            }).open();
        },
    });

    plugin.addCommand({
        id: 'new-subtask',
        name: 'New subtask',
        checkCallback: (checking) => {
            const activeFile = plugin.app.workspace.getActiveFile();
            if (!activeFile) return false;
            const meta = plugin.app.metadataCache.getFileCache(activeFile);
            if (!isKuwadateTask(meta)) return false;
            if (checking) return true;

            const currentFolder = getFolderOf(plugin.app);
            new NewTaskModal(plugin.app, async (result) => {
                const file = await createTask(plugin.app, {
                    name: result.name,
                    parent: activeFile.basename,
                    currentFolder,
                }, getSettings());
                await plugin.app.workspace.getLeaf().openFile(file);
            }, activeFile.basename).open();
        },
    });

    plugin.addCommand({
        id: 'new-sister-task',
        name: 'New sister task',
        checkCallback: (checking) => {
            const activeFile = plugin.app.workspace.getActiveFile();
            if (!activeFile) return false;
            const meta = plugin.app.metadataCache.getFileCache(activeFile);
            if (!isKuwadateTask(meta)) return false;
            if (checking) return true;

            const currentFolder = getFolderOf(plugin.app);
            const parentName = resolveParentFromMeta(meta);
            new NewTaskModal(plugin.app, async (result) => {
                const file = await createTask(plugin.app, {
                    name: result.name,
                    parent: parentName,
                    currentFolder,
                }, getSettings());
                await plugin.app.workspace.getLeaf().openFile(file);
            }, parentName).open();
        },
    });

    plugin.addCommand({
        id: 'adapt-note',
        name: 'Adapt current note to Kuwadate task',
        checkCallback: (checking) => {
            const activeFile = plugin.app.workspace.getActiveFile();
            if (!activeFile) return false;
            if (checking) return true;

            adaptNote(plugin.app, activeFile);
        },
    });

    plugin.addCommand({
        id: 'insert-parent',
        name: 'Insert parent above current task',
        checkCallback: (checking) => {
            const activeFile = plugin.app.workspace.getActiveFile();
            if (!activeFile) return false;
            const meta = plugin.app.metadataCache.getFileCache(activeFile);
            if (!isKuwadateTask(meta)) return false;
            if (checking) return true;

            const currentFolder = getFolderOf(plugin.app);
            const currentParent = resolveParentFromMeta(meta);
            new NewTaskModal(plugin.app, async (result) => {
                // 1. Create the new parent with the current note's parent
                const newParentFile = await createTask(plugin.app, {
                    name: result.name,
                    parent: currentParent,
                    currentFolder,
                }, getSettings());

                // 2. Set the current note's parent to the new parent
                await plugin.app.fileManager.processFrontMatter(activeFile, (fm) => {
                    fm['kd-parent'] = `[[${result.name}]]`;
                });

                await plugin.app.workspace.getLeaf().openFile(newParentFile);
            }, currentParent).open();
        },
    });

    plugin.addCommand({
        id: 'delete-parent',
        name: 'Delete parent of current task',
        checkCallback: (checking) => {
            const activeFile = plugin.app.workspace.getActiveFile();
            if (!activeFile) return false;
            const meta = plugin.app.metadataCache.getFileCache(activeFile);
            if (!isKuwadateTask(meta)) return false;
            const parentName = resolveParentFromMeta(meta);
            if (!parentName) return false;
            if (checking) return true;

            (async () => {
                const graph = buildTaskGraph(plugin.app);
                const parentNode = graph.get(parentName);
                if (!parentNode) return;

                const grandparent = parentNode.parent;

                // Reparent all of the parent's children to the grandparent
                for (const child of parentNode.children) {
                    await plugin.app.fileManager.processFrontMatter(child.file, (fm) => {
                        fm['kd-parent'] = grandparent ? `[[${grandparent}]]` : '';
                    });
                }

                // Delete the parent note
                await plugin.app.vault.trash(parentNode.file, true);
            })();
        },
    });
}

function resolveParentFromMeta(meta: import('obsidian').CachedMetadata | null): string | null {
    if (!meta?.frontmatter?.['kd-parent']) return null;
    const val = String(meta.frontmatter['kd-parent']);
    const match = val.match(/^\[\[(.+?)(?:\|.+?)?\]\]$/);
    return match ? match[1] : val;
}
