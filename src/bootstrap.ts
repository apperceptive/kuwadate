import { App, normalizePath } from 'obsidian';

export const KUWADATE_FOLDER = 'Kuwadate';

const SYSTEM_PAGE = `---
tags:
  - system
aliases:
  - 企て
---
Kuwadate (企て) is a task and project management system in Obsidian.

Each task is its own page with a \`kuwadate\` property and \`kd_\` prefixed properties for status, priority, urgency, dependencies, duration, and due date. Tasks form a hierarchy through the \`kd_parent\` property.

## Properties

| Property         | Type   | Values                                                      |
| ---------------- | ------ | ----------------------------------------------------------- |
| kd_status        | text   | todo, in-progress, maintenance, blocked, waiting, done, cancelled |
| kd_priority      | number | 1–4 (1 = highest)                                           |
| kd_urgency       | number | 1–4 (1 = most urgent)                                       |
| kd_parent        | link   | Wikilink to parent task page                                |
| kd_depends_on    | list   | Wikilinks to blocking task pages                            |
| kd_duration      | text   | Bases duration format: 2w, 3d, 4h, 30m                      |
| kd_start         | date   | YYYY-MM-DD                                                  |
| kd_due           | date   | YYYY-MM-DD                                                  |
| kd_owner         | link   | Wikilink to person responsible                              |
| kd_collaborators | list   | Wikilinks to people/resources involved                      |
| kd_cover         | link   | Wikilink to image file for cards view                       |
| kd_cost          | number | Cost                                                        |
| kd_created       | date   | YYYY-MM-DD                                                  |
| kd_closed_reason | text   | done, cancelled, etc.                                       |

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
  kd_status:
    displayName: Status
  kd_priority:
    displayName: Pri
  kd_urgency:
    displayName: Urg
  kd_parent:
    displayName: Parent
  kd_depends_on:
    displayName: Depends On
  kd_duration:
    displayName: Duration
  kd_due:
    displayName: Due
  kd_owner:
    displayName: Owner
  kd_collaborators:
    displayName: Collaborators
views:
  - type: table
    name: All Tasks
    order:
      - file.name
      - kd_status
      - kd_priority
      - kd_urgency
      - kd_due
    sort:
      - property: kd_priority
        direction: ASC
      - property: kd_urgency
        direction: ASC
  - type: table
    name: Ancestors
    filters:
      and:
        - or:
            - file == this.kd_parent
            - file == this.kd_parent.asFile().properties.kd_parent
            - file == this.kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent
            - file == this.kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent
            - file == this.kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent
    order:
      - file.name
      - kd_status
      - kd_priority
      - kd_urgency
  - type: table
    name: Sisters
    filters:
      and:
        - kd_parent == this.kd_parent
        - file != this.file
    order:
      - file.name
      - kd_status
      - kd_priority
      - kd_urgency
      - kd_due
    sort:
      - property: kd_priority
        direction: ASC
      - property: kd_urgency
        direction: ASC
`;

const DESCENDANTS_BASE_FILE = `filters:
  and:
    - note.kuwadate == 1
    - or:
        - kd_parent == this.file.name
        - kd_parent.asFile().properties.kd_parent == this.file.name
        - kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent == this.file.name
        - kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent == this.file.name
        - kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent.asFile().properties.kd_parent == this.file.name
properties:
  kd_status:
    displayName: Status
  kd_priority:
    displayName: Pri
  kd_urgency:
    displayName: Urg
  kd_parent:
    displayName: Parent
  kd_due:
    displayName: Due
  kd_cost:
    displayName: Cost
views:
  - type: table
    name: Children
    filters:
      and:
        - note.kuwadate == 1
        - kd_parent == this.file.name
    order:
      - file.name
      - kd_status
      - kd_urgency
      - kd_priority
      - kd_due
      - kd_cost
    sort:
      - property: kd_priority
        direction: ASC
      - property: kd_urgency
        direction: ASC
      - property: kd_status
        direction: ASC
    summary:
      kd_cost: sum
  - type: cards
    name: Children Cards
    filters:
      and:
        - kd_parent == this.file.name
    order:
      - file.name
      - kd_status
      - kd_priority
      - kd_urgency
    sort:
      - property: kd_priority
        direction: ASC
      - property: kd_urgency
        direction: ASC
    image: kd_cover
  - type: table
    name: All Descendants
    order:
      - file.name
      - kd_status
      - kd_priority
      - kd_urgency
      - kd_due
      - kd_cost
    sort:
      - property: kd_priority
        direction: ASC
      - property: kd_urgency
        direction: ASC
    summary:
      kd_cost: sum
  - type: table
    name: Active
    filters:
      and:
        - or:
            - note.kd_status == "in-progress"
            - note.kd_status == "maintenance"
    order:
      - file.name
      - kd_priority
      - kd_urgency
      - kd_due
    sort:
      - property: kd_priority
        direction: ASC
  - type: table
    name: Blocked
    filters:
      and:
        - note.kd_status == "blocked"
    order:
      - file.name
      - kd_priority
      - kd_urgency
      - kd_due
  - type: table
    name: Due Soon
    filters:
      and:
        - note.kd_status != "done"
        - note.kd_status != "cancelled"
        - note.kd_due <= today() + "7d"
    order:
      - file.name
      - kd_status
      - kd_due
      - kd_priority
    sort:
      - property: kd_due
        direction: ASC
`;

const TASK_TEMPLATE_CONTENT = `---
kd_type: task
kd_status: todo
kd_priority:
kd_urgency:
kd_parent:
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
kd_created: "{{date:YYYY-MM-DD}}"
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
