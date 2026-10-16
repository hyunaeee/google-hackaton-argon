"""
Build the realistic FANVERSE VIP Backstage Green Room & K-Pop Demon Hunters 3D Cast
strictly using:
1. Higgsfield / Tripo 3D / Hyper3D Rodin generated GLB override loader (`assets/models/generated/<name>.glb`)
2. `.agents/skills/apartment-vr-tour` (`ps_lib.py` & `ps_parts.py` + Poly Haven CC0 PBR textures & 3D glTF models)
3. `.agents/skills/blender-realistic-people` (Microsoft Rocketbox rigged human FBX + native mocap cache + K-Pop Demon Hunters 3D face sculpting & UV texture retouching)

Warm, realistic architectural interior tone (NO cyberpunk purple/neon).
Unified coordinate layout:
- Back Wall (`stage_door`, `audio_rack`, oak acoustic slats) at Blender `Y = +3.4` -> Three.js `Z = -3.4`
- Left Wall (`vanity_table`, `access_card`) at Blender `X = -4.2` -> Three.js `X = -4.2`
- Right Wall (`equipment_locker`, `microphone`) at Blender `X = +4.2` -> Three.js `X = +4.2`
- Front Open Cutaway Camera at Blender `Y = -5.15, Z = 1.68` -> Three.js `Z = +5.15, Y = 1.68` (Human Eye Level)

Exports `/Users/hyunaeee/Desktop/google-hackaton/client/public/models/backstage_room.glb` (<15 MB for Cloud Run)
and renders `/Users/hyunaeee/Desktop/google-hackaton/assets/references/blender_skill_v3_preview.png`.
"""
import math
import os
import sys
import bpy
from mathutils import Euler, Matrix, Vector

ROOT_DIR = "/Users/hyunaeee/Desktop/google-hackaton"
APT_UNITS_DIR = os.path.join(ROOT_DIR, ".agents/skills/apartment-vr-tour/scripts/units")
PEOPLE_RUNTIME_DIR = os.path.join(ROOT_DIR, ".agents/skills/blender-realistic-people/assets/runtime")
ROCKETBOX_DIR = os.path.join(ROOT_DIR, "blender/rocketbox_assets")
GENERATED_GLB_DIR = os.path.join(ROOT_DIR, "assets/models/generated")
GLB_OUT = os.path.join(ROOT_DIR, "client/public/models/backstage_room.glb")
PREVIEW_OUT = os.path.join(ROOT_DIR, "assets/references/blender_skill_v3_preview.png")

