import { App, normalizePath } from 'obsidian';

export const KUWADATE_FOLDER = 'Kuwadate';

const SYSTEM_PAGE = `---
tags:
  - system
aliases:
  - 企て
---
Kuwadate (企て) is a task and project management system in Obsidian.

Each task is its own page with a \`kuwadate\` property and \`kd-\` prefixed properties for status, priority, urgency, dependencies, duration, and due date. Tasks form a hierarchy through the \`kd-parent\` property.

## Properties

| Property         | Type   | Values                                                      |
| ---------------- | ------ | ----------------------------------------------------------- |
| kd-status        | text   | todo, in-progress, maintenance, blocked, waiting, done, cancelled |
| kd-priority      | number | 1–4 (1 = highest)                                           |
| kd-urgency       | number | 1–4 (1 = most urgent)                                       |
| kd-parent        | link   | Wikilink to parent task page                                |
| kd-depends-on    | list   | Wikilinks to blocking task pages                            |
| kd-duration      | text   | Bases duration format: 2w, 3d, 4h, 30m                      |
| kd-start         | date   | YYYY-MM-DD                                                  |
| kd-due           | date   | YYYY-MM-DD                                                  |
| kd-owner         | link   | Wikilink to person responsible                              |
| kd-collaborators | list   | Wikilinks to people/resources involved                      |
| kd-cover         | link   | Wikilink to image file for cards view                       |
| kd-cost          | number | Cost                                                        |
| kd-created       | date   | YYYY-MM-DD                                                  |
| kd-closed-reason | text   | done, cancelled, etc.                                       |

## All Tasks
![[Kuwadate.base#All Tasks]]

## Active
![[Kuwadate Descendants.base#Active]]

## Blocked
![[Kuwadate Descendants.base#Blocked]]

## Due Soon
![[Kuwadate Descendants.base#Due Soon]]
`;

const BASE_FILE = `filters:
  and:
    - note.kuwadate == 1
properties:
  kd-status:
    displayName: Status
  kd-priority:
    displayName: Pri
  kd-urgency:
    displayName: Urg
  kd-parent:
    displayName: Parent
  kd-depends-on:
    displayName: Depends On
  kd-duration:
    displayName: Duration
  kd-due:
    displayName: Due
  kd-owner:
    displayName: Owner
  kd-collaborators:
    displayName: Collaborators
views:
  - type: table
    name: All Tasks
    order:
      - file.name
      - kd-status
      - kd-priority
      - kd-urgency
      - kd-due
    sort:
      - property: kd-priority
        direction: ASC
      - property: kd-urgency
        direction: ASC
  - type: table
    name: Ancestors
    filters:
      and:
        - or:
            - file == this.kd-parent
            - file == this.kd-parent.asFile().properties.kd-parent
            - file == this.kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent
            - file == this.kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent
            - file == this.kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent
    order:
      - file.name
      - kd-status
      - kd-priority
      - kd-urgency
  - type: table
    name: Sisters
    filters:
      and:
        - kd-parent == this.kd-parent
        - file != this.file
    order:
      - file.name
      - kd-status
      - kd-priority
      - kd-urgency
      - kd-due
    sort:
      - property: kd-priority
        direction: ASC
      - property: kd-urgency
        direction: ASC
`;

const DESCENDANTS_BASE_FILE = `filters:
  and:
    - note.kuwadate == 1
    - or:
        - kd-parent == this.file.name
        - kd-parent.asFile().properties.kd-parent == this.file.name
        - kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent == this.file.name
        - kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent == this.file.name
        - kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent.asFile().properties.kd-parent == this.file.name
properties:
  kd-status:
    displayName: Status
  kd-priority:
    displayName: Pri
  kd-urgency:
    displayName: Urg
  kd-parent:
    displayName: Parent
  kd-due:
    displayName: Due
  kd-cost:
    displayName: Cost
views:
  - type: table
    name: Children
    filters:
      and:
        - note.kuwadate == 1
        - kd-parent == this.file.name
    order:
      - file.name
      - kd-status
      - kd-urgency
      - kd-priority
      - kd-due
      - kd-cost
    sort:
      - property: kd-priority
        direction: ASC
      - property: kd-urgency
        direction: ASC
      - property: kd-status
        direction: ASC
    summary:
      kd-cost: sum
  - type: cards
    name: Children Cards
    filters:
      and:
        - kd-parent == this.file.name
    order:
      - file.name
      - kd-status
      - kd-priority
      - kd-urgency
    sort:
      - property: kd-priority
        direction: ASC
      - property: kd-urgency
        direction: ASC
    image: kd-cover
  - type: table
    name: All Descendants
    order:
      - file.name
      - kd-status
      - kd-priority
      - kd-urgency
      - kd-due
      - kd-cost
    sort:
      - property: kd-priority
        direction: ASC
      - property: kd-urgency
        direction: ASC
    summary:
      kd-cost: sum
  - type: table
    name: Active
    filters:
      and:
        - or:
            - note.kd-status == "in-progress"
            - note.kd-status == "maintenance"
    order:
      - file.name
      - kd-priority
      - kd-urgency
      - kd-due
    sort:
      - property: kd-priority
        direction: ASC
  - type: table
    name: Blocked
    filters:
      and:
        - note.kd-status == "blocked"
    order:
      - file.name
      - kd-priority
      - kd-urgency
      - kd-due
  - type: table
    name: Due Soon
    filters:
      and:
        - note.kd-status != "done"
        - note.kd-status != "cancelled"
        - note.kd-due <= today() + "7d"
    order:
      - file.name
      - kd-status
      - kd-due
      - kd-priority
    sort:
      - property: kd-due
        direction: ASC
`;

const TASK_TEMPLATE_CONTENT = `---
kd-type: task
kd-status: todo
kd-priority:
kd-urgency:
kd-parent:
kd-depends-on:
  -
kd-duration:
kd-start:
kd-due:
kd-owner:
kd-collaborators:
  -
kd-cover:
kd-cost:
kd-created: "{{date:YYYY-MM-DD}}"
---

## Description


## Notes


## Subtasks
![[Kuwadate Descendants.base#Children]]

## Other Tasks
![[Kuwadate.base#Ancestors]]
`;

interface BootstrapFile {
    path: string;
    content: string;
}

const FILES: BootstrapFile[] = [
    { path: `${KUWADATE_FOLDER}/Kuwadate.md`, content: SYSTEM_PAGE },
    { path: `${KUWADATE_FOLDER}/Kuwadate.base`, content: BASE_FILE },
    { path: `${KUWADATE_FOLDER}/Kuwadate Descendants.base`, content: DESCENDANTS_BASE_FILE },
    { path: `${KUWADATE_FOLDER}/Kuwadate Task Template.md`, content: TASK_TEMPLATE_CONTENT },
];

/** Create the Kuwadate folder and system files if they don't exist. */
export async function bootstrapKuwadate(app: App): Promise<void> {
    // Ensure folder exists
    const folder = app.vault.getAbstractFileByPath(KUWADATE_FOLDER);
    if (!folder) {
        await app.vault.createFolder(KUWADATE_FOLDER);
    }

    for (const { path, content } of FILES) {
        const normalized = normalizePath(path);
        const existing = app.vault.getAbstractFileByPath(normalized);
        if (!existing) {
            await app.vault.create(normalized, content);
        }
    }
}
