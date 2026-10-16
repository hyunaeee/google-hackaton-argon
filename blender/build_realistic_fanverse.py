"""
Build the realistic FANVERSE VIP Backstage Green Room & Realistic Human Cast
strictly using the user's two skills:
1. `.agents/skills/apartment-vr-tour` (`ps_lib.py` & `ps_parts.py` + Poly Haven CC0 PBR textures & 3D glTF models)
2. `.agents/skills/blender-realistic-people` (Microsoft Rocketbox rigged human FBX + native mocap cache + appearance tuning)

Warm, realistic architectural interior tone (NO cyberpunk purple/neon).
Exports `/Users/hyunaeee/Desktop/google-hackaton/client/public/models/backstage_room.glb`
and renders `/Users/hyunaeee/Desktop/google-hackaton/assets/references/blender_skill_v3_preview.png`.
"""
import gzip
import math
import os
import pickle
import sys
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

ROOT_DIR = "/Users/hyunaeee/Desktop/google-hackaton"
APT_UNITS_DIR = os.path.join(ROOT_DIR, ".agents/skills/apartment-vr-tour/scripts/units")
PEOPLE_RUNTIME_DIR = os.path.join(ROOT_DIR, ".agents/skills/blender-realistic-people/assets/runtime")
ROCKETBOX_DIR = os.path.join(ROOT_DIR, "blender/rocketbox_assets")
GLB_OUT = os.path.join(ROOT_DIR, "client/public/models/backstage_room.glb")
PREVIEW_OUT = os.path.join(ROOT_DIR, "assets/references/blender_skill_v3_preview.png")

for p in (APT_UNITS_DIR, PEOPLE_RUNTIME_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

from pathlib import Path
import ps_lib as L
import ps_parts as P
from motion_tools import BODY_WORDS, _audience_sample, _walk_sample


def _load_tga_image(path, noncolor=False):
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = "Non-Color" if noncolor else "sRGB"
    return image


def _build_rocketbox_material(old_mat, texture_dir: Path):
    base = old_mat.name.split(".")[0]
    name = "Rocketbox_" + base
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
    bsdf.inputs["Roughness"].default_value = 0.58
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.28

    colorpath = texture_dir / f"{base}_color.tga"
    if colorpath.exists():
        tex = nodes.new("ShaderNodeTexImage")
        tex.location = (-620, 260)
        tex.image = _load_tga_image(colorpath, False)
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if "_opacity" in base:
            links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
            if hasattr(mat, "surface_render_method"):
                mat.surface_render_method = "DITHERED"
            bsdf.inputs["Roughness"].default_value = 0.62

    if "_head" in base:
        if "Subsurface Weight" in bsdf.inputs:
            bsdf.inputs["Subsurface Weight"].default_value = 0.065
        bsdf.inputs["Roughness"].default_value = 0.47

    normalpath = texture_dir / f"{base}_normal.tga"
    if normalpath.exists():
        normtex = nodes.new("ShaderNodeTexImage")
        normtex.location = (-620, -100)
        normtex.image = _load_tga_image(normalpath, True)
        normal = nodes.new("ShaderNodeNormalMap")
        normal.location = (110, -100)
        normal.inputs["Strength"].default_value = 0.5 if "_head" in base else 0.7
        links.new(normtex.outputs["Color"], normal.inputs["Color"])
        links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def resolve_tga_textures(meshes, folder_name: str):
    """Bind 2048px Rocketbox TGA textures from `<folder_name>/Textures/`."""
    tex_dir = Path(ROCKETBOX_DIR) / folder_name / "Textures"
    for mesh in meshes:
        if mesh.type != "MESH":
            continue
        for poly in mesh.data.polygons:
            poly.use_smooth = True
        for slot in mesh.material_slots:
            if slot.material:
                slot.material = _build_rocketbox_material(slot.material, tex_dir)


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


def bake_posed_character(name, folder_name, model_name, loc, rz_deg, target_height=1.72, clip_name="idle", frame_idx=12, extra_bones=None):
    """Import a Rocketbox rigged character, pose via mocap cache, and bake into a named mesh node."""
    fbx_path = os.path.join(ROCKETBOX_DIR, folder_name, "Export", f"{model_name}.fbx")
    if not os.path.exists(fbx_path):
        raise FileNotFoundError(f"Missing Rocketbox FBX: {fbx_path}")

    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=fbx_path)
    imported = [o for o in bpy.data.objects if o not in before]

    arm_obj = next((o for o in imported if o.type == "ARMATURE"), None)
    meshes = [o for o in imported if o.type == "MESH"]
    resolve_tga_textures(meshes, folder_name)

    if arm_obj:
        sex = "f" if "Female" in folder_name else "m"
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
    char_obj.name = name

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

    # Create parent empty with exact semantic name expected by BackstageScene.tsx
    root_empty = L.node(name, loc=loc, rz=rz_deg)
    char_obj.name = f"{name}_mesh"
    char_obj.parent = root_empty
    return root_empty


