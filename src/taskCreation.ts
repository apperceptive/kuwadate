import { App, TFile, normalizePath } from 'obsidian';
import { KUWADATE_FOLDER } from './bootstrap';
import { KuwadateSettings } from './settings';

const TASK_TEMPLATE = `---
kuwadate: 1
kd_type: task
kd_status: todo
kd_priority:
kd_urgency:
kd_parent: PARENT_PLACEHOLDER
kd_depends_on:
  -
kd_duration:
kd_start:
kd_due:
kd_owner:
kd_collaborators:
  -
kd_cover:
kd_cost:
kd_created: "DATE_PLACEHOLDER"
---

## Description


## Notes


## Subtasks
![[Kuwadate Descendants.base#Children]]

## Other Tasks
![[Kuwadate.base#Ancestors]]
`;

export interface NewTaskOptions {
    name: string;
    parent?: string | null;
    currentFolder?: string;
}

/** Resolve the folder path for new tasks based on settings. */
function getTaskFolder(settings: KuwadateSettings, currentFolder?: string): string {
    switch (settings.taskFolder) {
        case 'kuwadate':
            return KUWADATE_FOLDER;
        case 'custom':
            return settings.customFolder || '';
        case 'current':
        default:
            return currentFolder || '';
    }
}

/** Get the folder of a file. */
export function getFolderOf(app: App): string {
    const activeFile = app.workspace.getActiveFile();
    if (activeFile) {
        const parts = activeFile.path.split('/');
        parts.pop();
        return parts.join('/');
    }
    return '';
}

export async function createTask(app: App, options: NewTaskOptions, settings: KuwadateSettings): Promise<TFile> {
    const today = new Date().toISOString().slice(0, 10);
    const parentValue = options.parent ? `"[[${options.parent}]]"` : '';

    const content = TASK_TEMPLATE
        .replace('PARENT_PLACEHOLDER', parentValue)
        .replace('DATE_PLACEHOLDER', today);

    const folder = getTaskFolder(settings, options.currentFolder);
    const prefix = folder ? `${folder}/` : '';
    const path = normalizePath(`${prefix}${options.name}.md`);

    // Ensure folder exists
    if (folder) {
        const existing = app.vault.getAbstractFileByPath(normalizePath(folder));
        if (!existing) {
            await app.vault.createFolder(normalizePath(folder));
        }
    }

    const file = await app.vault.create(path, content);
    return file;
}

/** Add kuwadate frontmatter to an existing note, preserving its content. */
export async function adaptNote(app: App, file: TFile): Promise<void> {
    const content = await app.vault.read(file);
    const today = new Date().toISOString().slice(0, 10);

    // Check if the file already has frontmatter
    const hasFrontmatter = content.startsWith('---');

    const kuwadateProperties = [
        'kuwadate: 1',
        'kd_type: task',
        'kd_status: todo',
        'kd_priority:',
        'kd_urgency:',
        'kd_parent:',
        'kd_depends_on:\n  -',
        'kd_duration:',
        'kd_start:',
        'kd_due:',
        'kd_owner:',
        'kd_collaborators:\n  -',
        'kd_cover:',
        'kd_cost:',
        `kd_created: "${today}"`,
    ];

    let newContent: string;
    if (hasFrontmatter) {
        // Insert kuwadate properties into existing frontmatter
        const endIdx = content.indexOf('---', 3);
        if (endIdx === -1) return;
        const existingFm = content.slice(4, endIdx);
        const rest = content.slice(endIdx + 3);

        // Only add properties not already present
        const propsToAdd = kuwadateProperties.filter(p => {
            const key = p.split(':')[0].trim();
            return !existingFm.includes(key + ':');
        });

        newContent = `---\n${existingFm.trimEnd()}\n${propsToAdd.join('\n')}\n---${rest}`;
    } else {
        newContent = `---\n${kuwadateProperties.join('\n')}\n---\n\n${content}`;
    }

    // Append subtasks embed if not present
    if (!newContent.includes('Kuwadate Descendants.base#Children')) {
        newContent = newContent.trimEnd() + '\n\n## Subtasks\n![[Kuwadate Descendants.base#Children]]\n\n## Other Tasks\n![[Kuwadate.base#Ancestors]]\n';
    }

    await app.vault.modify(file, newContent);
}
