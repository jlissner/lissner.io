# Tasks: update-face-tagging-name-input

> **Change**: Update face tagging UI to allow typing person name when creating new person, using PersonSelect component
> **Features**: features/people/people-and-faces.feature
> **Decisions**: none
> **Test command**: `npm run test:bdd`
> **Status**: 0/12 tasks complete

## Reuse

- `createPerson(name)` in `server/src/db/media-people.ts` — already supports creating named persons
- `PersonSelect` component exists at `ui/src/features/people/components/PersonSelect.tsx`
- Cucumber-js BDD framework with step definitions in `features/step-definitions/**/*.ts`
- Test setup: `features/support/test-env.ts`

## 1. Enhance PersonSelect Component

<!-- context:
  - .grimoire/changes/update-face-tagging-name-input/features/people/people-and-faces.feature
  - ui/src/features/people/components/PersonSelect.tsx
-->

- [x] 1.1 Update `PersonSelect.tsx` to convert from dropdown to combobox: - Add `allowCreate?: boolean` prop (default: false) - Add internal state for `inputValue` (string) - Render an `<input>` field (when allowCreate is true) that filters the dropdown list - Show filtered people matching inputValue (case-insensitive contains match) - When inputValue doesn't match any existing person and allowCreate is true, show "Create: {inputValue}" as an option - On selection: if value starts with "new:", extract the name after the prefix and call onChange with a special sentinel to indicate creation - Keep backward compatibility: when allowCreate is false, render the original `<select>` dropdown - Style the input to match existing select styling (same padding, fontSize, borderRadius, border, background, color)

- [x] 1.2 Update `PersonSelect.tsx` to support both selection and creation modes: - Export a type: `type PersonSelectValue = number | { createName: string }` - Update onChange prop type to: `(value: PersonSelectValue) => void` - When existing person selected: call `onChange(person.id)` - When "Create: {name}" selected: call `onChange({ createName: name })` - Update `extraOptions` handling to work with new combobox mode

## 2. Update InlineAssignBar to Use PersonSelect

<!-- context:
  - ui/src/features/media/components/media-viewer/inline-assign-bar.tsx
  - ui/src/features/people/components/PersonSelect.tsx
  - .grimoire/changes/update-face-tagging-name-input/features/people/people-and-faces.feature (scenarios: "Assign a face to an existing person", "Assign a face to a new person with a typed name")
-->

- [x] 2.1 Update `InlineAssignBar.tsx` to use `PersonSelect`: - Import `PersonSelect` from `@/features/people/components/PersonSelect` - Replace the inline `<select>` element with `<PersonSelect>` - Pass `people` prop (already available) - Set `allowCreate={true}` - Set `placeholder="Who is this?"` - Update `onAssign` callback to handle both `number` and `{ createName: string }` values - When value is a number: call `onAssign(personId)` - When value is `{ createName: string }`: call `onAssign("new")` but first need to create the person with the typed name (this requires API call to create person, then assign)

- [x] 2.2 Add person creation logic to `InlineAssignBar.tsx`: - Import `createPerson` from the API client (check existing imports in media-viewer-content.tsx for pattern) - When `{ createName: string }` is received, call `createPerson(name)` API first - On success, get the new person's ID and call `onAssign(newPersonId)` - Handle errors by showing an error state (use same pattern as existing error handling) - Add loading state while creating person

## 3. Update MediaViewerReassignModal to Use PersonSelect

<!-- context:
  - ui/src/features/media/components/media-viewer/media-viewer-reassign-modal.tsx
  - ui/src/features/people/components/PersonSelect.tsx
  - .grimoire/changes/update-face-tagging-name-input/features/people/people-and-faces.feature (scenario: "Reassign a face to a new person with a typed name")
-->

- [x] 3.1 Update `MediaViewerReassignModal.tsx` to use `PersonSelect`: - Import `PersonSelect` from `@/features/people/components/PersonSelect` - Replace the inline `<select>` element with `<PersonSelect>` - Pass `people` prop (use `otherPeople` for the list) - Set `allowCreate={true}` - Set `placeholder="Reassign to…"` - Add `excludeIds={[reassigningFace.personId]}` to filter out current person - Update `onReassign` callback to handle both `number` and `{ createName: string }` values - Keep "Remove tag" as a separate button (not in PersonSelect)

- [x] 3.2 Add person creation logic to `MediaViewerReassignModal.tsx`: - Import `createPerson` from the API client - When `{ createName: string }` is received, call `createPerson(name)` API first - On success, call `onReassign(newPersonId)` - Handle errors appropriately