def build_scene():
    L.setup(web=True)
    P.init_mats()
    M = P.M

    # Custom warm architectural materials (no neon cyberpunk)
    m_warm_bulb = L.emit("WarmTungstenBulb", (1.0, 0.89, 0.72), 4.5)
    m_warm_strip = L.emit("WarmCoveLED", (1.0, 0.91, 0.76), 2.8)
    m_green_led = L.emit("StatusGreenLED", (0.20, 0.86, 0.48), 3.5)
    m_amber_led = L.emit("StatusAmberLED", (0.98, 0.68, 0.22), 3.5)
    m_stage_sign = L.emit("StageSignWarm", (0.98, 0.82, 0.52), 3.2)
    m_gold_card = L.mat("GoldKeycard", (0.86, 0.71, 0.38), rough=0.22, metal=0.85, Coat_Weight=0.8)
    m_spruce = L.mat("SpruceTop", (0.82, 0.61, 0.36), rough=0.32, Coat_Weight=0.6)
    m_champagne = L.mat("ChampagneMetal", (0.86, 0.82, 0.75), rough=0.20, metal=0.90)
    m_screen = L.emit("MonitorScreen", (0.16, 0.22, 0.28), 1.4)

    # Room dimensions: X from -4.2 to +4.2 (8.4m wide), Y from -3.4 to +3.4 (6.8m deep), Z from 0 to 3.1m
    W2 = 4.2
    D2 = 3.4
    H = 3.1

    arch = L.node("backstage_architecture")

    # 1. Floor (Poly Haven Herringbone / Oak Parquet) & Baseboards
    L.box(arch, "FloorOak", (-W2, -D2, -0.06), (W2, D2, 0.0), M.floor, bevel=0.002)
    # Center Woven Area Rug (Poly Haven Wool)
    L.box(arch, "LoungeRug", (-2.1, -1.5, 0.001), (2.1, 1.4, 0.014), M.rug, bevel=0.006)

    # 2. Walls (Poly Haven Warm Plaster + Architectural Oak Acoustic Slat Wainscoting)
    # Back wall (Y = -D2) with doorway opening X in [-0.75, +0.75], Z in [0, 2.35]
    L.box(arch, "WallBackLeft", (-W2, -D2 - 0.12, 0.0), (-0.75, -D2, H), M.wall, bevel=0.003)
    L.box(arch, "WallBackRight", (0.75, -D2 - 0.12, 0.0), (W2, -D2, H), M.wall, bevel=0.003)
    L.box(arch, "WallBackHeader", (-0.75, -D2 - 0.12, 2.35), (0.75, -D2, H), M.wall, bevel=0.003)

    # Left wall (X = -W2) & Right wall (X = +W2)
    L.box(arch, "WallLeft", (-W2 - 0.12, -D2, 0.0), (-W2, D2, H), M.wall, bevel=0.003)
    L.box(arch, "WallRight", (W2, -D2, 0.0), (W2 + 0.12, D2, H), M.wall, bevel=0.003)

    # Ceiling with recessed cove & warm LED cove strip
    L.box(arch, "CeilingMain", (-W2, -D2, H), (W2, D2, H + 0.12), M.ceil, bevel=0.002)
    L.box(arch, "CeilingCoveLeft", (-W2 + 0.25, -D2 + 0.3, H - 0.04), (-W2 + 0.30, D2 - 0.3, H), m_warm_strip, bevel=0.001)
    L.box(arch, "CeilingCoveRight", (W2 - 0.30, -D2 + 0.3, H - 0.04), (W2 - 0.25, D2 - 0.3, H), m_warm_strip, bevel=0.001)
    L.box(arch, "CeilingCoveBack", (-W2 + 0.3, -D2 + 0.25, H - 0.04), (W2 - 0.3, -D2 + 0.30, H), m_warm_strip, bevel=0.001)

    # Oak Acoustic Slat Panels along back wall & side walls
    for i in range(18):
        x_left = -3.95 + i * 0.16
        if x_left < -0.95:
            L.box(arch, f"OakSlatBL_{i}", (x_left, -D2, 0.08), (x_left + 0.09, -D2 + 0.035, 2.55), M.oak, bevel=0.003)
        x_right = 0.95 + i * 0.16
        if x_right < 3.95:
            L.box(arch, f"OakSlatBR_{i}", (x_right, -D2, 0.08), (x_right + 0.09, -D2 + 0.035, 2.55), M.oak, bevel=0.003)

    # Baseboards (Walnut)
    L.box(arch, "BaseboardLeft", (-W2, -D2, 0.0), (-W2 + 0.02, D2, 0.08), M.walnut, bevel=0.002)
    L.box(arch, "BaseboardRight", (W2 - 0.02, -D2, 0.0), (W2, D2, 0.08), M.walnut, bevel=0.002)

    # =========================================================================
    # INTERACTIVE HOTSPOT 1: `vanity_table` (Left Wall, X = -2.95, Y = -0.75)
    # =========================================================================
    vanity = L.node("vanity_table", loc=(-2.95, -0.75, 0.0), rz=-90.0)
    # Walnut cabinetry base + Cream Marble slab top
    L.box(vanity, "VanityCabinet", (-0.85, -0.34, 0.0), (-0.38, 0.34, 0.74), M.walnut, bevel=0.004)
    L.box(vanity, "VanityCabinetR", (0.38, -0.34, 0.0), (0.85, 0.34, 0.74), M.walnut, bevel=0.004)
    L.box(vanity, "VanityCenterApron", (-0.38, -0.32, 0.62), (0.38, 0.32, 0.74), M.walnut, bevel=0.004)
    L.box(vanity, "VanityMarbleTop", (-0.90, -0.38, 0.74), (0.90, 0.38, 0.785), M.marble_c, bevel=0.005)

    # Rigged vanity drawer (`RIG_vanity_drawer`)
    rig_drawer = L.rig(vanity, "vanity_drawer", "Vanity Drawer", "slide", loc=(0.0, 0.33, 0.68), axis=(0, 1, 0), amount=0.24)
    L.box(rig_drawer, "DrawerFront", (-0.36, -0.02, -0.05), (0.36, 0.01, 0.05), M.oak, bevel=0.003)
    L.cyl(rig_drawer, "DrawerHandle", (-0.09, 0.025, 0.0), (0.09, 0.025, 0.0), 0.008, M.brass, segs=16)

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
    card_node = L.node("access_card", loc=(-2.72, -0.32, 0.79), rz=28.0)
    L.box(card_node, "VIPCardHolder", (-0.075, -0.050, 0.0), (0.075, 0.050, 0.008), M.black, bevel=0.002)
    L.box(card_node, "VIPGoldCard", (-0.068, -0.044, 0.006), (0.068, 0.044, 0.014), m_gold_card, bevel=0.002)
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
    # INTERACTIVE HOTSPOT 3: `equipment_locker` (Right Side, X = 2.65, Y = -1.65)
    # =========================================================================
    locker = L.node("equipment_locker", loc=(2.65, -1.65, 0.0), rz=-25.0)
    # Dark brushed-steel & walnut studio security cabinet
    L.box(locker, "LockerOuterShell", (-0.48, -0.34, 0.0), (0.48, 0.34, 1.88), M.black, bevel=0.005)
    L.box(locker, "LockerWalnutSurround", (-0.50, -0.35, 0.04), (0.50, 0.32, 1.86), M.walnut, bevel=0.004)
    L.box(locker, "LockerInteriorCavity", (-0.42, -0.28, 0.12), (0.42, 0.28, 1.76), M.leather_d, bevel=0.002)
    L.box(locker, "LockerShelfMid", (-0.42, -0.26, 0.94), (0.42, 0.26, 0.97), M.steel, bevel=0.002)
    L.box(locker, "LockerShelfUpper", (-0.42, -0.26, 1.38), (0.42, 0.26, 1.41), M.steel, bevel=0.002)
    # RFID Reader Module on right stiles
    L.box(locker, "RFIDReaderBox", (0.37, 0.32, 1.05), (0.46, 0.365, 1.24), M.black, bevel=0.003)
    L.box(locker, "RFIDStatusLED", (0.39, 0.363, 1.19), (0.44, 0.369, 1.215), m_green_led, bevel=0.001)
    # Rigged glass-inlaid locker door (`RIG_locker_door`, slightly ajar so microphone inside is visible)
    rig_locker = L.rig(locker, "locker_door", "Equipment Locker Door", "hinge", loc=(-0.44, 0.33, 0.96), rz=-38.0, axis=(0, 0, 1), amount=-1.4)
    L.box(rig_locker, "LockerDoorFrame", (0.0, -0.02, -0.82), (0.78, 0.015, 0.82), M.steel, bevel=0.004)
    L.box(rig_locker, "LockerDoorGlass", (0.08, -0.01, -0.72), (0.70, 0.008, 0.72), M.glass, bevel=0.001)
    L.cyl(rig_locker, "LockerDoorHandle", (0.72, 0.03, -0.14), (0.72, 0.03, 0.14), 0.010, M.brass, segs=16)

    # =========================================================================
    # INTERACTIVE HOTSPOT 4: `microphone` (Custom Wireless Vocal Mic at Locker Cradle)
    # =========================================================================
    mic_node = L.node("microphone", loc=(2.62, -1.58, 1.02), rz=-25.0)
    # Foam-lined presentation cradle + Lathed Champagne-Silver Custom Wireless Microphone
    L.box(mic_node, "MicCradleBase", (-0.14, -0.10, -0.04), (0.14, 0.10, 0.02), M.black, bevel=0.004)
    L.lathe(
        mic_node,
        "StarlightMicBody",
        [
            (0.0, 0.0),
            (0.017, 0.0),
            (0.019, 0.14),
            (0.024, 0.175),
            (0.032, 0.195),
            (0.034, 0.235),
            (0.024, 0.265),
            (0.0, 0.272),
        ],
        m_champagne,
        segs=28,
        loc=(0.0, 0.0, 0.02),
    )
    L.cyl(mic_node, "MicBrassRing", (0.0, 0.0, 0.192), (0.0, 0.0, 0.202), 0.027, M.brass, segs=24)

    # =========================================================================
    # INTERACTIVE HOTSPOT 5: `acoustic_guitar` (Beside Lounge Sofa, X = 1.85, Y = 0.85)
    # =========================================================================
    guitar_node = L.node("acoustic_guitar", loc=(1.85, 0.85, 0.0), rz=-135.0)
    # Tubular metal A-frame guitar stand
    L.pipe(
        guitar_node,
        "GuitarStandFrame",
        [(-0.20, 0.22, 0.01), (-0.12, 0.0, 0.01), (0.0, -0.18, 0.56), (0.12, 0.0, 0.01), (0.20, 0.22, 0.01)],
        0.012,
        M.black,
        bend=0.03,
    )
    # Realistic figure-8 acoustic guitar body + neck + headstock
    g_body = L.node("GuitarBodyGroup", parent=guitar_node, loc=(0.0, 0.02, 0.14))
    g_body.rotation_euler = Euler((math.radians(14.0), 0.0, 0.0), "XYZ")
    L.cyl(g_body, "GuitarLowerBout", (0.0, -0.05, 0.18), (0.0, 0.05, 0.18), 0.21, m_spruce, segs=32, bevel=0.008)
    L.cyl(g_body, "GuitarUpperBout", (0.0, -0.048, 0.40), (0.0, 0.048, 0.40), 0.155, m_spruce, segs=32, bevel=0.008)
    L.cyl(g_body, "GuitarSoundhole", (0.0, 0.048, 0.32), (0.0, 0.053, 0.32), 0.055, M.black, segs=24)
    L.box(g_body, "GuitarBridge", (-0.07, 0.048, 0.17), (0.07, 0.056, 0.20), M.walnut, bevel=0.002)
    L.box(g_body, "GuitarNeck", (-0.026, 0.01, 0.50), (0.026, 0.045, 0.98), M.walnut, bevel=0.003)
    L.box(g_body, "GuitarHeadstock", (-0.038, 0.005, 0.98), (0.038, 0.042, 1.12), M.walnut, bevel=0.003)

    # =========================================================================
    # INTERACTIVE HOTSPOT 6: `audio_rack` (Back-Right Mixing Console, X = 1.65, Y = -2.75)
    # =========================================================================
    rack = L.node("audio_rack", loc=(1.65, -2.75, 0.0), rz=0.0)
    L.box(rack, "AudioDeskCredenza", (-0.68, -0.36, 0.0), (0.68, 0.36, 0.78), M.walnut, bevel=0.005)
    L.box(rack, "AudioDeskTop", (-0.72, -0.38, 0.78), (0.72, 0.38, 0.82), M.marble_d, bevel=0.004)
    L.box(rack, "MixerUnit", (-0.42, -0.22, 0.82), (0.42, 0.22, 0.94), M.black, bevel=0.004)
    # Wall monitor display above audio rack
    L.box(rack, "MonitorFrame", (-0.58, -0.34, 1.28), (0.58, -0.29, 1.94), M.black, bevel=0.004)
    L.box(rack, "MonitorPanel", (-0.54, -0.289, 1.32), (0.54, -0.285, 1.90), m_screen, bevel=0.001)
    L.box(rack, "MonitorTimerBar", (-0.46, -0.284, 1.76), (0.12, -0.281, 1.83), m_amber_led, bevel=0.001)

    # =========================================================================
    # INTERACTIVE HOTSPOT 7: `stage_door` (Center Back Wall, X = 0.0, Y = -3.35)
    # =========================================================================
    sdoor = L.node("stage_door", loc=(0.0, -3.35, 0.0), rz=0.0)
    # Heavy brushed-bronze portal frame + Illuminated Warm ON AIR sign
    L.box(sdoor, "StageDoorFrameL", (-0.82, -0.10, 0.0), (-0.70, 0.10, 2.42), M.bronze, bevel=0.004)
    L.box(sdoor, "StageDoorFrameR", (0.70, -0.10, 0.0), (0.82, 0.10, 2.42), M.bronze, bevel=0.004)
    L.box(sdoor, "StageDoorHeader", (-0.82, -0.10, 2.32), (0.82, 0.10, 2.46), M.bronze, bevel=0.004)
    L.box(sdoor, "OnAirHousing", (-0.48, 0.04, 2.50), (0.48, 0.14, 2.74), M.black, bevel=0.004)
    L.box(sdoor, "OnAirSignGlow", (-0.44, 0.138, 2.53), (0.44, 0.146, 2.71), m_stage_sign, bevel=0.002)

    # Rigged double soundproof doors (`RIG_stage_door`)
    rig_sdoor = L.rig(sdoor, "stage_door", "Stage Entrance Door", "hinge", loc=(-0.70, 0.0, 1.16), axis=(0, 0, 1), amount=1.45)
    L.box(rig_sdoor, "StageDoorLeafL", (0.0, -0.045, -1.15), (0.695, 0.045, 1.15), M.walnut, bevel=0.005)
    L.box(rig_sdoor, "StageDoorWindowL", (0.20, -0.05, 0.20), (0.50, 0.05, 0.72), M.glass, bevel=0.002)
    L.cyl(rig_sdoor, "StagePushBarL", (0.08, 0.07, -0.10), (0.62, 0.07, -0.10), 0.016, M.brass, segs=18)

    L.box(sdoor, "StageDoorLeafR", (0.005, -0.045, 0.01), (0.70, 0.045, 2.31), M.walnut, bevel=0.005)
    L.box(sdoor, "StageDoorWindowR", (0.20, -0.05, 1.36), (0.50, 0.05, 1.88), M.glass, bevel=0.002)
    L.cyl(sdoor, "StagePushBarR", (0.08, 0.07, 1.06), (0.62, 0.07, 1.06), 0.016, M.brass, segs=18)

    # =========================================================================
    # LOUNGE FURNITURE & REAL POLY HAVEN 3D MODELS (`apartment-vr-tour`)
    # =========================================================================
    lounge = L.node("backstage_lounge_furniture")
    # Upholstered Boucle Sofa in center-right lounge area (X = 0.25, Y = 0.95)
    sofa = L.node("LoungeSofa", parent=lounge, loc=(0.25, 0.95, 0.0), rz=180.0)
    L.box(sofa, "SofaPlinth", (-1.05, -0.45, 0.0), (1.05, 0.45, 0.12), M.walnut, bevel=0.004)
    L.softbox(sofa, "SofaSeatL", (1.00, 0.82, 0.28), M.boucle, r=0.06, crown=0.02, loc=(-0.51, 0.0, 0.12))
    L.softbox(sofa, "SofaSeatR", (1.00, 0.82, 0.28), M.boucle, r=0.06, crown=0.02, loc=(0.51, 0.0, 0.12))
    L.softbox(sofa, "SofaBackrest", (2.06, 0.24, 0.48), M.boucle, r=0.06, crown=0.02, loc=(0.0, -0.33, 0.36))
    L.softbox(sofa, "SofaArmL", (0.20, 0.88, 0.46), M.boucle, r=0.05, crown=0.015, loc=(-1.04, 0.0, 0.12))
    L.softbox(sofa, "SofaArmR", (0.20, 0.88, 0.46), M.boucle, r=0.05, crown=0.015, loc=(1.04, 0.0, 0.12))

    # Marble & Walnut Coffee Table in front of sofa (X = 0.25, Y = 0.0)
    L.cyl(lounge, "CoffeeTableBase", (0.25, 0.0, 0.0), (0.25, 0.0, 0.34), 0.32, M.walnut, segs=32, bevel=0.004)
    L.cyl(lounge, "CoffeeTableTop", (0.25, 0.0, 0.34), (0.25, 0.0, 0.38), 0.56, M.marble, segs=36, bevel=0.005)

    # Convert procedural curves/modifiers to meshes BEFORE importing Poly Haven glTFs and Rocketbox characters
    L.finalize()

    # Place real Poly Haven 3D glTF assets from `.agents/skills/apartment-vr-tour/scripts/units/models/`
    L.model(lounge, "mid_century_lounge_chair", name="LoungeAccentChair", loc=(-1.35, 0.65, 0.0), rz=135.0, height=0.82)
    L.model(lounge, "potted_plant_02", name="BackstagePlantLeft", loc=(-3.45, -2.65, 0.0), rz=25.0, height=1.25)
    L.model(lounge, "potted_plant_04", name="BackstagePlantRight", loc=(3.45, 1.95, 0.0), rz=-40.0, height=1.15)
    L.model(lounge, "ceramic_vase_03", name="CoffeeTableVase", loc=(0.15, -0.05, 0.38), rz=0.0, height=0.26)
    L.model(lounge, "book_encyclopedia_set_01", name="CoffeeTableBooks", loc=(0.42, 0.08, 0.38), rz=35.0, height=0.16)

    # =========================================================================
    # REALISTIC HUMAN CHARACTERS (`blender-realistic-people` Rocketbox + Mocap)
    # =========================================================================
    # 1. `hana_character` — Lead Vocalist Hana near the vanity table, facing the Protagonist
    bake_posed_character(
        name="hana_character",
        folder_name="Female_Adult_03",
        model_name="Female_Adult_03_facial",
        loc=(-1.75, -0.65, 0.0),
        rz_deg=115.0,
        target_height=1.66,
        clip_name="talk",
        frame_idx=18,
    )

    # 2. `jiho_character` — Stage Director Jiho near the audio rack & stage door
    bake_posed_character(
        name="jiho_character",
        folder_name="Male_Adult_10",
        model_name="Male_Adult_10_facial",
        loc=(1.35, -2.05, 0.0),
        rz_deg=-25.0,
        target_height=1.77,
        clip_name="idle",
        frame_idx=14,
    )

    # 3. `protagonist_character` — The Player / Road Manager standing in the room facing Hana & stage door
    bake_posed_character(
        name="protagonist_character",
        folder_name="Male_Adult_09",
        model_name="Male_Adult_09_facial",
        loc=(-0.45, 0.35, 0.0),
        rz_deg=-35.0,
        target_height=1.78,
        clip_name="idle",
        frame_idx=8,
    )

    # =========================================================================
    # EXPORT GLB & RENDER PREVIEW
    # =========================================================================
    os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format="GLB",
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    print(f"[SUCCESS] Exported GLB -> {GLB_OUT} ({os.path.getsize(GLB_OUT) / (1024*1024):.2f} MB)")

    # Setup warm studio lighting & camera for preview verification
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
        bg.inputs[1].default_value = 1.1

    for lx, ly, lz, energy in ((-1.8, -0.8, 2.85, 220.0), (1.8, -1.2, 2.85, 220.0), (0.0, 1.5, 2.85, 180.0)):
        ld = bpy.data.lights.new(f"WarmArea_{lx}", "AREA")
        ld.energy = energy
        ld.color = (1.0, 0.93, 0.84)
        ld.size = 1.8
        lo = bpy.data.objects.new(f"WarmArea_{lx}", ld)
        sc.collection.objects.link(lo)
        lo.location = (lx, ly, lz)

    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 26
    cam_obj = bpy.data.objects.new("PreviewCam", cam_data)
    sc.collection.objects.link(cam_obj)
    cam_obj.location = (0.15, 2.95, 1.65)
    direction = Vector((-0.25, -1.1, 1.05)) - cam_obj.location
    cam_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam_obj

    os.makedirs(os.path.dirname(PREVIEW_OUT), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print(f"[SUCCESS] Rendered preview -> {PREVIEW_OUT}")


if __name__ == "__main__":
    build_scene()
