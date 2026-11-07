# Website refinement — 6 November 2026

These notes record the first design pass on `codex/admin-design-interactions`.
The subsequent 3D experiences are documented in [PLAYGROUND.md](PLAYGROUND.md).

## What changed

- Admin navigation groups website editing separately from conversations, with
  a compact sidebar on desktop and scrolling navigation on mobile.
- Project search covers both titles, slug, tags and links. Category filters,
  ordering and public preview links make a growing collection easier to manage.
- The project editor groups English and Slovenian text, organisation and links,
  and images. Opening an editor brings it into view and focuses the first field.
- Pages & wording has clearer homepage labels, section shortcuts, pending-only
  filtering, a change count, and before/after review across both languages.
  Undo restores individual published values; restoring defaults is separate.
- The homepage uses a serif accent in its headline and a warm, light services
  section with ruled rows, giving the existing dark design more variation.
- A small isometric brick board lets visitors choose colours, stack bricks,
  clear a stack, undo and reset. New bricks snap into place. It has keyboard
  controls and reduced-motion styling, and uses no new dependency.
  Its bilingual copy and visibility are editable in the admin.

## What would make the site feel more personal next

### 1. Project stories with real evidence

Give selected projects their own visual structure: the actual starting problem,
an early sketch, a working screenshot, one decision that changed, and what still
needs work. A few honest paragraphs and real photographs will add more character
than additional slogans. Use the existing gallery and captions first.

### 2. Before/after comparison

Add a draggable comparison for an actual website redesign, app screen or print
iteration. Provide a range slider with keyboard support and explicit Before and
After buttons. Keep it optional per project in admin, with two images and captions.
This needs a genuine pair of images; do not invent a predecessor.

### 3. Small playable app demos

Let visitors try one useful action from a real Android project in a phone frame.
For example, if the app supports it, completing a routine could demonstrate the
actual feedback and transition. Use a deliberately limited demo with a reset
control and clear sample-data labels. Avoid embedding a heavy app emulator.

### 4. A build sequence visitors control

For a LEGO build or 3D print, a draggable progress slider could move through
real assembly photos. Visitors can inspect the intermediate steps instead of
watching an endless animation. Add a native slider and Previous/Next buttons;
keep galleries usable when reduced motion is enabled.

### 5. A short “On my desk” note

One dated note about what Jakob is currently making, accompanied by a real
work-in-progress photograph. Make its text, image and date editable together.
An occasional honest update is enough; do not simulate activity or availability.

## Useful admin work after this pass

1. A genuine Draft / Published project lifecycle with preview and scheduling.
   This needs server-side visibility rules, not just badges in the editor.
2. A media library showing where each image is used, with crop and focal-point
   controls. Confirm all references before offering permanent deletion.
3. English/Slovenian completion indicators that identify missing translations
   without generating or publishing text automatically.
4. Published content history with explicit restore, separate from the existing
   two-hour unpublished draft recovery.

Choose one signature interaction per area. Keep links, reading and forms easy
to use. Avoid cursor trails, excessive card tilt, forced scroll sequences and
motion that hides content while visitors wait.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 148 passed, including a new publishing-review regression for
  bilingual changes, shared visibility and restoring defaults.
- `npm run build`: passed.
- Browser: tested desktop at 1280px and mobile at 390px and 320px; corrected
  the initial admin navigation overflow. The homepage had no horizontal
  overflow at 320px; the admin and homepage fit the tested 390px viewport.
- Browser: verified keyboard/pointer brick placement, stack limit and undo,
  bilingual labels, content review, draft recovery across admin sections,
  draft discard and local sign-in/sign-out. Test drafts were cleared.
- The local project database was unavailable. Project CRUD and populated-list
  browser checks remain unverified; existing mocked API regression tests passed.
- The preview was stopped after testing. No production data was changed.

Review screenshots are in `artifacts/design-2026-11-06/` (local artifacts).
