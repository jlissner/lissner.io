---
status: implementing
date: 2026-04-29
complexity: 2
---

# Update Face Tagging to Allow Typing Person Name

## Why

Currently, when tagging a face and creating a new person, the system automatically generates a placeholder name ("Person {id}"). Users cannot type the person's name during the face tagging flow. The request is to allow typing a person's name when creating a new person during face tagging, and to use the `PersonSelect` component for this purpose.

## What Changes

### Features Modified

- `features/people/people-and-faces.feature` - Updated scenarios for face assignment and video tagging to include naming new persons

### UI Components to Update

- `ui/src/features/people/components/PersonSelect.tsx` - Enhance to support typing a new person's name (convert to combobox/autocomplete that allows creation)
- `ui/src/features/media/components/InlineAssignBar.tsx` - Use enhanced PersonSelect for face assignment
- `ui/src/features/media/components/MediaViewerReassignModal.tsx` - Use enhanced PersonSelect for face reassignment
- `ui/src/features/media/components/TagPeopleDialog.tsx` (or similar for video) - Use enhanced PersonSelect for video tagging

## Prior Art

The backend already supports creating a person with a specific name via `createPerson(name)` in `server/src/db/media-people.ts`. The `PersonSelect` component currently exists and is used in `people-match-faces-wizard.tsx` and `people-merge-modal.tsx`, but it only supports selecting from existing people (dropdown only).

The enhancement needs to convert `PersonSelect` into a combobox that:

1. Shows existing people as selectable options
2. Allows typing to filter existing people
3. Allows typing a completely new name to create a new person

This is a common UI pattern (combobox with creation), similar to how many modern UIs handle person selection (e.g., GitHub's assignee picker, Jira's user picker).
