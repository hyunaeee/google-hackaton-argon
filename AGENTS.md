# 3D Objects, People Assets & Virtual Show Unit Skill Rules (`apartment-vr-tour`, `blender-realistic-people`)

Whenever working on **3D objects, 3D modeling, Blender scripts/scenes, procedural or scanned 3D assets (furniture, bedding, fixtures, buildings, trees, cars, people), 3D rigging (`RIG_<name>`), GLB export, lightmap baking, Three.js 3D web viewers, or 360° VR tours** in this project:

1. **General 3D Objects & Virtual Show Units (`apartment-vr-tour`)**:
   - **Read and follow** `.agents/skills/apartment-vr-tour/SKILL.md` (also at `~/.gemini/config/skills/apartment-vr-tour/SKILL.md`) and `.agents/skills/apartment-vr-tour/references/pitfalls.md` before building or modifying 3D assets/scenes.
   - **No raw primitives** (boxes, spheres, cylinders) as final furniture, trees, cars, or people. Use bevelled joinery, lathed fixtures, cloth-simulated bedding (`scripts/units/make_bedding.py`), or scanned/real models.
   - **Rigging**: Everything that opens (doors, windows, cabinets, drawers) must be rigged via a pivot empty `RIG_<name>` with an `open` (`0..1`) custom property driving its transform.
   - **True Scale & Plans**: Match real plan dimensions (`전용면적` interior scale) and verify visual details against reference CGs.
   - **Reference Implementation**: Reuse patterns and helper modules in `.agents/skills/apartment-vr-tour/scripts/` (`units/`, `complex/`, `people/`, `site/`, `video/`).

2. **3D People, Characters & Animated Crowds (`blender-realistic-people`)**:
   - **Read and follow** `.agents/skills/blender-realistic-people/SKILL.md` (also at `~/.gemini/config/skills/blender-realistic-people/SKILL.md`) whenever creating, rigging, posing, or animating 3D people, pedestrians, characters, or seated/standing audiences.
   - **Full Runtime Included**: Use `.agents/skills/blender-realistic-people/scripts/prepare_runtime.py`, `scripts/build_people.py`, and the motion/appearance runtime in `assets/runtime/` (`actor_assets.py`, `crowd50_appearance.py`, `crowd50_cast.json`, `motion_tools.py`, `fast_motion_tools.py`, `mixed_reactions.py`, `native_mocap_cache.pkl.gz`).
   - Consult `.agents/skills/blender-realistic-people/references/people-workflow.md`, `references/blender-runtime.md`, and `references/setup.md` (note: Rocketbox FBX/TGA assets can also be fetched via `.agents/skills/apartment-vr-tour/scripts/people/fetch_rocketbox.py` if not already cached locally).
