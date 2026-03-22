import { App, Modal, Setting, TFile, FuzzySuggestModal } from 'obsidian';

export interface NewTaskResult {
    name: string;
    parent: string | null;
}

export class NewTaskModal extends Modal {
    private result: NewTaskResult = { name: '', parent: null };
    private onSubmit: (result: NewTaskResult) => void;
    private defaultParent: string | null;

    constructor(app: App, onSubmit: (result: NewTaskResult) => void, defaultParent?: string | null) {
        super(app);
        this.onSubmit = onSubmit;
        this.defaultParent = defaultParent ?? null;
        this.result.parent = this.defaultParent;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'New Kuwadate Task' });

        new Setting(contentEl)
            .setName('Task name')
            .addText(text => {
                text.setPlaceholder('Enter task name')
                    .onChange(value => { this.result.name = value; });
                // Focus the text input
                setTimeout(() => text.inputEl.focus(), 50);
                // Submit on Enter
                text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.submit();
                    }
                });
            });

        new Setting(contentEl)
            .setName('Parent task')
            .setDesc('Optional parent task (wikilink)')
            .addText(text => {
                text.setPlaceholder('Parent task name')
                    .setValue(this.defaultParent ?? '')
                    .onChange(value => {
                        this.result.parent = value || null;
                    });
            });

        new Setting(contentEl)
            .addButton(btn =>
                btn.setButtonText('Create')
                    .setCta()
                    .onClick(() => this.submit()));
    }

    private submit() {
        if (!this.result.name.trim()) return;
        this.close();
        this.onSubmit(this.result);
    }

    onClose() {
        this.contentEl.empty();
    }
}
