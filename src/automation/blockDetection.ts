import { App, TFile } from 'obsidian';
import { buildTaskGraph, isKuwadateTask } from '../taskGraph';

/**
 * Check if a task should be blocked based on its kd-depends-on links.
 * Called on file-open for kuwadate tasks.
 */
export async function checkAndUpdateBlockStatus(app: App, file: TFile): Promise<void> {
    const meta = app.metadataCache.getFileCache(file);
    if (!meta || !isKuwadateTask(meta)) return;

    const fm = meta.frontmatter!;
    const status = fm['kd-status'];

    // Don't touch done or cancelled tasks
    if (status === 'done' || status === 'cancelled') return;

    const graph = buildTaskGraph(app);
    const node = graph.get(file.basename);
    if (!node || node.dependsOn.length === 0) return;

    // Check if any dependency is not done
    const hasUnmetDependency = node.dependsOn.some(depName => {
        const dep = graph.get(depName);
        return !dep || dep.status !== 'done';
    });

    if (hasUnmetDependency && status !== 'blocked') {
        await updateFrontmatterField(app, file, 'kd-status', 'blocked');
    } else if (!hasUnmetDependency && status === 'blocked') {
        await updateFrontmatterField(app, file, 'kd-status', 'todo');
    }
}

/**
 * When a task is marked done, check all tasks that depend on it
 * and unblock them if all their dependencies are satisfied.
 */
export async function propagateCompletion(app: App, completedFile: TFile): Promise<void> {
    const graph = buildTaskGraph(app);

    for (const node of graph.values()) {
        if (!node.dependsOn.includes(completedFile.basename)) continue;
        if (node.status !== 'blocked') continue;

        // Check if all dependencies are now done
        const allDone = node.dependsOn.every(depName => {
            const dep = graph.get(depName);
            return dep && dep.status === 'done';
        });

        if (allDone) {
            await updateFrontmatterField(app, node.file, 'kd-status', 'todo');
        }
    }
}

/** Update a single frontmatter field in a file. */
async function updateFrontmatterField(app: App, file: TFile, key: string, value: string): Promise<void> {
    await app.fileManager.processFrontMatter(file, (fm) => {
        fm[key] = value;
    });
}
