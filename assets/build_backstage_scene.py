import bpy
import bmesh
import math

# Clear existing objects
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 1280
scene.render.resolution_y = 800

# World dark studio background
world = bpy.data.worlds.new("BackstageWorld")
scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs[0].default_value = (0.025, 0.015, 0.045, 1.0)
    bg_node.inputs[1].default_value = 0.8

def make_mat(name, base_color, metallic=0.0, roughness=0.4, emission_color=None, emission_strength=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission_color and emission_strength > 0:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = (*emission_color, 1.0)
            elif "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = (*emission_color, 1.0)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
        if alpha < 1.0 and "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
    return mat

# Palette matching Nano Banana Pro reference sheets
MAT_FLOOR = make_mat("FloorDarkCarpet", (0.06, 0.05, 0.08), metallic=0.1, roughness=0.85)
MAT_WALL_DARK = make_mat("WallDarkFrame", (0.08, 0.07, 0.11), metallic=0.3, roughness=0.6)
MAT_ACOUSTIC_FOAM = make_mat("AcousticFoam", (0.11, 0.09, 0.15), metallic=0.05, roughness=0.9)
MAT_GUNMETAL = make_mat("GunmetalBrush", (0.16, 0.16, 0.20), metallic=0.85, roughness=0.32)
MAT_DARK_METAL = make_mat("DarkMetal", (0.09, 0.09, 0.12), metallic=0.8, roughness=0.28)
MAT_CHROME = make_mat("MirrorChrome", (0.92, 0.94, 0.98), metallic=0.98, roughness=0.05)
MAT_ROSE_GOLD = make_mat("RoseGold", (0.88, 0.58, 0.62), metallic=0.92, roughness=0.18)
MAT_PEARL_LILAC = make_mat("PearlLilac", (0.76, 0.58, 0.92), metallic=0.65, roughness=0.22)
MAT_MAGENTA_TRIM = make_mat("MagentaAnodized", (0.78, 0.15, 0.58), metallic=0.75, roughness=0.25)
MAT_VELVET_PURPLE = make_mat("VelvetPurple", (0.28, 0.07, 0.24), metallic=0.05, roughness=0.88)
MAT_NEON_MAGENTA = make_mat("NeonMagenta", (1.0, 0.15, 0.65), metallic=0.1, roughness=0.2, emission_color=(1.0, 0.15, 0.65), emission_strength=6.0)
MAT_NEON_CYAN = make_mat("NeonCyan", (0.05, 0.92, 1.0), metallic=0.1, roughness=0.2, emission_color=(0.05, 0.92, 1.0), emission_strength=6.0)
MAT_BULB_WARM = make_mat("HollywoodBulb", (1.0, 0.93, 0.80), metallic=0.0, roughness=0.1, emission_color=(1.0, 0.88, 0.68), emission_strength=8.0)
MAT_LED_GREEN = make_mat("LedGreen", (0.1, 1.0, 0.4), metallic=0.1, roughness=0.2, emission_color=(0.1, 1.0, 0.4), emission_strength=5.0)
MAT_ACRYLIC = make_mat("AcrylicClear", (0.85, 0.90, 0.98), metallic=0.1, roughness=0.1, alpha=0.45)
MAT_SKIN = make_mat("StylizedSkin", (0.95, 0.80, 0.76), metallic=0.0, roughness=0.55)
MAT_HAIR_PURPLE = make_mat("HairPastelPurple", (0.62, 0.38, 0.88), metallic=0.15, roughness=0.45)
MAT_STAGE_OUTFIT = make_mat("HanaStageOutfit", (0.72, 0.62, 0.96), metallic=0.7, roughness=0.2, emission_color=(0.45, 0.25, 0.85), emission_strength=0.4)
MAT_CREW_BLACK = make_mat("CrewBlack", (0.07, 0.07, 0.09), metallic=0.15, roughness=0.7)
MAT_WOOD_SPRUCE = make_mat("GuitarSpruce", (0.72, 0.46, 0.24), metallic=0.05, roughness=0.35)
MAT_WOOD_MAHOGANY = make_mat("GuitarMahogany", (0.32, 0.14, 0.08), metallic=0.1, roughness=0.4)

def add_box(parts, name, center, size, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=center)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier="Bevel")
    obj.data.materials.append(mat)
    parts.append(obj)
    return obj

