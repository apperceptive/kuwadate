import { App, PluginSettingTab, Setting, Plugin } from 'obsidian';

export type TaskFolder = 'current' | 'kuwadate' | 'custom';

export interface KuwadateSettings {
    taskFolder: TaskFolder;
    customFolder: string;
}

export const DEFAULT_SETTINGS: KuwadateSettings = {
    taskFolder: 'current',
    customFolder: '',
};

export class KuwadateSettingTab extends PluginSettingTab {
    plugin: Plugin & { settings: KuwadateSettings; saveSettings: () => Promise<void> };

    constructor(app: App, plugin: Plugin & { settings: KuwadateSettings; saveSettings: () => Promise<void> }) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('New task location')
            .setDesc('Where to create new task notes')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('current', 'Current folder')
                    .addOption('kuwadate', 'Kuwadate folder')
                    .addOption('custom', 'Custom folder')
                    .setValue(this.plugin.settings.taskFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.taskFolder = value as TaskFolder;
                        await this.plugin.saveSettings();
                        this.display(); // re-render to show/hide custom input
                    });
            });

        if (this.plugin.settings.taskFolder === 'custom') {
            new Setting(containerEl)
                .setName('Custom folder path')
                .setDesc('Path relative to vault root')
                .addText(text => {
                    text.setPlaceholder('e.g. Projects/Tasks')
                        .setValue(this.plugin.settings.customFolder)
                        .onChange(async (value) => {
                            this.plugin.settings.customFolder = value;
                            await this.plugin.saveSettings();
                        });
                });
        }
    }
}
