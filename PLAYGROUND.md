# Stillwater Rush and Paper League

The homepage Arcade section, navigation and footer lead to `/play`.
`/play?scene=paper` opens Paper League directly. The arcade fills the available
viewport in portrait and landscape. Both games have English and Slovenian text,
touch and keyboard controls, pause, instant replay, optional sound, and personal
bests saved on the current device.

**Stillwater Rush:** Cross a 540 m course in three stages. Use the arrows, A/D,
on-screen buttons, or horizontal swipes to change lanes. Use Space, Up, the Jump
button, or an upward swipe to jump. Collect lights for points and a streak bonus;
keep at least one heart to reach the finish gate. The course speeds up at each stage.

**Paper League:** Drag upward, use the dotted arc to judge direction and power,
then release to shoot. Arrow keys adjust aim and power; Space throws. The Toss
button uses the current keyboard aim, or a center throw by default. Score six
baskets out of ten to clear the league. The target stands still for the first
three throws, moves after that, and a crosswind comes in for the last four.
Center shots and streaks earn extra points.

## Rendering

Stillwater uses Three.js WebGL 2 with a chase camera and instanced scenery.
Cinematic mode adds one analytically traced reflection ray per water fragment
against simplified island geometry. The rest of the scene is rasterized. Auto
chooses a starting tier based on device hints and lowers it when frame times
stay high. WebGL initialization or context failure falls back to a playable
2D version using the same course, collision rules, and scoring.

| Tier | Pixel budget | Max DPR | Shadows | Island reflections | Target rate |
| --- | ---: | ---: | ---: | --- | ---: |
| Low | 350,000 | 0.85 | Off | Off | 30 fps |
| Balanced | 850,000 | 1.2 | 1024 | Off | 60 fps |
| Cinematic | 1,500,000 | 1.6 | 2048 | On | 60 fps |

Paper League uses a capped Canvas 2D renderer and analytic projectile motion.
Both games generate their scenery locally. The homepage downloads neither
renderer. The game clock pauses when the tab is hidden; reduced-motion
preferences disable decorative effects such as confetti and damage flashes.

`tests/play-model.test.ts` verifies tier selection, reachable lanes and jumps,
a complete coastal run at 30 FPS, and paper scoring across all three rounds.
