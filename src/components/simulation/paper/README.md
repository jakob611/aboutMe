## Paper Bench

The sheet is 210 × 297 mm and represents 80 g/m² stock (4.9896 g). The model
uses metres, seconds, a 120 Hz fixed step, standard gravity, near-inextensible
triangle edges, compliant bending links and a plastic rest-length update.
The grip pins a sheet point. Extra one-way stretch constraints transmit tension
from that point without blocking compression. Release transfers the last
pointer velocity to nearby vertices. The table applies friction and bounded
contact. A spatial hash handles local self-contact and a two-layer constraint
keeps the guided half-fold from intersecting itself. The press and flattening
motions use guided tools. Fold and compression traces survive reopening.

This is an interactive shell approximation. Bending, local thickness and fan
response are tuned at the fixed mesh resolution. Creases and contact cannot
resolve microscopic fibre behaviour. Fan labels indicate relative strength
because the airflow is a simplified lift and drag model.

- [ISO 216:2007 dimensions](https://preview.sist.si/sist-preview/36631/c0883203ea25445c9992bb09343620c5/ISO-216-2007.pdf)
- [Müller et al., Position Based Dynamics](https://www.sciencedirect.com/science/article/pii/S1047320307000065)
- [Narain et al., Folding and Crumpling Adaptive Sheets](https://jamesobrien.com/papers/Narain-FCA-2013-07/index.html)

The colour, normal and roughness textures in public/simulation/paper come from
[Dark Wood by Poly Haven](https://polyhaven.com/a/dark_wood), released under
[CC0](https://polyhaven.com/license). They were resized and converted to WebP.
The roughness texture was remapped to model a matte finish. The paper fibres,
props, ruler marks and notebook cover were made for this project.