## 4. Update Video Tagging Dialog to Use PersonSelect

<!-- context:
  - ui/src/features/media/components/media-viewer/media-viewer-content.tsx (lines 396-580, video tagging dialog)
  - ui/src/features/people/components/PersonSelect.tsx
  - .grimoire/changes/update-face-tagging-name-input/features/people/people-and-faces.feature (scenarios: "Tag a person as appearing in a video", "Tag a new person in a video with a typed name")
-->

- [x] 4.1 Update video tagging dialog in `media-viewer-content.tsx`: - Import `PersonSelect` from `@/features/people/components/PersonSelect` - Replace the inline `<select>` (lines 538-576) with `<PersonSelect>` - Pass `people` prop (already available in scope) - Set `allowCreate={true}` - Set `placeholder="Select…"` - Update the onChange handler to: - When value is a number: call existing `addPersonToMedia(item.id, { personId })` logic - When value is `{ createName: string }`: first call `createPerson(name)`, then call `addPersonToMedia(item.id, { personId: newId })`

- [x] 4.2 Add person creation logic to video tagging: - Import `createPerson` from the API client - Add loading state while creating person - Handle errors by setting `setVideoTaggingError` - On success: call `loadVideoTaggedPeople()` and `setDetailsRefreshKey`

## 5. Write Step Definitions for New Scenarios

<!-- context:
  - .grimoire/changes/update-face-tagging-name-input/features/people/people-and-faces.feature
  - features/step-definitions/**/*.ts (check existing patterns)
  - features/support/test-env.ts
-->

- [x] 5.1 Create step definitions file `features/step-definitions/people-and-faces.steps.ts` (or add to existing): - **Given** "I have an image open in the media viewer with detected faces": - Navigate to media viewer with an image that has detected faces - Enable tagging mode - Verify detected faces are shown

      - **Given** "people exist in the system":
        - Call API to create test people (or use seeded data)
        - Verify people list is not empty

      - **When** "I assign a face region to an existing person using the person selector":
        - Click on a detected face to open the assign bar
        - Select an existing person from the PersonSelect dropdown
        - Verify the assignment API was called

      - **When** "I type a new person's name in the person selector and assign the face":
        - Click on a detected face to open the assign bar
        - Type a new person's name in the PersonSelect input
        - Select "Create: {name}" option
        - Verify `createPerson` API was called with the typed name
        - Verify `addPersonToMedia` was called with the new person's ID

- [x] 5.2 Add step definitions for reassign scenarios: - **Given** "a face on media is linked to a person": - Create a person and assign a face to them - Verify the face is linked

      - **When** "I reassign that face to a new person by typing a name in the person selector":
        - Click on the tagged face to open reassign modal
        - Type a new person's name in the PersonSelect
        - Select "Create: {name}" option
        - Verify new person was created and face reassigned

- [x] 5.3 Add step definitions for video tagging scenarios: - **Given** "I have a video open in the media viewer": - Navigate to media viewer with a video - Open the video tagging dialog - **When** "I tag that person as appearing in the video using the person selector": - Select existing person from PersonSelect in video dialog - Verify the person appears in tagged people list

      - **When** "I type a new person's name in the person selector and tag the video":
        - Type a new person's name in the PersonSelect
        - Select "Create: {name}" option
        - Verify new person was created and appears in tagged people list

## 6. Update Existing Step Definitions

<!-- context:
  - features/step-definitions/**/*.ts
  - features/people/people-and-faces.feature (original scenarios)
-->

- [x] 6.1 Update existing step definitions for "Assign a face on media from the viewer": - Scenario was renamed to "Assign a face to an existing person from the viewer" - Update step text in feature file to match: "When I assign a face region to an existing person using the person selector" - Ensure step definition handles the new wording

## 7. Verification

- [x] 7.1 Run `npm run test:bdd` — all new scenarios green
- [x] 7.2 Run `npm run test:bdd` — no regressions in existing scenarios
- [x] 7.3 Run `npm run build` — TypeScript compilation passes
- [x] 7.4 Run `npm run lint` — no lint errors
- [ ] 7.5 Manual test: - Open an image with detected faces - Click "Tag faces" - Click on a face, type a new name in PersonSelect, select "Create: {name}" - Verify new person is created with typed name (not "Person {id}") - Verify face is assigned to the new person
- [ ] 7.6 Manual test: - Open a video - Click "Tag people" - Type a new name in PersonSelect, select "Create: {name}" - Verify new person is created and video is tagged