def add_cyl(parts, name, center, radius, depth, mat, rot=(0, 0, 0), vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=center, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(mat)
    parts.append(obj)
    return obj

def add_sphere(parts, name, center, radius, mat, segments=16, ring_count=12, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=ring_count, radius=radius, location=center)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    parts.append(obj)
    return obj

def add_torus(parts, name, center, major_r, minor_r, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_r, minor_radius=minor_r, major_segments=28, minor_segments=12, location=center, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(mat)
    parts.append(obj)
    return obj

def join_parts(parts, final_name):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = final_name
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    return obj

# ==============================================================================
# 1. ROOM FLOOR PLATFORM (z: 0.00 .. 0.06)
# ==============================================================================
floor_parts = []
add_box(floor_parts, "floor_base", (0.0, 0.0, 0.03), (6.0, 5.8, 0.06), MAT_FLOOR, bevel=0.005)
# Perimeter neon strips embedded at z=0.055 (within 0.00..0.06)
add_box(floor_parts, "floor_neon_left", (-2.96, -0.8, 0.055), (0.04, 3.8, 0.01), MAT_NEON_MAGENTA)
add_box(floor_parts, "floor_neon_back", (-1.6, 2.86, 0.055), (2.4, 0.04, 0.01), MAT_NEON_CYAN)
add_box(floor_parts, "floor_neon_right", (2.96, 0.8, 0.055), (0.04, 3.8, 0.01), MAT_NEON_CYAN)
join_parts(floor_parts, "room_floor")

# ==============================================================================
# 2. LEFT ACOUSTIC WALL (x: -3.22 .. -3.02, y: -2.85 .. 2.85, z: 0.07 .. 2.85)
# ==============================================================================
wall_l_parts = []
add_box(wall_l_parts, "wall_l_core", (-3.15, 0.0, 1.46), (0.14, 5.7, 2.78), MAT_WALL_DARK, bevel=0.01)
add_box(wall_l_parts, "wall_l_cornice", (-3.05, 0.0, 2.79), (0.06, 5.6, 0.05), MAT_NEON_MAGENTA)
# 3D acoustic foam tiles grid on left wall
for iy in range(8):
    for iz in range(4):
        yc = -2.4 + iy * 0.68
        zc = 0.45 + iz * 0.56
        add_box(wall_l_parts, f"foam_l_{iy}_{iz}", (-3.05, yc, zc), (0.05, 0.58, 0.48), MAT_ACOUSTIC_FOAM, bevel=0.015)
join_parts(wall_l_parts, "wall_left")

# ==============================================================================
# 3. BACK ACOUSTIC WALL (x: -2.95 .. 2.95, y: 2.95 .. 3.15, z: 0.07 .. 2.85)
# ==============================================================================
wall_b_parts = []
add_box(wall_b_parts, "wall_b_core", (0.0, 3.07, 1.46), (5.9, 0.14, 2.78), MAT_WALL_DARK, bevel=0.01)
add_box(wall_b_parts, "wall_b_cornice_l", (-1.5, 2.98, 2.79), (2.8, 0.05, 0.05), MAT_NEON_CYAN)
add_box(wall_b_parts, "wall_b_cornice_r", (1.5, 2.98, 2.79), (2.8, 0.05, 0.05), MAT_NEON_MAGENTA)
for ix in [-2.4, -1.7, -1.05, 1.05, 1.7, 2.4]:
    for iz in range(4):
        zc = 0.45 + iz * 0.56
        add_box(wall_b_parts, f"foam_b_{ix}_{iz}", (ix, 2.98, zc), (0.56, 0.05, 0.48), MAT_ACOUSTIC_FOAM, bevel=0.015)
join_parts(wall_b_parts, "wall_back")

# ==============================================================================
# 4. STAGE DOOR (x: -0.72 .. 0.72, y: 2.70 .. 2.92, z: 0.07 .. 2.68)
# Matches interactive_props_sheet.png: heavy soundproof door + porthole + crash bar + STAGE / ON AIR neon sign
# ==============================================================================
door_parts = []
# Outer heavy frame
add_box(door_parts, "door_frame_l", (-0.66, 2.82, 1.15), (0.10, 0.16, 2.16), MAT_GUNMETAL, bevel=0.01)
add_box(door_parts, "door_frame_r", (0.66, 2.82, 1.15), (0.10, 0.16, 2.16), MAT_GUNMETAL, bevel=0.01)
add_box(door_parts, "door_frame_t", (0.0, 2.82, 2.19), (1.42, 0.16, 0.10), MAT_GUNMETAL, bevel=0.01)
# Magenta anodized accent trim
add_box(door_parts, "door_trim_l", (-0.70, 2.80, 1.15), (0.02, 0.18, 2.18), MAT_MAGENTA_TRIM)
add_box(door_parts, "door_trim_r", (0.70, 2.80, 1.15), (0.02, 0.18, 2.18), MAT_MAGENTA_TRIM)
# Soundproof door slab
add_box(door_parts, "door_slab", (0.0, 2.84, 1.12), (1.22, 0.08, 2.08), MAT_DARK_METAL, bevel=0.008)
add_box(door_parts, "door_kickplate", (0.0, 2.79, 0.24), (1.14, 0.02, 0.30), MAT_GUNMETAL, bevel=0.004)
# Circular porthole window + glowing concert laser glass
add_torus(door_parts, "porthole_rim", (0.0, 2.78, 1.52), 0.24, 0.035, MAT_CHROME, rot=(math.pi/2, 0, 0))
add_cyl(door_parts, "porthole_glass", (0.0, 2.80, 1.52), 0.22, 0.02, MAT_NEON_CYAN, rot=(math.pi/2, 0, 0))
# Stainless steel panic crash bar
add_box(door_parts, "crash_mount_l", (-0.46, 2.76, 1.02), (0.08, 0.08, 0.14), MAT_CHROME, bevel=0.01)
add_box(door_parts, "crash_mount_r", (0.46, 2.76, 1.02), (0.08, 0.08, 0.14), MAT_CHROME, bevel=0.01)
add_cyl(door_parts, "crash_bar", (0.0, 2.72, 1.02), 0.022, 0.94, MAT_CHROME, rot=(0, math.pi/2, 0))
# Top marquee sign box "STAGE / ON AIR"
add_box(door_parts, "marquee_housing", (0.0, 2.80, 2.46), (1.38, 0.16, 0.34), MAT_GUNMETAL, bevel=0.03)
add_box(door_parts, "marquee_face", (0.0, 2.72, 2.46), (1.30, 0.02, 0.26), MAT_DARK_METAL)
add_box(door_parts, "marquee_neon_cyan", (-0.32, 2.71, 2.46), (0.56, 0.02, 0.14), MAT_NEON_CYAN, bevel=0.01)
add_box(door_parts, "marquee_neon_pink", (0.32, 2.71, 2.46), (0.56, 0.02, 0.14), MAT_NEON_MAGENTA, bevel=0.01)
join_parts(door_parts, "stage_door")

# ==============================================================================
# 5. VANITY TABLE DESK & CHAIR (x: -2.92 .. -1.92, y: -1.75 .. 0.15, z: 0.07 .. 0.78)
# ==============================================================================
vanity_parts = []
# Sled legs left & right
add_box(vanity_parts, "vanity_leg_f_l", (-2.85, -1.68, 0.41), (0.05, 0.05, 0.68), MAT_GUNMETAL)
add_box(vanity_parts, "vanity_leg_f_r", (-2.00, -1.68, 0.41), (0.05, 0.05, 0.68), MAT_GUNMETAL)
add_box(vanity_parts, "vanity_leg_f_bot", (-2.42, -1.68, 0.09), (0.90, 0.05, 0.04), MAT_GUNMETAL)
add_box(vanity_parts, "vanity_leg_b_l", (-2.85, 0.08, 0.41), (0.05, 0.05, 0.68), MAT_GUNMETAL)
add_box(vanity_parts, "vanity_leg_b_r", (-2.00, 0.08, 0.41), (0.05, 0.05, 0.68), MAT_GUNMETAL)
add_box(vanity_parts, "vanity_leg_b_bot", (-2.42, 0.08, 0.09), (0.90, 0.05, 0.04), MAT_GUNMETAL)
# Tabletop & drawers
add_box(vanity_parts, "vanity_top", (-2.42, -0.80, 0.74), (0.94, 1.86, 0.08), MAT_DARK_METAL, bevel=0.015)
add_box(vanity_parts, "vanity_led_edge", (-1.94, -0.80, 0.75), (0.02, 1.84, 0.025), MAT_NEON_MAGENTA)
add_box(vanity_parts, "vanity_drawer_1", (-2.42, -1.25, 0.65), (0.86, 0.82, 0.10), MAT_GUNMETAL, bevel=0.008)
add_box(vanity_parts, "vanity_drawer_2", (-2.42, -0.35, 0.65), (0.86, 0.82, 0.10), MAT_GUNMETAL, bevel=0.008)
add_box(vanity_parts, "drawer_handle_1", (-1.97, -1.25, 0.65), (0.03, 0.22, 0.02), MAT_ROSE_GOLD)
add_box(vanity_parts, "drawer_handle_2", (-1.97, -0.35, 0.65), (0.03, 0.22, 0.02), MAT_ROSE_GOLD)
join_parts(vanity_parts, "vanity_table")

# ==============================================================================
# 6. HOLLYWOOD VANITY MIRROR & COSMETICS (x: -2.92 .. -2.42, y: -1.68 .. 0.08, z: 0.79 .. 1.85)
# Zero AABB overlap with access_card (which sits at x: -2.32 .. -1.96, z: 0.79 .. 0.85)
# ==============================================================================
mirror_parts = []
# Mirror stand neck
add_box(mirror_parts, "mirror_stand", (-2.74, -0.80, 0.84), (0.08, 0.26, 0.10), MAT_GUNMETAL, bevel=0.01)
# Circular rose-gold mirror backing & reflective glass
add_cyl(mirror_parts, "mirror_backing", (-2.74, -0.80, 1.34), 0.48, 0.05, MAT_ROSE_GOLD, rot=(0, math.pi/2, 0), vertices=36)
add_cyl(mirror_parts, "mirror_glass", (-2.71, -0.80, 1.34), 0.42, 0.02, MAT_CHROME, rot=(0, math.pi/2, 0), vertices=36)
# 16 glowing warm-white Hollywood bulbs around perimeter
for i in range(16):
    angle = (2.0 * math.pi * i) / 16.0
    by = -0.80 + 0.45 * math.cos(angle)
    bz = 1.34 + 0.45 * math.sin(angle)
    add_sphere(mirror_parts, f"hollywood_bulb_{i}", (-2.68, by, bz), 0.032, MAT_BULB_WARM, segments=12, ring_count=8)
# Acrylic cosmetic organizer & beauty props at y: -1.55 .. -1.20, x: -2.78 .. -2.48
add_box(mirror_parts, "acrylic_tray", (-2.62, -1.42, 0.84), (0.24, 0.34, 0.09), MAT_ACRYLIC, bevel=0.005)
add_cyl(mirror_parts, "brush_holder", (-2.62, -1.50, 0.90), 0.04, 0.12, MAT_GUNMETAL)
for b_idx, dy in enumerate([-0.02, 0.0, 0.02]):
    add_cyl(mirror_parts, f"makeup_brush_{b_idx}", (-2.62 + dy, -1.50 + dy, 0.98), 0.008, 0.14, MAT_ROSE_GOLD)
# Perfume bottles on right side of mirror
add_box(mirror_parts, "perfume_bottle_1", (-2.60, -0.18, 0.85), (0.08, 0.08, 0.11), MAT_NEON_MAGENTA, bevel=0.01)
add_cyl(mirror_parts, "perfume_cap_1", (-2.60, -0.18, 0.92), 0.02, 0.03, MAT_ROSE_GOLD)
add_cyl(mirror_parts, "perfume_bottle_2", (-2.58, -0.04, 0.85), 0.045, 0.11, MAT_NEON_CYAN)
add_cyl(mirror_parts, "lipstick_tube", (-2.52, -0.32, 0.83), 0.018, 0.08, MAT_ROSE_GOLD)
join_parts(mirror_parts, "vanity_mirror")

# ==============================================================================
# 7. VIP STAFF ACCESS CARD (x: -2.32 .. -1.98, y: -0.32 .. 0.04, z: 0.79 .. 0.84)
# Holographic glowing badge resting on front-right corner of vanity_table
# ==============================================================================
card_parts = []
add_box(card_parts, "card_holo_border", (-2.15, -0.14, 0.802), (0.22, 0.15, 0.014), MAT_NEON_CYAN, bevel=0.004)
add_box(card_parts, "card_inner_core", (-2.15, -0.14, 0.808), (0.18, 0.11, 0.010), MAT_NEON_MAGENTA, bevel=0.002)
add_box(card_parts, "card_metal_clip", (-2.28, -0.14, 0.808), (0.06, 0.04, 0.018), MAT_CHROME, bevel=0.003)
join_parts(card_parts, "access_card")

# ==============================================================================
# 8. EQUIPMENT LOCKER (x: 1.75 .. 2.82, y: 0.55 .. 1.75, z: 0.07 .. 1.68)
# Tour flight-case cabinet with magenta anodized extrusions, RFID reader, audio rack units, hinged foam door
# ==============================================================================
locker_parts = []
# Main flight-case shell (back, left, right, top, bottom + 3 shelves)
add_box(locker_parts, "locker_back", (2.52, 1.15, 0.87), (0.06, 0.96, 1.56), MAT_GUNMETAL)
add_box(locker_parts, "locker_side_l", (2.18, 1.61, 0.87), (0.68, 0.06, 1.56), MAT_GUNMETAL)
add_box(locker_parts, "locker_side_r", (2.18, 0.69, 0.87), (0.68, 0.06, 1.56), MAT_GUNMETAL)
add_box(locker_parts, "locker_top", (2.18, 1.15, 1.63), (0.68, 0.96, 0.06), MAT_GUNMETAL)
add_box(locker_parts, "locker_bot", (2.18, 1.15, 0.11), (0.68, 0.96, 0.08), MAT_GUNMETAL)
# Magenta anodized flight-case edge extrusions
add_box(locker_parts, "extrusion_fl", (1.84, 1.62, 0.87), (0.05, 0.05, 1.58), MAT_MAGENTA_TRIM, bevel=0.005)
add_box(locker_parts, "extrusion_fr", (1.84, 0.68, 0.87), (0.05, 0.05, 1.58), MAT_MAGENTA_TRIM, bevel=0.005)
add_box(locker_parts, "extrusion_ft", (1.84, 1.15, 1.65), (0.05, 0.98, 0.05), MAT_MAGENTA_TRIM, bevel=0.005)
add_box(locker_parts, "extrusion_fb", (1.84, 1.15, 0.09), (0.05, 0.98, 0.05), MAT_MAGENTA_TRIM, bevel=0.005)
# Chrome ball corners
for cx in [1.83, 2.53]:
    for cy in [0.67, 1.63]:
        for cz in [0.09, 1.65]:
            add_sphere(locker_parts, f"corner_{cx}_{cy}_{cz}", (cx, cy, cz), 0.038, MAT_CHROME, segments=10, ring_count=8)
# Electronic RFID scanner module on front-left post
add_box(locker_parts, "rfid_housing", (1.80, 1.62, 0.95), (0.04, 0.09, 0.22), MAT_DARK_METAL, bevel=0.005)
add_box(locker_parts, "rfid_led", (1.78, 1.62, 0.98), (0.015, 0.06, 0.08), MAT_LED_GREEN)
# Interior shelves & wireless audio rack units
for sz in [0.48, 0.86, 1.24]:
    add_box(locker_parts, f"shelf_{sz}", (2.18, 1.15, sz), (0.62, 0.88, 0.03), MAT_DARK_METAL)
# Top shelf wireless receiver unit
add_box(locker_parts, "receiver_top", (2.18, 1.15, 1.34), (0.42, 0.72, 0.14), MAT_DARK_METAL, bevel=0.008)
add_box(locker_parts, "receiver_oled", (1.96, 1.15, 1.35), (0.02, 0.48, 0.05), MAT_LED_GREEN)
# Bottom shelf coiled XLR cables
add_torus(locker_parts, "xlr_coil_1", (2.15, 0.95, 0.18), 0.12, 0.025, MAT_MAGENTA_TRIM)
add_torus(locker_parts, "xlr_coil_2", (2.15, 1.32, 0.18), 0.12, 0.025, MAT_DARK_METAL)
# Slightly ajar flight-case door with acoustic foam interior
add_box(locker_parts, "locker_door_panel", (1.79, 0.62, 0.87), (0.05, 0.86, 1.50), MAT_GUNMETAL, bevel=0.008)
add_box(locker_parts, "locker_door_foam", (1.82, 0.62, 0.87), (0.03, 0.78, 1.40), MAT_ACOUSTIC_FOAM)
join_parts(locker_parts, "equipment_locker")

# ==============================================================================
# 9. CUSTOM LUMINA WIRELESS MICROPHONE & CRADLE (x: 1.92 .. 2.48, y: 0.90 .. 1.40, z: 1.70 .. 1.98)
# Matches interactive_props_sheet.png: beveled cradle base + pearl-lilac mic + rose-gold mesh + crystal rings
# Zero AABB overlap with equipment_locker (z: 1.70 > 1.68)
# ==============================================================================
mic_parts = []
# Beveled stadium cradle base
add_box(mic_parts, "mic_cradle_base", (2.18, 1.15, 1.74), (0.38, 0.22, 0.07), MAT_GUNMETAL, bevel=0.025)
add_box(mic_parts, "mic_cradle_rim", (2.18, 1.15, 1.78), (0.34, 0.18, 0.02), MAT_ROSE_GOLD, bevel=0.01)
# Pearl-lilac microphone body (angled slightly upward)
add_cyl(mic_parts, "mic_handle", (2.22, 1.15, 1.84), 0.034, 0.24, MAT_PEARL_LILAC, rot=(0, math.pi/2 - 0.18, 0))
add_cyl(mic_parts, "mic_tail_cap", (2.34, 1.15, 1.82), 0.026, 0.04, MAT_ROSE_GOLD, rot=(0, math.pi/2 - 0.18, 0))
# Sparkling crystal collar rings
add_torus(mic_parts, "mic_crystal_ring_1", (2.10, 1.15, 1.86), 0.042, 0.008, MAT_CHROME, rot=(0, math.pi/2 - 0.18, 0))
add_torus(mic_parts, "mic_crystal_ring_2", (2.07, 1.15, 1.87), 0.048, 0.008, MAT_NEON_MAGENTA, rot=(0, math.pi/2 - 0.18, 0))
# Rose-gold mesh grille sphere
add_sphere(mic_parts, "mic_grille", (2.02, 1.15, 1.88), 0.052, MAT_ROSE_GOLD, segments=20, ring_count=14)
join_parts(mic_parts, "microphone")

# ==============================================================================
# 10. HANA — LEAD VOCALIST NPC (x: -1.48 .. -0.92, y: -1.05 .. -0.45, z: 0.07 .. 1.68)
# Stylized K-POP lead vocalist in shimmering lilac/silver stage outfit & space buns
# ==============================================================================
hana_parts = []
# Stage boots & legs
add_cyl(hana_parts, "hana_boot_l", (-1.20, -0.84, 0.28), 0.055, 0.40, MAT_CHROME)
add_cyl(hana_parts, "hana_boot_r", (-1.20, -0.66, 0.28), 0.055, 0.40, MAT_CHROME)
add_cyl(hana_parts, "hana_leg_l", (-1.20, -0.84, 0.62), 0.052, 0.32, MAT_SKIN)
add_cyl(hana_parts, "hana_leg_r", (-1.20, -0.66, 0.62), 0.052, 0.32, MAT_SKIN)
# Pleated holographic stage skirt & torso jacket
add_cyl(hana_parts, "hana_skirt", (-1.20, -0.75, 0.84), 0.16, 0.22, MAT_STAGE_OUTFIT)
add_box(hana_parts, "hana_torso", (-1.20, -0.75, 1.10), (0.18, 0.26, 0.34), MAT_STAGE_OUTFIT, bevel=0.04)
add_box(hana_parts, "hana_belt", (-1.20, -0.75, 0.95), (0.19, 0.27, 0.04), MAT_ROSE_GOLD, bevel=0.01)
# Arms
add_cyl(hana_parts, "hana_arm_l", (-1.20, -0.93, 1.08), 0.04, 0.34, MAT_STAGE_OUTFIT, rot=(0.25, 0, 0))
add_cyl(hana_parts, "hana_arm_r", (-1.20, -0.57, 1.08), 0.04, 0.34, MAT_STAGE_OUTFIT, rot=(-0.25, 0, 0))
# Head & pastel purple space-buns hair
add_sphere(hana_parts, "hana_head", (-1.20, -0.75, 1.42), 0.12, MAT_SKIN, segments=20, ring_count=14)
add_sphere(hana_parts, "hana_hair_main", (-1.23, -0.75, 1.45), 0.13, MAT_HAIR_PURPLE, segments=20, ring_count=14)
add_sphere(hana_parts, "hana_bun_l", (-1.24, -0.86, 1.56), 0.065, MAT_HAIR_PURPLE)
add_sphere(hana_parts, "hana_bun_r", (-1.24, -0.64, 1.56), 0.065, MAT_HAIR_PURPLE)
add_torus(hana_parts, "hana_bun_ring_l", (-1.24, -0.86, 1.53), 0.055, 0.01, MAT_NEON_MAGENTA)
add_torus(hana_parts, "hana_bun_ring_r", (-1.24, -0.64, 1.53), 0.055, 0.01, MAT_NEON_CYAN)
join_parts(hana_parts, "npc_hana")

# ==============================================================================
# 11. JIHO — STAGE MANAGER NPC (x: 0.65 .. 1.25, y: 1.45 .. 2.05, z: 0.07 .. 1.74)
# Stylized stage manager in black crew attire, headset, and glowing production tablet
# ==============================================================================
jiho_parts = []
add_cyl(jiho_parts, "jiho_leg_l", (0.86, 1.75, 0.42), 0.065, 0.68, MAT_CREW_BLACK)
add_cyl(jiho_parts, "jiho_leg_r", (1.04, 1.75, 0.42), 0.065, 0.68, MAT_CREW_BLACK)
add_box(jiho_parts, "jiho_torso", (0.95, 1.75, 1.04), (0.30, 0.20, 0.56), MAT_CREW_BLACK, bevel=0.04)
add_box(jiho_parts, "jiho_badge", (1.03, 1.64, 1.16), (0.06, 0.02, 0.08), MAT_NEON_CYAN)
add_cyl(jiho_parts, "jiho_arm_l", (0.76, 1.68, 1.04), 0.045, 0.36, MAT_CREW_BLACK, rot=(0.4, 0, -0.2))
add_cyl(jiho_parts, "jiho_arm_r", (1.14, 1.68, 1.04), 0.045, 0.36, MAT_CREW_BLACK, rot=(0.4, 0, 0.2))
# Glowing production tablet in hands
add_box(jiho_parts, "jiho_tablet", (0.95, 1.52, 0.96), (0.24, 0.16, 0.02), MAT_GUNMETAL, bevel=0.005)
add_box(jiho_parts, "jiho_tablet_screen", (0.95, 1.52, 0.972), (0.20, 0.13, 0.008), MAT_NEON_CYAN)
# Head, crew cap & broadcast headset
add_sphere(jiho_parts, "jiho_head", (0.95, 1.75, 1.46), 0.125, MAT_SKIN, segments=20, ring_count=14)
add_sphere(jiho_parts, "jiho_cap", (0.95, 1.75, 1.51), 0.13, MAT_CREW_BLACK, scale=(1.0, 1.05, 0.7))
add_box(jiho_parts, "jiho_cap_brim", (0.95, 1.60, 1.50), (0.18, 0.12, 0.02), MAT_CREW_BLACK, bevel=0.005)
add_torus(jiho_parts, "jiho_headset_band", (0.95, 1.75, 1.48), 0.135, 0.012, MAT_GUNMETAL, rot=(math.pi/2, 0, 0))
add_sphere(jiho_parts, "jiho_earcup", (0.81, 1.75, 1.46), 0.035, MAT_MAGENTA_TRIM)
join_parts(jiho_parts, "npc_jiho")

# ==============================================================================
# 12. VIP LOUNGE SOFA (x: -0.45 .. 1.45, y: -2.35 .. -1.45, z: 0.07 .. 0.86)
# ==============================================================================
sofa_parts = []
add_box(sofa_parts, "sofa_base", (0.50, -1.90, 0.24), (1.80, 0.82, 0.28), MAT_VELVET_PURPLE, bevel=0.03)
add_box(sofa_parts, "sofa_back", (0.50, -2.22, 0.56), (1.80, 0.20, 0.56), MAT_VELVET_PURPLE, bevel=0.04)
add_box(sofa_parts, "sofa_arm_l", (-0.34, -1.90, 0.44), (0.16, 0.84, 0.48), MAT_VELVET_PURPLE, bevel=0.03)
add_box(sofa_parts, "sofa_arm_r", (1.34, -1.90, 0.44), (0.16, 0.84, 0.48), MAT_VELVET_PURPLE, bevel=0.03)
for c_idx, cx in enumerate([-0.02, 0.50, 1.02]):
    add_box(sofa_parts, f"sofa_cushion_{c_idx}", (cx, -1.84, 0.42), (0.50, 0.64, 0.12), MAT_VELVET_PURPLE, bevel=0.03)
join_parts(sofa_parts, "lounge_sofa")

# ==============================================================================
# 13. COFFEE TABLE & HOLOGRAPHIC 04:55 CLOCK (x: -0.10 .. 1.10, y: -1.15 .. -0.55, z: 0.07 .. 0.58)
# ==============================================================================
table_parts = []
add_box(table_parts, "ctable_base", (0.50, -0.85, 0.09), (1.05, 0.48, 0.04), MAT_GUNMETAL, bevel=0.01)
add_cyl(table_parts, "ctable_leg_l", (0.05, -0.85, 0.25), 0.03, 0.32, MAT_GUNMETAL)
add_cyl(table_parts, "ctable_leg_r", (0.95, -0.85, 0.25), 0.03, 0.32, MAT_GUNMETAL)
add_box(table_parts, "ctable_top", (0.50, -0.85, 0.42), (1.14, 0.54, 0.04), MAT_DARK_METAL, bevel=0.015)
add_box(table_parts, "clock_base", (0.50, -0.85, 0.46), (0.26, 0.08, 0.04), MAT_GUNMETAL, bevel=0.005)
add_box(table_parts, "clock_holo", (0.50, -0.85, 0.52), (0.24, 0.03, 0.10), MAT_NEON_CYAN, bevel=0.008)
join_parts(table_parts, "coffee_table")

# ==============================================================================
# 14. ACOUSTIC GUITAR ON STAND (x: 1.85 .. 2.45, y: -0.65 .. -0.05, z: 0.07 .. 1.08)
# Used for Ending B: Unplugged Encore
# ==============================================================================
guitar_parts = []
add_box(guitar_parts, "gstand_base", (2.15, -0.35, 0.09), (0.42, 0.38, 0.04), MAT_GUNMETAL, bevel=0.008)
add_cyl(guitar_parts, "gstand_neck", (2.15, -0.42, 0.38), 0.02, 0.56, MAT_GUNMETAL)
add_cyl(guitar_parts, "guitar_lower_bout", (2.15, -0.34, 0.34), 0.19, 0.09, MAT_WOOD_SPRUCE, rot=(0, math.pi/2, -0.4))
add_cyl(guitar_parts, "guitar_upper_bout", (2.15, -0.34, 0.52), 0.14, 0.085, MAT_WOOD_SPRUCE, rot=(0, math.pi/2, -0.4))
add_cyl(guitar_parts, "guitar_soundhole", (2.10, -0.32, 0.46), 0.055, 0.02, MAT_WOOD_MAHOGANY, rot=(0, math.pi/2, -0.4))
add_box(guitar_parts, "guitar_neck", (2.13, -0.33, 0.78), (0.04, 0.05, 0.44), MAT_WOOD_MAHOGANY, bevel=0.005)
add_box(guitar_parts, "guitar_headstock", (2.13, -0.33, 1.02), (0.05, 0.08, 0.10), MAT_ROSE_GOLD, bevel=0.005)
join_parts(guitar_parts, "acoustic_guitar")

# ==============================================================================
# LIGHTING & CAMERA SETUP
# ==============================================================================
def add_light(name, ltype, loc, energy, color, size=1.0):
    ld = bpy.data.lights.new(name=name, type=ltype)
    ld.energy = energy
    ld.color = color
    if ltype == 'AREA':
        ld.size = size
    lo = bpy.data.objects.new(name=name, object_data=ld)
    scene.collection.objects.link(lo)
    lo.location = loc
    return lo

add_light("KeyLight_Warm", 'AREA', (1.5, -2.8, 3.8), 320.0, (1.0, 0.92, 0.88), size=2.5)
add_light("FillLight_Violet", 'POINT', (-1.8, -0.8, 2.2), 180.0, (0.85, 0.35, 1.0))
add_light("RimLight_Cyan", 'POINT', (1.2, 1.8, 2.4), 180.0, (0.2, 0.88, 1.0))
add_light("StageDoor_Glow", 'POINT', (0.0, 2.4, 1.8), 140.0, (1.0, 0.2, 0.75))

cam_data = bpy.data.cameras.new("BackstageCamera")
cam_data.lens = 35.0
cam_obj = bpy.data.objects.new("BackstageCamera", cam_data)
scene.collection.objects.link(cam_obj)
cam_obj.location = (3.8, -5.2, 3.4)
cam_obj.rotation_euler = (math.radians(60.0), 0.0, math.radians(34.0))
scene.camera = cam_obj
