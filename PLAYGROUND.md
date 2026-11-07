# Stillwater and Paper Studio

Open `/play` for the island or `/play?scene=paper` for the paper studio.
The homepage Playground section, main navigation and footer link to the experiences. Both English
and Slovenian are supported. The existing website and admin remain separate.

## The island

- WASD / arrows move the small golden marble. The canvas must have focus; click
  or tap the scene first. On-screen arrow buttons support holding with a pointer
  or Enter/Space. Releasing, cancelling input or leaving the window stops movement.
- Tap the ground to move toward a destination; drag to orbit the camera. The
  scroll wheel zooms only while the scene has focus. Reset camera restores framing.
- Movement slides against architecture and trees and stays inside the island.
  Large time steps are subdivided to prevent tunnelling through obstacles.
- Landmark buttons travel directly and expose the same notes without requiring
  dexterity. Discovery progress stays in memory for the current page.
- The lighting slider transitions from warm daylight to blue hour. Lanterns and
  motes appear after dark. Reduced motion suppresses ambient waves and motes.
- Click the observatory bell or use **Ring the bell** for a chime. It swings and
  sends a ripple across the water. Audio only plays on request; reduced motion
  keeps the bell and water still.

## Rendering and device support

The main scene is rasterized with Three.js WebGL 2. **Cinematic** adds one
analytically traced reflection ray per water fragment, intersecting simplified
sphere/box representations of up to 32 landmarks. It is a hybrid renderer, not
full-scene path tracing or hardware RTX. The reflection geometry deliberately
approximates the visible meshes. Directional shadow maps light the main scene.

| Setting | Pixel budget | Maximum pixel ratio | Shadows | Landmark reflections | Target |
| --- | ---: | ---: | --- | --- | --- |
| Low | 350,000 | 0.85 | Off | Off | ~30 fps |
| Balanced | 850,000 | 1.2 | 1024 | Off | 60 fps |
| Cinematic | 1,500,000 | 1.6 | 2048 | On | 60 fps |

Auto considers reported memory, logical cores, coarse pointers and data-saving
preferences, then downgrades after sustained slow frames. Manual selection
overrides adaptation. Quality is the only setting stored in localStorage.
Reported device properties are hints, not a benchmark of a particular phone.

The engine is dynamically imported after entry; the homepage loads no renderer.
Geometry, paper textures and scenery are generated locally. No model, HDRI,
external API, analytics or physics-engine downloads are needed. The sole new
runtime dependency is pinned Three.js 0.187.0.

Rendering suspends when the scene is offscreen, the document is hidden or Pause
is selected. Paper stops redrawing after its motion settles. Switching modes
disposes the previous canvas, geometry, materials, textures, shadow target,
event listeners and renderer. Expanded view uses an in-page overlay with Escape
and keyboard focus containment; it does not depend on native fullscreen support.

Browsers without a usable WebGL 2 context receive a static island illustration,
landmark notes and a CSS paper alternative with the normal controls. Context loss
also switches to this fallback. No requirement is made for hardware ray tracing.

## Paper studio

Six procedural, textured sheets deform between an unfolded plane and a creased
compact form. Tap a sheet to unfold it, drag to grab, and release to throw. The
Unfold, Crumple, Throw and Gather controls provide keyboard alternatives. A sheet
selector reaches objects that have moved outside the camera view.

The custom lightweight physics handles gravity, bouncing, friction and spherical
contacts between folded sheets. It is an artistic paper approximation, not a
physical self-colliding cloth solver or the Codrops Houdini/VAT asset. Only folding
sheets update their geometry; other pieces move as rigid objects.

Visitors can type up to 180 characters onto the selected sheet. Words are drawn
into a local canvas texture, never interpreted as HTML or sent to a server.
Notes remain in current-page memory and disappear on reload/navigation.

## Verification

- TypeScript and the production Next build pass.
- The automated suite has 150 passing tests, including quality fallback policy,
  valid destinations, boundary containment and obstacle tunnelling regressions.
- Browser checks cover keyboard movement, held on-screen controls, camera drag,
  landmark travel, lighting, expanded view, paper selection/folding/throwing,
  drag-to-throw, editable texture text, pause/resume and quality switching.
- Tested layouts: desktop 1280px, mobile 390px and 320px. No horizontal overflow
  was observed at the tested narrow widths.
- On the test browser, Cinematic world rendering measured about 59–60 fps and
  Low about 30–31 fps. Paper reached zero redraws after settling. These are
  measurements on the test machine, not a physical low-end-device certification.
- Physical phone GPUs and the unavailable-WebGL/context-loss path were not
  exercised in the browser. Fallback behavior is implemented, not hardware-verified.

Local review screenshots: `artifacts/stillwater-2026-11-06/`.
