# Field Studies

The homepage Simulations section, site navigation and footer lead to
`/play`. `/play?scene=paper` opens Paper Bench directly. Each scene fills the
available viewport and has English and Slovenian controls. There are no
objectives, timers or scores.

## Strunjan Coast

A walkable, human-scale landscape inspired by the Strunjan coast. The
visible ground, walkable slopes and wading limit use the same height model.
Wind, light and water level are adjustable. Aim and throw a pebble with
the on-screen button or the E key. Shallow, fast throws may skip and send
ripples across the surface. The optional surf sound changes with the
distance to shore and uses a recording from a Mediterranean rocky shore.

The water uses multiple wave components, a deep-water dispersion relationship
and Fresnel reflection at an air–water interface. Its coastal breaking,
foam, absorption and caustics are visual approximations. Higher tiers trace
a shallow refracted ray through the seabed height model, and the top tier
adds a planar reflection pass. Automatic graphics quality caps resolution
and reduces the more expensive rendering passes when needed.

See [Tessendorf, Simulating Ocean Water](https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2002.pdf)
for background on wave dispersion and [Clanet et al., Secrets of Successful
Stone-Skipping](https://www.nature.com/articles/427029a) for the inspiration
behind the approximate skip rule. The [model credits](public/simulation/props/CREDITS.md)
list the optimized photo-scanned scene objects.

## Paper Bench

The workbench models a 210 × 297 mm sheet of 80 g/m² stock, about 4.99 g.
Drag the edge or corner to lift it, flick it and release to throw, or use the
fold, crumple and flatten tools. Try the fan before and after crumpling to see
how the shape changes the sheet's response. A fresh sheet clears its crease
history. The view can be rotated and zoomed separately from manipulating the
paper.

The deformable sheet uses fixed simulation steps and approximate stretch,
bend, self-contact, table contact, friction and air drag. Folds keep plastic
deformation and leave visible crease marks; assisted tools approximate the
motions of a hand. The model is not calibrated to the elastic and plastic
properties of a specific paper stock. The [workbench notes](src/components/simulation/paper/README.md)
describe its limits and materials.

References: [ISO 216 paper dimensions](https://www.iso.org/standard/36631.html)
and [Andrejevic et al., simulation of crumpled sheets](https://arxiv.org/abs/2112.13268).

## Assets and review

The simulations load only on their own routes. Sound stays off until enabled
and does not download while muted. See the [field recording credits](public/simulation/audio/CREDITS.md).
Real materials and recordings are combined with authored scene geometry;
the presentation does not imply that the entire scene was photographed.