for p in (APT_UNITS_DIR, PEOPLE_RUNTIME_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

from pathlib import Path
import ps_lib as L
import ps_parts as P
from motion_tools import BODY_WORDS, _audience_sample, _walk_sample


def _load_tga_image(path, noncolor=False, max_dim=1024):
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = "Non-Color" if noncolor else "sRGB"
    w, h = image.size
    if max(w, h) > max_dim:
        scale = max_dim / float(max(w, h))
        image.scale(max(1, int(w * scale)), max(1, int(h * scale)))
    return image


def _apply_kpop_demon_hunters_face_tex(src_image, char_name: str, is_female: bool = True):
    """
    Transform a realistic Rocketbox head texture into the stylized 3D K-Pop Idol aesthetic
    inspired by Sony Pictures Animation's 'K-Pop Demon Hunters (케이팝 데몬 헌터스)':
    - Smooth cel-satin porcelain-peach K-idol skin with warm blush on cheeks & nose tip
    - Crisp winged cat-eye eyeliner, bright starlight catchlights, and defined aegyo-sal shimmer
    - Sleek straight-arch K-idol eyebrows
    - High-contrast nose bridge highlight & pearl tip dot
    - K-beauty gradient velvet-gloss lips with lower-lip specular catchlight
    """
    out_name = f"KPopDH_{char_name}_HeadColor"
    existing = bpy.data.images.get(out_name)
    if existing:
        return existing

    img = src_image.copy()
    img.name = out_name
    img.scale(1024, 1024)
    w, h = img.size
    px = list(img.pixels)

    def _blend(ix, iy, r, g, b, alpha):
        if ix < 0 or ix >= w or iy < 0 or iy >= h or alpha <= 0.0:
            return
        a = min(1.0, max(0.0, alpha))
        idx = (iy * w + ix) * 4
        px[idx] = px[idx] * (1.0 - a) + r * a
        px[idx + 1] = px[idx + 1] * (1.0 - a) + g * a
        px[idx + 2] = px[idx + 2] * (1.0 - a) + b * a

    # 1. Stylized K-Pop Demon Hunters Porcelain-Peach Cel-Satin Skin across face UV (u: 0.28..0.72, v: 0.42..0.85)
    x0, x1 = int(0.28 * w), int(0.72 * w)
    y0, y1 = int(0.42 * h), int(0.85 * h)
    target_skin = (0.97, 0.84, 0.77) if is_female else (0.94, 0.80, 0.72)

    for iy in range(y0, y1):
        v = iy / float(h)
        wy = 1.0 - max(0.0, (abs(v - 0.65) - 0.14) / 0.09)
        if wy <= 0.0:
            continue
        for ix in range(x0, x1):
            u = ix / float(w)
            wx = 1.0 - max(0.0, (abs(u - 0.50) - 0.14) / 0.08)
            if wx <= 0.0:
                continue
            # Exclude inner mouth/teeth region (u < 0.25) and keep eyes/brows sharp
            idx = (iy * w + ix) * 4
            r, g, b = px[idx], px[idx + 1], px[idx + 2]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            # Only lift skin pixels (not dark eyelashes/hair)
            if lum > 0.26:
                strength = (0.58 if is_female else 0.48) * wx * wy
                # Stylized cel-satin quantization boost
                nr = min(1.0, r * 0.45 + target_skin[0] * 0.55 + 0.04)
                ng = min(1.0, g * 0.45 + target_skin[1] * 0.55 + 0.03)
                nb = min(1.0, b * 0.45 + target_skin[2] * 0.55 + 0.03)
                px[idx] = r * (1.0 - strength) + nr * strength
                px[idx + 1] = g * (1.0 - strength) + ng * strength
                px[idx + 2] = b * (1.0 - strength) + nb * strength

    # 2. Warm K-Idol Cheek Blush & Nose Tip Blush (u = 0.405 & 0.595, v = 0.635)
    blush_col = (0.96, 0.48, 0.54) if is_female else (0.92, 0.56, 0.52)
    blush_strength = 0.34 if is_female else 0.16
    for cx_u in (0.405, 0.595):
        cx, cy = int(cx_u * w), int(0.635 * h)
        rx, ry = int(0.052 * w), int(0.032 * h)
        for dy in range(-ry, ry + 1):
            for dx in range(-rx, rx + 1):
                d2 = (dx / float(rx)) ** 2 + (dy / float(ry)) ** 2
                if d2 < 1.0:
                    _blend(cx + dx, cy + dy, *blush_col, blush_strength * ((1.0 - d2) ** 2))

    # 3. Stylized 3D Nose Bridge Highlight & Tip Catchlight (u = 0.50, v = 0.656..0.720)
    nx = int(0.50 * w)
    for iy in range(int(0.664 * h), int(0.722 * h)):
        for dx in range(-4, 5):
            w_x = 1.0 - abs(dx) / 5.0
            _blend(nx + dx, iy, 1.0, 0.96, 0.92, 0.42 * w_x)
    # Nose tip pearl dot at u=0.50, v=0.657
    nt_y = int(0.657 * h)
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            d2 = (dx / 6.0) ** 2 + (dy / 6.0) ** 2
            if d2 < 1.0:
                _blend(nx + dx, nt_y + dy, 1.0, 0.97, 0.94, 0.55 * (1.0 - d2))

    # 4. K-Pop Demon Hunters Gradient Lips (u: 0.448..0.552, v: 0.562..0.606)
    lip_outer = (0.88, 0.32, 0.44) if is_female else (0.82, 0.44, 0.46)
    lip_inner = (0.76, 0.12, 0.28) if is_female else (0.68, 0.28, 0.32)
    lx, ly = int(0.50 * w), int(0.584 * h)
    lrx, lry = int(0.050 * w), int(0.022 * h)
    for dy in range(-lry, lry + 1):
        for dx in range(-lrx, lrx + 1):
            d2 = (dx / float(lrx)) ** 2 + (dy / float(lry)) ** 2
            if d2 < 1.0:
                inner_w = max(0.0, 1.0 - abs(dy) / (0.45 * lry))
                cr = lip_outer[0] * (1.0 - inner_w) + lip_inner[0] * inner_w
                cg = lip_outer[1] * (1.0 - inner_w) + lip_inner[1] * inner_w
                cb = lip_outer[2] * (1.0 - inner_w) + lip_inner[2] * inner_w
                alpha = (0.72 if is_female else 0.48) * ((1.0 - d2) ** 1.4)
                _blend(lx + dx, ly + dy, cr, cg, cb, alpha)
    # Glossy lower lip highlight bar
    for dx in range(-14, 15):
        for dy in range(-2, 3):
            _blend(lx + dx, int(0.575 * h) + dy, 1.0, 0.95, 0.96, 0.58 * (1.0 - abs(dx) / 15.0))

    # 5. K-Pop Demon Hunters Winged Eyeliner, Aegyo-sal Shimmer & Straight K-Idol Eyebrows
    for side in (-1, 1):
        # Eye center at u = 0.430 (left) and 0.570 (right), v = 0.686
        ecx = int((0.50 + side * 0.070) * w)
        ecy = int(0.686 * h)
        erx = int(0.032 * w)
        # Upper winged eyeliner arch
        for dx in range(-erx, erx + 8):
            u_rel = (dx * side) / float(erx)  # -1 inner corner to +1.25 outer wing
            arch_y = int(ecy + 6 * math.cos(min(1.0, max(-1.0, u_rel)) * 1.3) + max(0.0, u_rel - 0.6) * 10)
            thick = 4 if is_female else 3
            for ty in range(-thick, thick + 1):
                _blend(ecx + dx, arch_y + ty, 0.06, 0.04, 0.05, 0.85 * (1.0 - abs(ty) / (thick + 1.0)))
        # Under-eye aegyo-sal pearlescent highlight
        for dx in range(-int(erx * 0.75), int(erx * 0.75)):
            shimmer_y = ecy - 10
            for ty in range(-2, 3):
                _blend(ecx + dx, shimmer_y + ty, 1.0, 0.94, 0.88, 0.38 * (1.0 - abs(ty) / 3.0))
        # Straight-arch K-Idol Eyebrows at v = 0.734
        bcx = int((0.50 + side * 0.072) * w)
        bcy = int(0.734 * h)
        brx = int(0.036 * w)
        for dx in range(-brx, brx + 1):
            u_rel = (dx * side) / float(brx)
            by = int(bcy + u_rel * 3.0)
            for ty in range(-4, 5):
                _blend(bcx + dx, by + ty, 0.14, 0.09, 0.07, 0.65 * (1.0 - abs(ty) / 5.0))

    # 6. Luminous Starlight Iris & Catchlight on Eyeball UV (px around (269, 957) in 1024x1024)
    icx, icy = int(0.263 * w), int(0.935 * h)
    irad = int(0.034 * w)
    iris_col = (0.72, 0.46, 0.24) if is_female else (0.48, 0.32, 0.18)
    for dy in range(-irad, irad + 1):
        for dx in range(-irad, irad + 1):
            r_norm = math.sqrt(dx * dx + dy * dy) / float(irad)
            if 0.35 < r_norm < 0.92:
                _blend(icx + dx, icy + dy, *iris_col, 0.55)
    # Bright anime catchlight dot on iris
    for dy in range(-5, 6):
        for dx in range(-5, 6):
            if dx * dx + dy * dy <= 25:
                _blend(icx - 8 + dx, icy + 8 + dy, 1.0, 1.0, 1.0, 0.95)

    img.pixels[:] = px
    img.update()
    return img


def _sculpt_kpop_idol_head_geometry(char_obj, target_height: float, is_female: bool = True):
    """
    Sculpt the 3D head mesh into a sleek 'K-Pop Demon Hunters' stylized 3D K-Idol proportion:
    - Sleek V-line jawline & tapered chin
    - Slightly refined upper-head / eye-zone proportion for stylized 3D expressive presence
    """
    mesh = char_obj.data
    head_z_min = target_height * 0.865
    jaw_z_min = target_height * 0.872
    jaw_z_max = target_height * 0.928
    eye_z_min = target_height * 0.915

    head_verts = [v for v in mesh.vertices if v.co.z >= head_z_min]
    if not head_verts:
        return

    head_cx = sum(v.co.x for v in head_verts) / len(head_verts)
    head_cy = sum(v.co.y for v in head_verts) / len(head_verts)

    for v in head_verts:
        z = v.co.z
        dx = v.co.x - head_cx
        dy = v.co.y - head_cy

        # 1. V-line jaw & chin narrowing (maximum narrowing at lower jaw/chin)
        if jaw_z_min <= z <= jaw_z_max:
            t = 1.0 - abs(z - (jaw_z_min + 0.018)) / max(0.001, (jaw_z_max - jaw_z_min))
            t = max(0.0, min(1.0, t))
            narrow = (0.19 if is_female else 0.14) * t
            v.co.x = head_cx + dx * (1.0 - narrow)
            # Subtle chin definition
            if dy < 0:
                v.co.y = head_cy + dy * (1.0 - 0.05 * t)

        # 2. Stylized 3D K-Pop cranium & eye-zone presence
        if z >= eye_z_min:
            scale_xy = 1.045 if is_female else 1.03
            v.co.x = head_cx + (v.co.x - head_cx) * scale_xy
            v.co.y = head_cy + (v.co.y - head_cy) * scale_xy

    mesh.update()


def _build_rocketbox_material(
    old_mat,
    texture_dir: Path,
    char_name: str = "actor",
    is_female: bool = True,
    garment_tint=None,
    hair_multiply=None,
):
    base = old_mat.name.split(".")[0]
    suffix = f"_{char_name}"
    if garment_tint and "_body" in base:
        suffix += "_tinted"
    elif hair_multiply and "_opacity" in base:
        suffix += "_hairtint"
    name = "Rocketbox_" + base + suffix
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (680, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (380, 0)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = 0.48 if "_body" in base else 0.42
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.38 if "_head" in base else 0.30

    colorpath = texture_dir / f"{base}_color.tga"
    if colorpath.exists():
        tex = nodes.new("ShaderNodeTexImage")
        tex.location = (-620, 260)
        raw_img = _load_tga_image(colorpath, False, max_dim=1024)
        if "_head" in base:
            tex.image = _apply_kpop_demon_hunters_face_tex(raw_img, char_name=char_name, is_female=is_female)
        else:
            tex.image = raw_img
        color_socket = tex.outputs["Color"]

        if garment_tint and "_body" in base:
            mix = nodes.new("ShaderNodeMixRGB")
            mix.blend_type = "SOFT_LIGHT"
            mix.inputs[0].default_value = 0.48
            mix.inputs[2].default_value = (*garment_tint, 1.0)
            mix.location = (-220, 260)
            links.new(color_socket, mix.inputs[1])
            color_socket = mix.outputs["Color"]
        elif hair_multiply and "_opacity" in base:
            mix = nodes.new("ShaderNodeMixRGB")
            mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = 0.85
            mix.inputs[2].default_value = (*hair_multiply, 1.0)
            mix.location = (-220, 260)
            links.new(color_socket, mix.inputs[1])
            color_socket = mix.outputs["Color"]

        links.new(color_socket, bsdf.inputs["Base Color"])
        if "_opacity" in base:
            links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
            if hasattr(mat, "surface_render_method"):
                mat.surface_render_method = "DITHERED"
            bsdf.inputs["Roughness"].default_value = 0.36

    if "_head" in base:
        if "Subsurface Weight" in bsdf.inputs:
            bsdf.inputs["Subsurface Weight"].default_value = 0.14
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = 0.22
        if "Coat Roughness" in bsdf.inputs:
            bsdf.inputs["Coat Roughness"].default_value = 0.18
        bsdf.inputs["Roughness"].default_value = 0.32

    normalpath = texture_dir / f"{base}_normal.tga"
    if normalpath.exists() and "_head" not in base:
        normtex = nodes.new("ShaderNodeTexImage")
        normtex.location = (-620, -100)
        normtex.image = _load_tga_image(normalpath, True, max_dim=512)
        normal = nodes.new("ShaderNodeNormalMap")
        normal.location = (110, -100)
        normal.inputs["Strength"].default_value = 0.65
        links.new(normtex.outputs["Color"], normal.inputs["Color"])
        links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def resolve_tga_textures(meshes, folder_name: str, char_name: str, is_female: bool, garment_tint=None, hair_multiply=None):
    """Bind Rocketbox TGA textures with K-Pop Demon Hunters 3D face styling."""
    tex_dir = Path(ROCKETBOX_DIR) / folder_name / "Textures"
    for mesh in meshes:
        if mesh.type != "MESH":
            continue
        for poly in mesh.data.polygons:
            poly.use_smooth = True
        for slot in mesh.material_slots:
            if slot.material:
                slot.material = _build_rocketbox_material(
                    slot.material,
                    tex_dir,
                    char_name=char_name,
                    is_female=is_female,
                    garment_tint=garment_tint,
                    hair_multiply=hair_multiply,
                )


def try_import_generated_glb(name: str, loc, rz_deg: float, target_height: float):
    """If `assets/models/generated/<name>.glb` exists (from Higgsfield / Tripo H3.1 / Rodin), import and normalize it."""
    glb_path = os.path.join(GENERATED_GLB_DIR, f"{name}.glb")
    if not os.path.exists(glb_path) or os.path.getsize(glb_path) < 1024:
        return None

    print(f"[HIGGSFIELD/TRIPO GLB] Loading generated 3D asset for {name}: {glb_path}")
    before_objs = set(bpy.data.objects)
    before_imgs = set(bpy.data.images)
    bpy.ops.import_scene.gltf(filepath=glb_path)
    imported = [o for o in bpy.data.objects if o not in before_objs]
    new_imgs = [img for img in bpy.data.images if img not in before_imgs]

    # Downscale 4K Tripo PBR textures to 1024/2048 so Three.js loads instantaneously
    for img in new_imgs:
        try:
            w, h = img.size
            max_dim = 2048 if "Color" in img.name else 1024
            if max(w, h) > max_dim:
                scale = max_dim / float(max(w, h))
                img.scale(max(1, int(w * scale)), max(1, int(h * scale)))
                img.pack()
        except Exception as e:
            print(f"[HIGGSFIELD/TRIPO GLB] Image scale note for {img.name}: {e}")

    meshes = [o for o in imported if o.type == "MESH"]
    if not meshes:
        for o in imported:
            bpy.data.objects.remove(o, do_unlink=True)
        return None

    depsgraph = bpy.context.evaluated_depsgraph_get()
    baked_meshes = []
    for m in meshes:
        eval_obj = m.evaluated_get(depsgraph)
        new_mesh = bpy.data.meshes.new_from_object(eval_obj, preserve_all_data_layers=True, depsgraph=depsgraph)
        new_mesh.transform(m.matrix_world)
        baked_obj = bpy.data.objects.new(f"{name}_gen_part", new_mesh)
        bpy.context.scene.collection.objects.link(baked_obj)
        baked_meshes.append(baked_obj)

    for o in imported:
        if o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)

    bpy.ops.object.select_all(action="DESELECT")
    for bm in baked_meshes:
        bm.select_set(True)
    bpy.context.view_layer.objects.active = baked_meshes[0]
    if len(baked_meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active

    # Decimate ultra-dense Tripo H3.1 mesh (1.9M polys -> ~50k polys) while preserving UV seams
    poly_count = len(obj.data.polygons)
    if poly_count > 60000:
        ratio = min(1.0, 50000.0 / float(poly_count))
        dec = obj.modifiers.new(name="TripoDecimate", type="DECIMATE")
        dec.ratio = ratio
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=dec.name)
        print(f"[HIGGSFIELD/TRIPO GLB] Decimated {name} from {poly_count} -> {len(obj.data.polygons)} polys")

    verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    xs = [v.x for v in verts]
    ys = [v.y for v in verts]
    zs = [v.z for v in verts]
    min_z, max_z = min(zs), max(zs)
    cur_h = max(0.005, max_z - min_z)
    scale_factor = target_height / cur_h
    cx = (min(xs) + max(xs)) * 0.5
    cy = (min(ys) + max(ys)) * 0.5

    T1 = Matrix.Translation((-cx, -cy, -min_z))
    S = Matrix.Scale(scale_factor, 4)
    # Tripo H3.1 exports characters facing -X (shoulder span along Y > depth span along X); rotate +90 deg around Z to face -Y
    span_x = max(xs) - min(xs)
    span_y = max(ys) - min(ys)
    R_align = Matrix.Rotation(math.radians(-90.0), 4, "Z") if span_y > span_x * 1.15 else Matrix.Identity(4)

    obj.data.transform(R_align @ S @ T1)
    obj.matrix_world = Matrix.Identity(4)
    for poly in obj.data.polygons:
        poly.use_smooth = True

    obj.name = f"{name}_mesh"
    root_empty = L.node(name, loc=loc, rz=rz_deg)
    obj.parent = root_empty
    return root_empty


def apply_mocap_frame(arm_obj, sex="m", mode="walk", frame_idx=12):
    """Apply a realistic human standing pose from motion_tools native mocap cache."""
    for pb in arm_obj.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
        pb.rotation_mode = "QUATERNION"
    bpy.context.view_layer.update()

    native_world = arm_obj.matrix_world.copy()
    world_inverse = native_world.inverted()
    inverse_rotation = native_world.to_quaternion().inverted()
    posebones = list(arm_obj.pose.bones)
    rests = {pb.name: pb.bone.matrix_local.copy() for pb in posebones}
    relatives = {
        pb.name: (rests[pb.parent.name].inverted() @ rests[pb.name] if pb.parent else rests[pb.name])
        for pb in posebones
    }
    inverses = {name: m.inverted() for name, m in relatives.items()}

    source_root, source_rot = (
        _audience_sample(sex, frame_idx, 0.54)
        if mode == "audience"
        else _walk_sample(sex, frame_idx, 288, 0.05)
    )
    rotations = {n: inverse_rotation @ q for n, q in source_rot.items()}

    pose_matrices = {}
    for pb in posebones:
        name = pb.name
        parent_pose = pose_matrices.get(pb.parent.name) if pb.parent else None
        if name not in rotations or not any(w in name for w in BODY_WORDS):
            pose_matrices[name] = parent_pose @ relatives[name] if parent_pose else rests[name].copy()
        else:
            position = (
                parent_pose @ relatives[name].translation
                if parent_pose
                else world_inverse @ source_root
            )
            pose_matrices[name] = Matrix.LocRotScale(position, rotations[name], Vector((1.0, 1.0, 1.0)))

    for pb in posebones:
        name = pb.name
        if name not in source_rot or not any(w in name for w in BODY_WORDS):
            continue
        parent_pose = pose_matrices.get(pb.parent.name) if pb.parent else None
        pose = pose_matrices[name]
        pb.matrix_basis = inverses[name] @ (parent_pose.inverted() @ pose if parent_pose else pose)
    bpy.context.view_layer.update()


def bake_posed_character(
    name,
    folder_name,
    model_name,
    loc,
    rz_deg,
    target_height=1.72,
    clip_name="idle",
    frame_idx=12,
    garment_tint=None,
    hair_multiply=None,
):
    """Import a generated GLB override if present; otherwise pose Rocketbox rigged character with K-Pop Demon Hunters 3D styling."""
    gen_override = try_import_generated_glb(name, loc=loc, rz_deg=rz_deg, target_height=target_height)
    if gen_override is not None:
        return gen_override

    fbx_path = os.path.join(ROCKETBOX_DIR, folder_name, "Export", f"{model_name}.fbx")
    if not os.path.exists(fbx_path):
        raise FileNotFoundError(f"Missing Rocketbox FBX: {fbx_path}")

    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=fbx_path)
    imported = [o for o in bpy.data.objects if o not in before]

    arm_obj = next((o for o in imported if o.type == "ARMATURE"), None)
    meshes = [o for o in imported if o.type == "MESH"]
    is_female = "Female" in folder_name
    resolve_tga_textures(
        meshes,
        folder_name,
        char_name=name,
        is_female=is_female,
        garment_tint=garment_tint,
        hair_multiply=hair_multiply,
    )

    if arm_obj:
        sex = "f" if is_female else "m"
        apply_mocap_frame(arm_obj, sex=sex, mode="walk", frame_idx=frame_idx)

    depsgraph = bpy.context.evaluated_depsgraph_get()
    baked_meshes = []
    for m in meshes:
        eval_obj = m.evaluated_get(depsgraph)
        new_mesh = bpy.data.meshes.new_from_object(eval_obj, preserve_all_data_layers=True, depsgraph=depsgraph)
        new_mesh.transform(m.matrix_world)
        baked_obj = bpy.data.objects.new(f"{name}_part", new_mesh)
        bpy.context.scene.collection.objects.link(baked_obj)
        baked_meshes.append(baked_obj)

    for o in imported:
        if o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)

    bpy.ops.object.select_all(action="DESELECT")
    for bm in baked_meshes:
        bm.select_set(True)
    bpy.context.view_layer.objects.active = baked_meshes[0]
    if len(baked_meshes) > 1:
        bpy.ops.object.join()
    char_obj = bpy.context.view_layer.objects.active
    char_obj.name = f"{name}_mesh"

    # Normalize character height and place feet on floor at (0,0,0) local
    verts = [char_obj.matrix_world @ v.co for v in char_obj.data.vertices]
    min_z = min(v.z for v in verts)
    max_z = max(v.z for v in verts)
    cur_h = max(0.01, max_z - min_z)
    scale_factor = target_height / cur_h

    cx = sum(v.x for v in verts) / len(verts)
    cy = sum(v.y for v in verts) / len(verts)

    T1 = Matrix.Translation((-cx, -cy, -min_z))
    S = Matrix.Scale(scale_factor, 4)
    char_obj.data.transform(S @ T1)
    char_obj.matrix_world = Matrix.Identity(4)

    # Sculpt head geometry to K-Pop Demon Hunters V-line & stylized 3D idol proportions
    _sculpt_kpop_idol_head_geometry(char_obj, target_height=target_height, is_female=is_female)

    # Create parent empty with exact semantic name expected by BackstageScene.tsx
    root_empty = L.node(name, loc=loc, rz=rz_deg)
    char_obj.parent = root_empty
    return root_empty


