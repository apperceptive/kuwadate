import { App, TFile } from 'obsidian';
import { buildTaskGraph, isKuwadateTask } from '../taskGraph';

/** Parse a duration string like "2w", "3d", "4h", "30m" into milliseconds. */
function parseDuration(duration: string): number | null {
    const match = duration.match(/^(\d+)(w|d|h|m)$/);
    if (!match) return null;
    const num = parseInt(match[1]);
    switch (match[2]) {
        case 'w': return num * 7 * 24 * 60 * 60 * 1000;
        case 'd': return num * 24 * 60 * 60 * 1000;
        case 'h': return num * 60 * 60 * 1000;
        case 'm': return num * 60 * 1000;
        default: return null;
    }
}

/** Compute kd-due = kd-start + kd-duration and update if needed. */
export async function computeEndDate(app: App, file: TFile): Promise<void> {
    const meta = app.metadataCache.getFileCache(file);
    if (!meta || !isKuwadateTask(meta)) return;

    const fm = meta.frontmatter!;
    if (!fm['kd-start'] || !fm['kd-duration']) return;

    const startMs = new Date(fm['kd-start']).getTime();
    if (isNaN(startMs)) return;

    const durationMs = parseDuration(String(fm['kd-duration']));
    if (!durationMs) return;

    const computedDue = new Date(startMs + durationMs).toISOString().slice(0, 10);

    if (fm['kd-due'] !== computedDue) {
        await app.fileManager.processFrontMatter(file, (fmData) => {
            fmData['kd-due'] = computedDue;
        });
    }
}

/** Update a parent's kd-start/kd-due based on its children's dates. */
export async function rollupParentDates(app: App, file: TFile): Promise<void> {
    const meta = app.metadataCache.getFileCache(file);
    if (!meta || !isKuwadateTask(meta)) return;

    const graph = buildTaskGraph(app);
    const node = graph.get(file.basename);
    if (!node || node.children.length === 0) return;

    let earliestStart: string | null = null;
    let latestDue: string | null = null;

    for (const child of node.children) {
        if (child.start && (!earliestStart || child.start < earliestStart)) {
            earliestStart = child.start;
        }
        if (child.due && (!latestDue || child.due > latestDue)) {
            latestDue = child.due;
        }
    }

    const fm = meta.frontmatter!;
    const needsUpdate =
        (earliestStart && fm['kd-start'] !== earliestStart) ||
        (latestDue && fm['kd-due'] !== latestDue);

    if (needsUpdate) {
        await app.fileManager.processFrontMatter(file, (fmData) => {
            if (earliestStart) fmData['kd-start'] = earliestStart;
            if (latestDue) fmData['kd-due'] = latestDue;
        });
    }
}
