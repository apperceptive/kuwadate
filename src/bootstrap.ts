import { App, normalizePath } from 'obsidian';

export const KUWADATE_FOLDER = 'Kuwadate';

const SYSTEM_PAGE = `---
tags:
  - system
aliases:
  - 企て
---
Kuwadate (企て) is a task and project management system in Obsidian.

Each task is its own page, tagged \`kuwadate\`, with properties for status, priority, urgency, dependencies, duration, and due date. Tasks form a hierarchy through the \`parent\` property. Every task page embeds a Base view showing its children.

## Properties

| Property   | Type   | Values                                               |
| ---------- | ------ | ---------------------------------------------------- |
| status     | text   | todo, in-progress, blocked, waiting, done, cancelled |
| priority   | number | 1–4 (1 = highest)                                    |
| urgency    | number | 1–4 (1 = most urgent)                                |
| parent     | link   | Wikilink to parent task page                         |
| depends-on | list   | Wikilinks to blocking task pages                     |
| duration   | text   | Bases duration format: 2w, 3d, 4h, 30m               |
| start      | date   | YYYY-MM-DD                                           |
| due        | date   | YYYY-MM-DD                                           |
| owner      | link   | Wikilink to person responsible                       |
| collaborators | list | Wikilinks to people/resources involved               |
| cover      | link   | Wikilink to image file for cards view                |
| created    | date   | YYYY-MM-DD                                           |

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
  status:
    displayName: Status
  priority:
    displayName: Pri
  urgency:
    displayName: Urg
  parent:
    displayName: Parent
  depends-on:
    displayName: Depends On
  duration:
    displayName: Duration
  due:
    displayName: Due
  owner:
    displayName: Owner
  collaborators:
    displayName: Collaborators
views:
  - type: table
    name: All Tasks
    order:
      - file.name
      - status
      - priority
      - urgency
      - due
    sort:
      - property: priority
        direction: ASC
      - property: urgency
        direction: ASC
  - type: table
    name: Ancestors
    filters:
      and:
        - or:
            - file == this.parent
            - file == this.parent.asFile().properties.parent
            - file == this.parent.asFile().properties.parent.asFile().properties.parent
            - file == this.parent.asFile().properties.parent.asFile().properties.parent.asFile().properties.parent
            - file == this.parent.asFile().properties.parent.asFile().properties.parent.asFile().properties.parent.asFile().properties.parent
    order:
      - file.name
      - status
      - priority
      - urgency
  - type: table
    name: Sisters
    filters:
      and:
        - parent == this.parent
        - file != this.file
    order:
      - file.name
      - status
      - priority
      - urgency
      - due
    sort:
      - property: priority
        direction: ASC
      - property: urgency
        direction: ASC
`;

const DESCENDANTS_BASE_FILE = `filters:
  and:
    - note.kuwadate == 1
    - or:
        - parent == this.file.name
        - parent.asFile().properties.parent == this.file.name
        - parent.asFile().properties.parent.asFile().properties.parent == this.file.name
        - parent.asFile().properties.parent.asFile().properties.parent.asFile().properties.parent == this.file.name
        - parent.asFile().properties.parent.asFile().properties.parent.asFile().properties.parent.asFile().properties.parent == this.file.name
properties:
  status:
    displayName: Status
  priority:
    displayName: Pri
  urgency:
    displayName: Urg
  parent:
    displayName: Parent
  due:
    displayName: Due
  cost:
    displayName: Cost
views:
  - type: table
    name: Children
    filters:
      and:
        - note.kuwadate == 1
        - parent == this.file.name
    order:
      - file.name
      - status
      - urgency
      - priority
      - due
      - cost
    sort:
      - property: priority
        direction: ASC
      - property: urgency
        direction: ASC
      - property: status
        direction: ASC
  - type: cards
    name: Children Cards
    filters:
      and:
        - parent == this.file.name
    order:
      - file.name
      - status
      - priority
      - urgency
    sort:
      - property: priority
        direction: ASC
      - property: urgency
        direction: ASC
    image: cover
  - type: table
    name: All Descendants
    order:
      - file.name
      - status
      - priority
      - urgency
      - due
      - cost
    sort:
      - property: priority
        direction: ASC
      - property: urgency
        direction: ASC
  - type: table
    name: Active
    filters:
      and:
        - note.status == "in-progress"
    order:
      - file.name
      - priority
      - urgency
      - due
    sort:
      - property: priority
        direction: ASC
  - type: table
    name: Blocked
    filters:
      and:
        - note.status == "blocked"
    order:
      - file.name
      - priority
      - urgency
      - due
  - type: table
    name: Due Soon
    filters:
      and:
        - note.status != "done"
        - note.status != "cancelled"
        - note.due <= today() + "7d"
    order:
      - file.name
      - status
      - due
      - priority
    sort:
      - property: due
        direction: ASC
`;

const TASK_TEMPLATE_CONTENT = `---
type: task
status: todo
priority:
urgency:
parent:
depends-on:
  -
duration:
start:
due:
owner:
collaborators:
  -
cover:
cost:
created: "{{date:YYYY-MM-DD}}"
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