def _downscale_all_images_for_cloud_run(max_dim=1024):
    """Ensure all embedded textures are <= 1024px so the exported GLB stays well below Cloud Run's 32 MB limit."""
    for img in bpy.data.images:
        try:
            w, h = img.size
            if max(w, h) > max_dim:
                scale = max_dim / float(max(w, h))
                img.scale(max(1, int(w * scale)), max(1, int(h * scale)))
        except Exception:
            pass


def build_scene():
    L.setup(web=True)
    P.init_mats()
    M = P.M

    # Custom warm architectural & stage materials (no neon cyberpunk)
    m_warm_bulb = L.emit("WarmTungstenBulb", (1.0, 0.89, 0.72), 4.5)
    m_warm_strip = L.emit("WarmCoveLED", (1.0, 0.91, 0.76), 2.8)
    m_green_led = L.emit("StatusGreenLED", (0.20, 0.86, 0.48), 3.5)
    m_amber_led = L.emit("StatusAmberLED", (0.98, 0.68, 0.22), 3.5)
    m_stage_sign = L.emit("StageSignWarm", (0.98, 0.82, 0.52), 3.2)
    m_gold_card = L.mat("GoldKeycard", (0.86, 0.71, 0.38), rough=0.18, metal=0.88, Coat_Weight=0.85)
    m_spruce = L.mat("SpruceTop", (0.82, 0.61, 0.36), rough=0.28, Coat_Weight=0.65)
    m_champagne = L.mat("ChampagneMetal", (0.88, 0.83, 0.74), rough=0.16, metal=0.92, Coat_Weight=0.7)
    m_mic_grille = L.mat("MicMeshGrille", (0.76, 0.77, 0.80), rough=0.28, metal=0.95)
    m_starlight_gem = L.emit("StarlightCrystalRing", (1.0, 0.92, 0.78), 3.8)
    m_screen = L.mat("MonitorScreenDark", (0.06, 0.07, 0.09), rough=0.15, metal=0.2, Coat_Weight=0.8)

    # Room dimensions: X from -4.2 to +4.2 (8.4m wide), Y from -3.4 to +3.4 (6.8m deep), Z from 0 to 3.1m
    # Note: In glTF (+Y Up), Blender +Y maps to Three.js -Z!
    # Therefore, putting the Back Wall at Blender Y = +3.4 (+D2) places it at Three.js Z = -3.4,
    # and the open cutaway camera side is at Blender Y = -3.4 (Three.js Z = +3.4)!
    W2 = 4.2
    D2 = 3.4
    H = 3.1

    arch = L.node("backstage_architecture")

    # 1. Floor (Poly Haven Herringbone / Oak Parquet) & Baseboards
    L.box(arch, "FloorOak", (-W2, -D2, -0.06), (W2, D2, 0.0), M.floor, bevel=0.002)
    # Center Woven Area Rug (Poly Haven Wool)
    L.box(arch, "LoungeRug", (-2.3, -1.8, 0.001), (2.3, 1.8, 0.014), M.rug, bevel=0.006)

    # 2. Walls (Back Wall at Y = +D2 -> Three.js Z = -3.4; Left at X = -W2; Right at X = +W2)
    L.box(arch, "WallBackLeft", (-W2, D2, 0.0), (-0.75, D2 + 0.12, H), M.wall, bevel=0.003)
    L.box(arch, "WallBackRight", (0.75, D2, 0.0), (W2, D2 + 0.12, H), M.wall, bevel=0.003)
    L.box(arch, "WallBackHeader", (-0.75, D2, 2.35), (0.75, D2 + 0.12, H), M.wall, bevel=0.003)

    L.box(arch, "WallLeft", (-W2 - 0.12, -D2, 0.0), (-W2, D2, H), M.wall, bevel=0.003)
    L.box(arch, "WallRight", (W2, -D2, 0.0), (W2 + 0.12, D2, H), M.wall, bevel=0.003)

    # Ceiling with recessed cove & warm LED cove strip
    L.box(arch, "CeilingMain", (-W2, -D2, H), (W2, D2, H + 0.12), M.ceil, bevel=0.002)
    L.box(arch, "CeilingCoveLeft", (-W2 + 0.25, -D2 + 0.3, H - 0.04), (-W2 + 0.30, D2 - 0.3, H), m_warm_strip, bevel=0.001)
    L.box(arch, "CeilingCoveRight", (W2 - 0.30, -D2 + 0.3, H - 0.04), (W2 - 0.25, D2 - 0.3, H), m_warm_strip, bevel=0.001)
    L.box(arch, "CeilingCoveBack", (-W2 + 0.3, D2 - 0.30, H - 0.04), (W2 - 0.3, D2 - 0.25, H), m_warm_strip, bevel=0.001)

    # Oak Acoustic Slat Panels along Back Wall (Y = +D2 -> Three.js Z = -3.4)
    for i in range(18):
        x_left = -3.95 + i * 0.16
        if x_left < -0.95:
            L.box(arch, f"OakSlatBL_{i}", (x_left, D2 - 0.035, 0.08), (x_left + 0.09, D2, 2.55), M.oak, bevel=0.003)
        x_right = 0.95 + i * 0.16
        if x_right < 3.95:
            L.box(arch, f"OakSlatBR_{i}", (x_right, D2 - 0.035, 0.08), (x_right + 0.09, D2, 2.55), M.oak, bevel=0.003)

    # Baseboards (Walnut)
    L.box(arch, "BaseboardLeft", (-W2, -D2, 0.0), (-W2 + 0.02, D2, 0.08), M.walnut, bevel=0.002)
    L.box(arch, "BaseboardRight", (W2 - 0.02, -D2, 0.0), (W2, D2, 0.08), M.walnut, bevel=0.002)

    # =========================================================================
    # INTERACTIVE HOTSPOT 1: `vanity_table` (Flush against Left Wall X = -3.80, Y = 0.75 -> Three.js Z = -0.75)
    # With rz = -90.0, local -Y (back) is at X = -4.18 (flush against Left Wall -4.20)
    # and local +Y (front + drawer + stool) faces +X into the room!
    # =========================================================================
    vanity = L.node("vanity_table", loc=(-3.80, 0.75, 0.0), rz=-90.0)
    L.box(vanity, "VanityCabinetL", (-0.85, -0.34, 0.0), (-0.38, 0.32, 0.74), M.walnut, bevel=0.004)
    L.box(vanity, "VanityCabinetR", (0.38, -0.34, 0.0), (0.85, 0.32, 0.74), M.walnut, bevel=0.004)
    L.box(vanity, "VanityCenterApron", (-0.38, -0.32, 0.62), (0.38, 0.32, 0.74), M.walnut, bevel=0.004)
    L.box(vanity, "VanityMarbleTop", (-0.90, -0.38, 0.74), (0.90, 0.38, 0.785), M.marble_c, bevel=0.005)

    # Rigged center vanity drawer (`RIG_vanity_drawer`)
    rig_drawer = L.rig(vanity, "vanity_drawer", "Vanity Center Drawer", "slide", loc=(0.0, 0.33, 0.68), axis=(0, 1, 0), amount=0.24)
    L.box(rig_drawer, "DrawerFront", (-0.36, -0.02, -0.05), (0.36, 0.015, 0.05), M.oak, bevel=0.003)
    L.cyl(rig_drawer, "DrawerHandle", (-0.09, 0.03, 0.0), (0.09, 0.03, 0.0), 0.008, M.brass, segs=16)

    # Rigged left & right vanity cabinet doors (`RIG_vanity_door_L`, `RIG_vanity_door_R`)
    rig_vdoor_l = L.rig(vanity, "vanity_door_L", "Vanity Left Cabinet Door", "hinge", loc=(-0.83, 0.33, 0.37), axis=(0, 0, 1), amount=-1.2)
    L.box(rig_vdoor_l, "VanityDoorPanelL", (0.0, -0.015, -0.33), (0.43, 0.012, 0.33), M.oak, bevel=0.003)
    L.cyl(rig_vdoor_l, "VanityDoorHandleL", (0.38, 0.025, -0.06), (0.38, 0.025, 0.06), 0.007, M.brass, segs=14)

    rig_vdoor_r = L.rig(vanity, "vanity_door_R", "Vanity Right Cabinet Door", "hinge", loc=(0.83, 0.33, 0.37), axis=(0, 0, 1), amount=1.2)
    L.box(rig_vdoor_r, "VanityDoorPanelR", (-0.43, -0.015, -0.33), (0.0, 0.012, 0.33), M.oak, bevel=0.003)
    L.cyl(rig_vdoor_r, "VanityDoorHandleR", (-0.38, 0.025, -0.06), (-0.38, 0.025, 0.06), 0.007, M.brass, segs=14)

    # Brass Hollywood Mirror Frame & 12 Warm Tungsten Bulbs
    L.box(vanity, "MirrorFrame", (-0.76, -0.36, 0.79), (0.76, -0.32, 1.82), M.brass, bevel=0.006)
    L.box(vanity, "MirrorGlass", (-0.70, -0.318, 0.84), (0.70, -0.312, 1.76), M.mirror, bevel=0.001)
    bulb_positions = [
        (-0.73, 0.90), (-0.73, 1.15), (-0.73, 1.40), (-0.73, 1.65),
        (0.73, 0.90), (0.73, 1.15), (0.73, 1.40), (0.73, 1.65),
        (-0.45, 1.79), (-0.15, 1.79), (0.15, 1.79), (0.45, 1.79),
    ]
    for idx, (bx, bz) in enumerate(bulb_positions):
        L.cyl(vanity, f"BulbBase_{idx}", (bx, -0.32, bz), (bx, -0.295, bz), 0.016, M.brass, segs=16)
        L.lathe(
            vanity,
            f"WarmBulb_{idx}",
            [(0.001, 0.0), (0.024, 0.012), (0.028, 0.028), (0.018, 0.044), (0.001, 0.050)],
            m_warm_bulb,
            segs=20,
            loc=(bx, -0.295, bz),
            rot=(math.pi / 2, 0, 0),
        )

    # Cosmetics & Lathed Perfume Bottles on the marble vanity
    L.box(vanity, "CosmeticTray", (-0.68, -0.10, 0.785), (-0.32, 0.16, 0.802), M.brass, bevel=0.003)
    L.lathe(
        vanity,
        "PerfumeBottle1",
        [(0.0, 0.0), (0.035, 0.0), (0.038, 0.07), (0.014, 0.09), (0.014, 0.11), (0.022, 0.115), (0.0, 0.115)],
        M.glass,
        segs=24,
        loc=(-0.54, 0.02, 0.802),
    )
    L.lathe(
        vanity,
        "PerfumeBottle2",
        [(0.0, 0.0), (0.028, 0.0), (0.028, 0.09), (0.010, 0.105), (0.016, 0.125), (0.0, 0.125)],
        M.amber if hasattr(M, "amber") else M.brass,
        segs=24,
        loc=(-0.42, 0.05, 0.802),
    )
    # Upholstered Boucle Vanity Stool
    L.softbox(vanity, "VanityStoolCushion", (0.46, 0.36, 0.10), M.boucle, r=0.04, crown=0.015, loc=(0.0, 0.55, 0.38))
    for sx, sy in ((-0.18, 0.42), (0.18, 0.42), (-0.18, 0.68), (0.18, 0.68)):
        L.cyl(vanity, f"StoolLeg_{sx}_{sy}", (sx, sy, 0.0), (sx, sy, 0.38), 0.016, M.brass, segs=16)

    # =========================================================================
    # INTERACTIVE HOTSPOT 2: `access_card` (On Vanity Marble Countertop)
    # =========================================================================
    card_node = L.node("access_card", loc=(-3.58, 0.35, 0.788), rz=-65.0)
    L.box(card_node, "VIPCardHolder", (-0.075, -0.050, 0.0), (0.075, 0.050, 0.008), M.black, bevel=0.002)
    L.box(card_node, "VIPGoldCard", (-0.068, -0.044, 0.006), (0.068, 0.044, 0.014), m_gold_card, bevel=0.002)
    L.box(card_node, "VIPCardRFIDChip", (-0.045, -0.012, 0.014), (-0.022, 0.012, 0.0165), m_champagne, bevel=0.001)
    L.box(card_node, "VIPCardBadgeGlow", (-0.055, -0.030, 0.014), (0.055, -0.018, 0.017), m_warm_bulb, bevel=0.001)
    L.pipe(
        card_node,
        "VIPLanyardRibbon",
        [(0.0, 0.05, 0.008), (0.04, 0.14, 0.004), (0.09, 0.19, 0.004), (0.02, 0.24, 0.004), (0.0, 0.05, 0.008)],
        0.005,
        M.brass,
        bend=0.03,
        closed=False,
    )

    # =========================================================================
    # INTERACTIVE HOTSPOT 3: `equipment_locker` (Right Wall X = 3.65, Y = 1.35 -> Three.js Z = -1.35)
    # With rz = 112.0, local -Y (back) sits against the Right Wall (+X) and local +Y (glass door + RFID)
    # faces into the room (-X) and slightly toward the front camera (-Y)!
    # =========================================================================
    locker = L.node("equipment_locker", loc=(3.65, 1.35, 0.0), rz=112.0)
    L.box(locker, "LockerOuterShell", (-0.48, -0.34, 0.0), (0.48, 0.34, 1.88), M.black, bevel=0.005)
    L.box(locker, "LockerWalnutSurround", (-0.50, -0.35, 0.04), (0.50, 0.32, 1.86), M.walnut, bevel=0.004)
    L.box(locker, "LockerInteriorCavity", (-0.42, -0.28, 0.12), (0.42, 0.28, 1.76), M.leather_d, bevel=0.002)
    L.box(locker, "LockerShelfMid", (-0.42, -0.26, 0.94), (0.42, 0.26, 0.97), M.steel, bevel=0.002)
    L.box(locker, "LockerShelfUpper", (-0.42, -0.26, 1.38), (0.42, 0.26, 1.41), M.steel, bevel=0.002)
    L.box(locker, "RFIDReaderBox", (0.37, 0.32, 1.05), (0.46, 0.365, 1.24), M.black, bevel=0.003)
    L.box(locker, "RFIDStatusLED", (0.39, 0.363, 1.19), (0.44, 0.369, 1.215), m_green_led, bevel=0.001)
    # Rigged glass-inlaid locker door (`RIG_locker_door`)
    rig_locker = L.rig(locker, "locker_door", "Equipment Locker Door", "hinge", loc=(-0.44, 0.33, 0.96), rz=-24.0, axis=(0, 0, 1), amount=-1.4)
    L.box(rig_locker, "LockerDoorFrame", (0.0, -0.02, -0.82), (0.78, 0.015, 0.82), M.steel, bevel=0.004)
    L.box(rig_locker, "LockerDoorGlass", (0.08, -0.01, -0.72), (0.70, 0.008, 0.72), M.glass, bevel=0.001)
    L.cyl(rig_locker, "LockerDoorHandle", (0.72, 0.03, -0.14), (0.72, 0.03, 0.14), 0.010, M.brass, segs=16)

    # =========================================================================
    # INTERACTIVE HOTSPOT 4: `microphone` (Starlight Custom Vocal Mic inside Locker Cradle)
    # =========================================================================
    mic_node = L.node("microphone", loc=(3.62, 1.33, 1.00), rz=112.0)
    L.box(mic_node, "MicCradleBase", (-0.15, -0.11, -0.04), (0.15, 0.11, 0.022), M.black, bevel=0.005)
    L.box(mic_node, "MicCradleVelvetInlay", (-0.12, -0.08, 0.018), (0.12, 0.08, 0.028), M.leather_d, bevel=0.003)
    L.lathe(
        mic_node,
        "StarlightMicBody",
        [
            (0.0, 0.0),
            (0.016, 0.0),
            (0.017, 0.035),
            (0.019, 0.135),
            (0.023, 0.172),
            (0.026, 0.188),
            (0.0, 0.190),
        ],
        m_champagne,
        segs=32,
        loc=(0.0, 0.0, 0.025),
    )
    L.lathe(
        mic_node,
        "StarlightMicCapsuleGrille",
        [
            (0.0, 0.188),
            (0.027, 0.188),
            (0.035, 0.205),
            (0.036, 0.238),
            (0.026, 0.268),
            (0.0, 0.276),
        ],
        m_mic_grille,
        segs=32,
        loc=(0.0, 0.0, 0.025),
    )
    L.cyl(mic_node, "MicStarlightCrystalRing", (0.0, 0.0, 0.208), (0.0, 0.0, 0.218), 0.0285, m_starlight_gem, segs=28)
    L.box(mic_node, "MicOLEDStatusDisplay", (-0.006, 0.017, 0.115), (0.006, 0.020, 0.152), m_amber_led, bevel=0.001)

    # =========================================================================
    # INTERACTIVE HOTSPOT 5: `acoustic_guitar` (Front-Right Lounge Corner, X = 2.95, Y = -1.25 -> Three.js Z = +1.25)
    # =========================================================================
    guitar_node = L.node("acoustic_guitar", loc=(2.95, -1.25, 0.0), rz=140.0)
    L.pipe(
        guitar_node,
        "GuitarStandFrame",
        [(-0.20, 0.22, 0.01), (-0.12, 0.0, 0.01), (0.0, -0.18, 0.56), (0.12, 0.0, 0.01), (0.20, 0.22, 0.01)],
        0.012,
        M.black,
        bend=0.03,
    )
    g_body = L.node("GuitarBodyGroup", parent=guitar_node, loc=(0.0, 0.02, 0.14))
    g_body.rotation_euler = Euler((math.radians(14.0), 0.0, 0.0), "XYZ")
    L.cyl(g_body, "GuitarLowerBout", (0.0, -0.05, 0.18), (0.0, 0.05, 0.18), 0.21, m_spruce, segs=36, bevel=0.008)
    L.cyl(g_body, "GuitarUpperBout", (0.0, -0.048, 0.40), (0.0, 0.048, 0.40), 0.155, m_spruce, segs=36, bevel=0.008)
    L.cyl(g_body, "GuitarRosetteRing", (0.0, 0.047, 0.32), (0.0, 0.051, 0.32), 0.068, M.brass, segs=28)
    L.cyl(g_body, "GuitarSoundhole", (0.0, 0.048, 0.32), (0.0, 0.053, 0.32), 0.055, M.black, segs=24)
    L.box(g_body, "GuitarBridge", (-0.07, 0.048, 0.17), (0.07, 0.056, 0.20), M.walnut, bevel=0.002)
    L.box(g_body, "GuitarNeck", (-0.026, 0.01, 0.50), (0.026, 0.045, 0.98), M.walnut, bevel=0.003)
    L.box(g_body, "GuitarHeadstock", (-0.038, 0.005, 0.98), (0.038, 0.042, 1.12), M.walnut, bevel=0.003)

    # =========================================================================
    # INTERACTIVE HOTSPOT 6: `audio_rack` (Flush against Back-Right Wall, X = 2.05, Y = 2.98 -> Three.js Z = -2.98)
    # With rz = 180.0, local -Y (back) sits at Y = 3.36 against the Back Wall (3.40),
    # and local +Y (credenza doors + monitor screen) faces -Y into the room toward the camera!
    # =========================================================================
    rack = L.node("audio_rack", loc=(2.05, 2.98, 0.0), rz=180.0)
    L.box(rack, "AudioDeskCredenza", (-0.68, -0.36, 0.0), (0.68, 0.34, 0.78), M.walnut, bevel=0.005)
    L.box(rack, "AudioDeskTop", (-0.72, -0.38, 0.78), (0.72, 0.38, 0.82), M.marble_d, bevel=0.004)
    L.box(rack, "MixerUnit", (-0.42, -0.18, 0.82), (0.42, 0.24, 0.94), M.black, bevel=0.004)

    # Rigged audio credenza doors (`RIG_audio_rack_door_L`, `RIG_audio_rack_door_R`)
    rig_adoor_l = L.rig(rack, "audio_rack_door_L", "Audio Credenza Left Door", "hinge", loc=(-0.66, 0.35, 0.39), axis=(0, 0, 1), amount=-1.25)
    L.box(rig_adoor_l, "AudioDoorPanelL", (0.0, -0.015, -0.35), (0.64, 0.012, 0.35), M.oak, bevel=0.003)
    L.cyl(rig_adoor_l, "AudioDoorHandleL", (0.58, 0.025, -0.07), (0.58, 0.025, 0.07), 0.008, M.brass, segs=14)

    rig_adoor_r = L.rig(rack, "audio_rack_door_R", "Audio Credenza Right Door", "hinge", loc=(0.66, 0.35, 0.39), axis=(0, 0, 1), amount=1.25)
    L.box(rig_adoor_r, "AudioDoorPanelR", (-0.64, -0.015, -0.35), (0.0, 0.012, 0.35), M.oak, bevel=0.003)
    L.cyl(rig_adoor_r, "AudioDoorHandleR", (-0.58, 0.025, -0.07), (-0.58, 0.025, 0.07), 0.008, M.brass, segs=14)

    # Wall Broadcast Monitor above Mixing Credenza (facing +Y local -> into the room)
    L.box(rack, "MonitorFrame", (-0.58, -0.34, 1.28), (0.58, -0.28, 1.94), M.black, bevel=0.004)
    L.box(rack, "MonitorPanel", (-0.54, -0.282, 1.32), (0.54, -0.275, 1.90), m_screen, bevel=0.001)
    L.box(rack, "MonitorTimerBar", (-0.46, -0.274, 1.76), (0.12, -0.270, 1.83), m_amber_led, bevel=0.001)
    L.box(rack, "MonitorSignalBar", (-0.46, -0.274, 1.66), (0.34, -0.270, 1.71), m_green_led, bevel=0.001)

    # =========================================================================
    # INTERACTIVE HOTSPOT 7: `stage_door` (Center Back Wall, X = 0.0, Y = 3.35 -> Three.js Z = -3.35)
    # With rz = 180.0, local +Y (On-Air sign & brass push bars) faces into the room toward the camera!
    # Both double doors are rigged (`RIG_stage_door` & `RIG_stage_door_R`).
    # =========================================================================
    sdoor = L.node("stage_door", loc=(0.0, 3.35, 0.0), rz=180.0)
    L.box(sdoor, "StageDoorFrameL", (-0.82, -0.10, 0.0), (-0.70, 0.10, 2.42), M.bronze, bevel=0.004)
    L.box(sdoor, "StageDoorFrameR", (0.70, -0.10, 0.0), (0.82, 0.10, 2.42), M.bronze, bevel=0.004)
    L.box(sdoor, "StageDoorHeader", (-0.82, -0.10, 2.32), (0.82, 0.10, 2.46), M.bronze, bevel=0.004)
    L.box(sdoor, "OnAirHousing", (-0.48, 0.04, 2.50), (0.48, 0.14, 2.74), M.black, bevel=0.004)
    L.box(sdoor, "OnAirSignGlow", (-0.44, 0.138, 2.53), (0.44, 0.146, 2.71), m_stage_sign, bevel=0.002)

    rig_sdoor_l = L.rig(sdoor, "stage_door", "Stage Entrance Door Left", "hinge", loc=(-0.70, 0.0, 1.16), axis=(0, 0, 1), amount=1.45)
    L.box(rig_sdoor_l, "StageDoorLeafL", (0.0, -0.045, -1.15), (0.695, 0.045, 1.15), M.walnut, bevel=0.005)
    L.box(rig_sdoor_l, "StageDoorWindowL", (0.20, -0.05, 0.20), (0.50, 0.05, 0.72), M.glass, bevel=0.002)
    L.cyl(rig_sdoor_l, "StagePushBarL", (0.08, 0.07, -0.10), (0.62, 0.07, -0.10), 0.016, M.brass, segs=18)

    rig_sdoor_r = L.rig(sdoor, "stage_door_R", "Stage Entrance Door Right", "hinge", loc=(0.70, 0.0, 1.16), axis=(0, 0, 1), amount=-1.45)
    L.box(rig_sdoor_r, "StageDoorLeafR", (-0.695, -0.045, -1.15), (0.0, 0.045, 1.15), M.walnut, bevel=0.005)
    L.box(rig_sdoor_r, "StageDoorWindowR", (-0.50, -0.05, 0.20), (-0.20, 0.05, 0.72), M.glass, bevel=0.002)
    L.cyl(rig_sdoor_r, "StagePushBarR", (-0.62, 0.07, -0.10), (-0.08, 0.07, -0.10), 0.016, M.brass, segs=18)

    # =========================================================================
    # LOUNGE FURNITURE & REAL POLY HAVEN 3D MODELS (`apartment-vr-tour`)
    # Arranged on the Right-Front / Center-Right lounge zone so the center aisle & front view are 100% open!
    # =========================================================================
    lounge = L.node("backstage_lounge_furniture")
    sofa = L.node("LoungeSofa", parent=lounge, loc=(2.25, -0.45, 0.0), rz=120.0)
    L.box(sofa, "SofaPlinth", (-1.05, -0.45, 0.0), (1.05, 0.45, 0.12), M.walnut, bevel=0.004)
    L.softbox(sofa, "SofaSeatL", (1.00, 0.82, 0.28), M.boucle, r=0.06, crown=0.02, loc=(-0.51, 0.0, 0.12))
    L.softbox(sofa, "SofaSeatR", (1.00, 0.82, 0.28), M.boucle, r=0.06, crown=0.02, loc=(0.51, 0.0, 0.12))
    L.softbox(sofa, "SofaBackrest", (2.06, 0.24, 0.48), M.boucle, r=0.06, crown=0.02, loc=(0.0, -0.33, 0.36))
    L.softbox(sofa, "SofaArmL", (0.20, 0.88, 0.46), M.boucle, r=0.05, crown=0.015, loc=(-1.04, 0.0, 0.12))
    L.softbox(sofa, "SofaArmR", (0.20, 0.88, 0.46), M.boucle, r=0.05, crown=0.015, loc=(1.04, 0.0, 0.12))

    # Marble Coffee Table in front of the Lounge Sofa (X = 1.05, Y = -0.15 -> Three.js Z = +0.15)
    L.cyl(lounge, "CoffeeTableBase", (1.05, -0.15, 0.0), (1.05, -0.15, 0.34), 0.32, M.walnut, segs=32, bevel=0.004)
    L.cyl(lounge, "CoffeeTableTop", (1.05, -0.15, 0.34), (1.05, -0.15, 0.38), 0.56, M.marble, segs=36, bevel=0.005)

    # Convert procedural curves/modifiers to meshes BEFORE importing Poly Haven glTFs and Rocketbox characters
    L.finalize()

    # Place real Poly Haven 3D glTF assets (furniture, plants, instruments, studio audio gear)
    L.model(lounge, "mid_century_lounge_chair", name="LoungeAccentChair", loc=(0.95, 1.05, 0.0), rz=-155.0, height=0.82)
    L.model(lounge, "potted_plant_02", name="BackstagePlantLeft", loc=(-3.55, 2.75, 0.0), rz=-35.0, height=1.25)
    L.model(lounge, "potted_plant_04", name="BackstagePlantRight", loc=(3.60, 2.75, 0.0), rz=35.0, height=1.15)
    L.model(lounge, "ceramic_vase_03", name="CoffeeTableVase", loc=(0.95, -0.20, 0.38), rz=0.0, height=0.26)
    L.model(lounge, "book_encyclopedia_set_01", name="CoffeeTableBooks", loc=(1.22, -0.08, 0.38), rz=35.0, height=0.16)
    # Real scanned 1K PBR instrument & audio equipment props
    L.model(guitar_node, "Ukulele_01", name="CompanionAcousticInstrument", loc=(-0.24, 0.12, 0.01), rz=18.0, height=0.68)
    L.model(rack, "boombox", name="StudioMonitorDeck", loc=(-0.48, 0.02, 0.82), rz=12.0, height=0.22)
    L.model(locker, "cassette_player", name="InEarMonitorPack", loc=(0.12, 0.0, 1.41), rz=-15.0, height=0.14)

    # Also allow external generated GLB overrides for props if present in `assets/models/generated/`
    try_import_generated_glb("microphone_override", loc=(3.62, 1.33, 1.02), rz_deg=112.0, target_height=0.26)
    try_import_generated_glb("acoustic_guitar_override", loc=(2.95, -1.25, 0.02), rz_deg=140.0, target_height=1.02)

    # =========================================================================
    # K-POP DEMON HUNTERS 3D IDOL & BACKSTAGE CAST
    # Note: At rz_deg = 0.0, Rocketbox characters face -Y_blender (+Z_three, straight toward the front camera!).
    # =========================================================================
    # 1. `hana_character` — K-POP Lead Vocalist Hana near the vanity table, facing three-quarters toward camera & center
    bake_posed_character(
        name="hana_character",
        folder_name="Female_Party_02",
        model_name="Female_Party_02_facial",
        loc=(-1.95, 0.55, 0.0),
        rz_deg=28.0,
        target_height=1.68,
        clip_name="talk",
        frame_idx=18,
        garment_tint=(0.98, 0.88, 0.94),
        hair_multiply=(0.82, 0.68, 0.62),
    )

    # 2. `jiho_character` — Stage Director Jiho near the audio rack & equipment locker, facing three-quarters toward camera & center
    bake_posed_character(
        name="jiho_character",
        folder_name="Male_Adult_10",
        model_name="Male_Adult_10_facial",
        loc=(1.55, 1.85, 0.0),
        rz_deg=-26.0,
        target_height=1.78,
        clip_name="idle",
        frame_idx=14,
        garment_tint=(0.22, 0.24, 0.28),
    )

    # 3. `protagonist_character` — The Player / Road Manager standing on the left-center rug facing Hana & camera
    bake_posed_character(
        name="protagonist_character",
        folder_name="Male_Adult_09",
        model_name="Male_Adult_09_facial",
        loc=(-0.65, -0.65, 0.0),
        rz_deg=-18.0,
        target_height=1.79,
        clip_name="idle",
        frame_idx=8,
    )

    # =========================================================================
    # DOWNSCALE IMAGES & EXPORT GLB (<15 MB for Cloud Run) + RENDER PREVIEW
    # =========================================================================
    _downscale_all_images_for_cloud_run(max_dim=1024)
    os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)
    try:
        bpy.ops.export_scene.gltf(
            filepath=GLB_OUT,
            export_format="GLB",
            export_apply=True,
            export_texcoords=True,
            export_normals=True,
            export_materials="EXPORT",
            export_image_format="JPEG",
            export_image_quality=86,
            export_cameras=False,
            export_lights=False,
        )
    except TypeError:
        bpy.ops.export_scene.gltf(
            filepath=GLB_OUT,
            export_format="GLB",
            export_apply=True,
            export_texcoords=True,
            export_normals=True,
            export_materials="EXPORT",
            export_image_format="JPEG",
            export_cameras=False,
            export_lights=False,
        )
    # Ensure top-level texture["source"] is present alongside EXT_texture_webp for three-stdlib GLTFLoader
    import struct, json
    with open(GLB_OUT, "rb") as _f:
        _glb_data = _f.read()
    _magic, _ver, _ = struct.unpack_from("<III", _glb_data, 0)
    _jlen, _jtype = struct.unpack_from("<II", _glb_data, 12)
    _gltf = json.loads(_glb_data[20:20 + _jlen].decode("utf-8"))
    for _tex in _gltf.get("textures", []):
        _ext = _tex.get("extensions", {}).get("EXT_texture_webp")
        if _ext and "source" in _ext and "source" not in _tex:
            _tex["source"] = _ext["source"]
    if "extensionsRequired" in _gltf and "EXT_texture_webp" in _gltf["extensionsRequired"]:
        _gltf["extensionsRequired"] = [e for e in _gltf["extensionsRequired"] if e != "EXT_texture_webp"]
        if not _gltf["extensionsRequired"]:
            del _gltf["extensionsRequired"]
    _new_jbytes = json.dumps(_gltf, separators=(",", ":")).encode("utf-8")
    _new_jbytes += b" " * ((4 - (len(_new_jbytes) % 4)) % 4)
    _rest = _glb_data[20 + _jlen:]
    _out = struct.pack("<III", _magic, _ver, 20 + len(_new_jbytes) + len(_rest)) + struct.pack("<II", len(_new_jbytes), _jtype) + _new_jbytes + _rest
    with open(GLB_OUT, "wb") as _f:
        _f.write(_out)
    print(f"[SUCCESS] Exported GLB -> {GLB_OUT} ({os.path.getsize(GLB_OUT) / (1024*1024):.2f} MB)")

    # Setup warm studio lighting & Human Eye-Level camera for preview verification
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x = 1440
    sc.render.resolution_y = 900
    sc.render.filepath = PREVIEW_OUT

    world = bpy.data.worlds.new("WarmStudioWorld")
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.14, 0.12, 0.10, 1.0)
        bg.inputs[1].default_value = 1.15

    for lx, ly, lz, energy in ((-1.8, 0.8, 2.85, 220.0), (1.8, 1.2, 2.85, 220.0), (0.0, -1.5, 2.85, 190.0)):
        ld = bpy.data.lights.new(f"WarmArea_{lx}", "AREA")
        ld.energy = energy
        ld.color = (1.0, 0.93, 0.84)
        ld.size = 1.8
        lo = bpy.data.objects.new(f"WarmArea_{lx}", ld)
        sc.collection.objects.link(lo)
        lo.location = (lx, ly, lz)

    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 28
    cam_obj = bpy.data.objects.new("PreviewCam", cam_data)
    sc.collection.objects.link(cam_obj)
    # Human eye-level (Z=1.68m) stepped back at Y=-5.15m looking into the room (+Y)
    cam_obj.location = (0.0, -5.15, 1.68)
    direction = Vector((0.0, 0.85, 1.25)) - cam_obj.location
    cam_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam_obj

    os.makedirs(os.path.dirname(PREVIEW_OUT), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print(f"[SUCCESS] Rendered preview -> {PREVIEW_OUT}")


if __name__ == "__main__":
    build_scene()
