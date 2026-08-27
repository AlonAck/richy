# Shared scene library for the two Richy launch ads.
# Blender 5.2, Eevee only (the machine has integrated graphics — Cycles is off-limits).
# Look: high-key cream cyclorama, window-gobo key light, glossy props, macro DOF.
# UI cards are pre-rendered PNGs (browser-made, real EB Garamond) on alpha-clipped planes.

import bpy
import math
import os

# ---- palette (design.json / Cornflower Ocean + brand constants) ----
CREAM = (0.9451, 0.9255, 0.8859)      # #F7F3EE
INK = (0.0273, 0.0193, 0.0144)        # #1A1410 (linear-ish)
BLUE = (0.1119, 0.1946, 0.7454)       # #5C7AE3
BLUE_SOFT = (0.2423, 0.3049, 0.8148)  # #8493E2 lifted
BLUE_PALE = (0.4620, 0.5271, 0.8469)  # #B2BEED
GOLD = (0.5647, 0.3185, 0.0409)       # #C8983A
CHOCOLATE = (0.0144, 0.0097, 0.0060)  # #221B14
WHITE = (0.9473, 0.9473, 0.9301)

FPS = 30


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def setup_render(frame_end, res=(720, 1280), samples=48, out_path=None):
    scn = bpy.context.scene
    scn.render.engine = "BLENDER_EEVEE"
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.fps = FPS
    scn.frame_start, scn.frame_end = 1, frame_end
    scn.eevee.taa_render_samples = samples
    # Standard, not AgX: this is a high-key UI-forward scene and the brand cream
    # must survive to the pixel. AgX desaturates it into gray.
    try:
        scn.view_settings.view_transform = "Standard"
    except TypeError:
        pass
    if out_path:
        scn.render.filepath = out_path
    return scn


def world_cream(strength=0.30):
    w = bpy.data.worlds.new("cream") if not bpy.context.scene.world else bpy.context.scene.world
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*CREAM, 1)
    bg.inputs[1].default_value = strength


# ---- materials ----

def _principled(name, color, rough, metallic=0.0, emission=None, emis_str=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    if emission is not None:
        b.inputs["Emission Color"].default_value = (*emission, 1)
        b.inputs["Emission Strength"].default_value = emis_str
    return m


def mat_cream_floor():
    return _principled("cream_floor", CREAM, 0.55)


def mat_gloss(name, color, rough=0.12):
    return _principled(name, color, rough)


def mat_gold():
    return _principled("gold", GOLD, 0.22, metallic=0.85)


def mat_chocolate():
    return _principled("chocolate", CHOCOLATE, 0.35)


def mat_orb():
    """Richard's orb — soft periwinkle swirl, gently self-lit. Surface trickery only
    (no volumetrics on this GPU): noise-driven ramp between the three theme blues,
    a white lift so it never collapses into one flat ball, fresnel rim."""
    m = bpy.data.materials.new("orb")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.18

    tex = nt.nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 1.6
    tex.inputs["Detail"].default_value = 3.0

    mapping = nt.nodes.new("ShaderNodeMapping")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], tex.inputs["Vector"])

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.30
    ramp.color_ramp.elements[0].color = (*BLUE, 1)
    ramp.color_ramp.elements[1].position = 0.62
    ramp.color_ramp.elements[1].color = (*BLUE_PALE, 1)
    mid = ramp.color_ramp.elements.new(0.85)
    mid.color = (0.9, 0.92, 1.0, 1)
    nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 0.55

    fres = nt.nodes.new("ShaderNodeFresnel")
    fres.inputs["IOR"].default_value = 1.35
    mix = nt.nodes.new("ShaderNodeMixShader")
    glow = nt.nodes.new("ShaderNodeEmission")
    glow.inputs["Color"].default_value = (0.85, 0.88, 1.0, 1)
    glow.inputs["Strength"].default_value = 1.4
    out = nt.nodes["Material Output"]
    nt.links.new(fres.outputs["Fac"], mix.inputs["Fac"])
    nt.links.new(b.outputs["BSDF"], mix.inputs[1])
    nt.links.new(glow.outputs["Emission"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return m, mapping  # mapping returned so scenes can animate the swirl rotation


# ---- geometry ----

def cyclorama(size=24, fillet=3.0, segs=12):
    """Floor that curves up into a back wall — the seamless studio sweep."""
    verts, faces = [], []
    half = size / 2
    # profile: flat floor from -half to (half - fillet), quarter-circle up, wall to height size*0.6
    prof = [(-half, 0.0)]
    prof.append((half - fillet, 0.0))
    for i in range(1, segs + 1):
        a = (i / segs) * (math.pi / 2)
        prof.append((half - fillet + math.sin(a) * fillet, fillet - math.cos(a) * fillet))
    prof.append((half, size * 0.6))
    n = len(prof)
    for x in (-half, half):
        for (y, z) in prof:
            verts.append((x, y, z))
    for i in range(n - 1):
        faces.append((i, i + 1, n + i + 1, n + i))
    mesh = bpy.data.meshes.new("cyc")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new("cyclorama", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat_cream_floor())
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.select_set(False)
    return obj


def lights(gobo=False, target_loc=(0, 0.8, 1.0)):
    """Key with window gobo + big soft fill. Key and gobo are aimed by
    constraint at a shared target so the pattern is guaranteed to land."""
    bpy.ops.object.empty_add(location=target_loc)
    target = bpy.context.object
    target.name = "light_target"

    key_loc = (5, -7, 8)
    bpy.ops.object.light_add(type="AREA", location=key_loc)
    key = bpy.context.object
    key.data.energy = 2600
    key.data.size = 0.6   # small: keeps the gobo's window pattern readable
    key.data.color = (1.0, 0.96, 0.90)
    tc = key.constraints.new("TRACK_TO")
    tc.target = target
    tc.track_axis = "TRACK_NEGATIVE_Z"
    tc.up_axis = "UP_Y"

    bpy.ops.object.light_add(type="AREA", location=(-6, -5, 5), rotation=(math.radians(55), 0, math.radians(-38)))
    fill = bpy.context.object
    fill.data.energy = 420
    fill.data.size = 9
    fill.data.color = (0.94, 0.96, 1.0)

    # low warm kicker from behind-right so shadow sides of props stay ivory, not concrete
    bpy.ops.object.light_add(type="AREA", location=(4, 4, 2.5))
    kick = bpy.context.object
    kick.data.energy = 260
    kick.data.size = 6
    kick.data.color = (1.0, 0.95, 0.88)
    kc = kick.constraints.new("TRACK_TO")
    kc.target = target
    kc.track_axis = "TRACK_NEGATIVE_Z"
    kc.up_axis = "UP_Y"

    gob = None
    if gobo:
        # window frame 72% of the way down the beam — penumbra math: pattern
        # survives only when gobo-to-floor is much shorter than light-to-gobo
        gob = bpy.data.objects.new("gobo", None)
        bpy.context.collection.objects.link(gob)
        t = 0.72
        gob.location = tuple(k + t * (p - k) for k, p in zip(key_loc, target_loc))
        gc = gob.constraints.new("TRACK_TO")
        gc.target = target
        gc.track_axis = "TRACK_NEGATIVE_Z"
        gc.up_axis = "UP_Y"
        dark = _principled("gobo_dark", (0, 0, 0), 1.0)
        # frame: 4 border bars + 1 vertical + 1 horizontal muntin (2x2 big panes)
        spec = [
            (0, 2.4, 5.2, 0.45), (0, -2.4, 5.2, 0.45),     # top/bottom (x, z, len, thick)
            (2.4, 0, 0.45, 5.2), (-2.4, 0, 0.45, 5.2),     # sides
            (0, 0, 0.32, 5.2), (0, 0, 5.2, 0.32),          # muntins
        ]
        for (bx, bz, wx, wz) in spec:
            bpy.ops.mesh.primitive_cube_add(size=2)  # size=2 → scale == half-extents
            bar = bpy.context.object
            bar.scale = (wx / 2, 0.02, wz / 2)
            bar.location = (bx, 0, bz)
            bar.data.materials.append(dark)
            bar.visible_camera = False  # casts shadow, never appears in shot
            bar.parent = gob
        bpy.context.view_layer.update()
    return key, fill, gob


def camera(loc=(0, -6.5, 1.6), rot=(math.radians(82), 0, 0), fstop=1.8, focus=None):
    bpy.ops.object.camera_add(location=loc, rotation=rot)
    cam = bpy.context.object
    cam.data.lens = 50
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = fstop
    if focus is not None:
        cam.data.dof.focus_object = focus
    bpy.context.scene.camera = cam
    return cam


def focus_empty(loc=(0, 0, 1.2)):
    bpy.ops.object.empty_add(location=loc)
    return bpy.context.object


_IMG_CACHE = {}


def card(name, png_path, width, loc=(0, 0, 1), emis=0.85, thick=True):
    """UI card: plane textured with a browser-rendered PNG. Mostly emission so the
    type stays crisp; a little diffuse so scene light still models it."""
    if png_path not in _IMG_CACHE:
        _IMG_CACHE[png_path] = bpy.data.images.load(png_path)
    img = _IMG_CACHE[png_path]
    h = width * img.size[1] / img.size[0]

    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (width, h, 1)
    obj.rotation_euler = (math.radians(90), 0, 0)  # face the -Y camera

    m = bpy.data.materials.new(name + "_m")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = emis
    b.inputs["Roughness"].default_value = 0.4
    nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    for attr, val in (("blend_method", "CLIP"), ("surface_render_method", "DITHERED")):
        try:
            setattr(m, attr, val)
        except (AttributeError, TypeError):
            pass
    obj.data.materials.append(m)

    if thick:
        sol = obj.modifiers.new("sol", "SOLIDIFY")
        sol.thickness = 0.012
        sol.offset = -1
    return obj


def hud_card(cam, name, png_path, width_frac, y_frac, dist=2.0, emis=1.0):
    """Camera-locked overlay (subtitles, compliance) — parented to the camera,
    pure emission, always legible. width_frac/y_frac are in screen fractions
    (y_frac: 0 bottom .. 1 top)."""
    obj = card(name, png_path, 1.0, emis=emis, thick=False)
    obj.parent = cam
    obj.rotation_euler = (0, 0, 0)
    # sensor fit AUTO maps sensor_width to the LARGER render dimension.
    # Portrait: that's the vertical. visible_h = dist * sensor / lens.
    scn = bpy.context.scene
    aspect = scn.render.resolution_x / scn.render.resolution_y  # <1 in portrait
    fit = dist * cam.data.sensor_width / cam.data.lens
    if aspect < 1:
        vis_h, vis_w = fit, fit * aspect
    else:
        vis_w, vis_h = fit, fit / aspect
    img = _IMG_CACHE[png_path]
    w = vis_w * width_frac
    h = w * img.size[1] / img.size[0]
    obj.scale = (w, h, 1)
    obj.location = (0, -vis_h / 2 + y_frac * vis_h, -dist)
    return obj


def shadow_decal(png_path, size=7.5, loc=(0.3, 1.2, 0.012), rot_z=0.25):
    """The window-light pattern as a floor decal — art-directable, render-cheap,
    and immune to Eevee's shadow/visibility quirks."""
    if png_path not in _IMG_CACHE:
        _IMG_CACHE[png_path] = bpy.data.images.load(png_path)
    img = _IMG_CACHE[png_path]
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = "window_shadow"
    obj.scale = (size, size, 1)
    obj.rotation_euler = (0, 0, rot_z)
    m = bpy.data.materials.new("winshadow")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    b.inputs["Base Color"].default_value = (0.02, 0.013, 0.008, 1)
    b.inputs["Roughness"].default_value = 1.0
    nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    for attr, val in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
        try:
            setattr(m, attr, val)
        except (AttributeError, TypeError):
            pass
    obj.data.materials.append(m)
    obj.visible_shadow = False
    return obj


def gift_box(loc=(0, 0, 0.5), size=0.8):
    """Premium white box: rounded base + slightly proud lid + periwinkle band."""
    bpy.ops.mesh.primitive_cube_add(size=size, location=loc)
    box = bpy.context.object
    bev = box.modifiers.new("bev", "BEVEL")
    bev.width = size * 0.06
    bev.segments = 5
    box.data.materials.append(mat_gloss("boxwhite", WHITE, 0.1))
    bpy.context.view_layer.update()

    def child(half_extents, offset=(0, 0, 0), material=None):
        # size=2 cube → scale IS the half-extent
        bpy.ops.mesh.primitive_cube_add(size=2, location=tuple(l + o for l, o in zip(loc, offset)))
        c = bpy.context.object
        c.scale = half_extents
        if material:
            c.data.materials.append(material)
        bpy.context.view_layer.update()
        c.parent = box
        c.matrix_parent_inverse = box.matrix_world.inverted()
        return c

    band_m = mat_gloss("band", BLUE, 0.2)
    lid_m = mat_gloss("lid", WHITE, 0.08)
    # Apple-style shell lid over the top quarter, with a visible seam; the
    # ribbon band pokes past the lid so it wraps the whole silhouette.
    lid = child((size * 0.545, size * 0.545, size * 0.11), offset=(0, 0, size * 0.33), material=lid_m)
    lb = lid.modifiers.new("bev", "BEVEL")
    lb.width = size * 0.02
    lb.segments = 3
    e = size * 0.56  # past the lid shell
    child((size * 0.05, e, e), material=band_m)             # band around YZ
    child((e, size * 0.05, e), material=band_m)             # band around XZ
    return box


def orb(loc=(0, 0, 1.2), radius=0.42):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=48, ring_count=32, location=loc)
    o = bpy.context.object
    bpy.ops.object.shade_smooth()
    m, mapping = mat_orb()
    o.data.materials.append(m)
    return o, mapping


def ribbon(points, width=0.05, name="ribbon"):
    """Silk ribbon along a bezier through the given points. Animate
    data.bevel_factor_end for a growth sweep."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(points) - 1)
    for bp, co in zip(sp.bezier_points, points):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    cu.bevel_depth = 0
    cu.extrude = width
    cu.twist_mode = "MINIMUM"
    obj = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(obj)
    m = _principled(name + "_m", BLUE_PALE, 0.3)
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Emission Color"].default_value = (*BLUE_PALE, 1)
    b.inputs["Emission Strength"].default_value = 0.12
    obj.data.materials.append(m)
    return obj


# ---- animation helpers ----

def _fcurves(anim_data):
    """Blender 5.x moved fcurves into layered actions; reach them either way."""
    act = anim_data.action if anim_data else None
    if act is None:
        return []
    if hasattr(act, "fcurves"):
        return act.fcurves
    fcs = []
    for layer in act.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                fcs.extend(bag.fcurves)
    return fcs


def key(obj, path, frame, value, index=-1, ease="EASE_IN_OUT", interp="BEZIER"):
    if index >= 0:
        attr = getattr(obj, path)
        attr[index] = value
        obj.keyframe_insert(path, index=index, frame=frame)
    else:
        setattr(obj, path, value)
        obj.keyframe_insert(path, frame=frame)
    for fc in _fcurves(obj.animation_data):
        for kp in fc.keyframe_points:
            if abs(kp.co[0] - frame) < 0.5:
                kp.interpolation = interp
                kp.easing = ease


def key_node(node_input, frame, value, ntree, ease="EASE_IN_OUT"):
    node_input.default_value = value
    node_input.keyframe_insert("default_value", frame=frame)
    for fc in _fcurves(ntree.animation_data):
        for kp in fc.keyframe_points:
            if abs(kp.co[0] - frame) < 0.5:
                kp.interpolation = "BEZIER"
                kp.easing = ease


def fade(obj, f_in=None, f_out=None, dur=12):
    """Fade a card in/out by animating its material's emission-alpha pair."""
    m = obj.data.materials[0]
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    alpha_in = b.inputs["Alpha"]
    tex = next(n for n in nt.nodes if n.type == "TEX_IMAGE")
    # route: alpha = image_alpha * factor  (math node inserted once)
    mult = next((n for n in nt.nodes if n.name == "fade_mult"), None)
    if mult is None:
        mult = nt.nodes.new("ShaderNodeMath")
        mult.name = "fade_mult"
        mult.operation = "MULTIPLY"
        mult.inputs[1].default_value = 1.0
        nt.links.new(tex.outputs["Alpha"], mult.inputs[0])
        nt.links.new(mult.outputs["Value"], alpha_in)
        for attr, val in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
            try:
                setattr(m, attr, val)
            except (AttributeError, TypeError):
                pass
    fac = mult.inputs[1]
    if f_in is not None:
        key_node(fac, f_in, 0.0, nt)
        key_node(fac, f_in + dur, 1.0, nt)
    if f_out is not None:
        key_node(fac, f_out, 1.0, nt)
        key_node(fac, f_out + dur, 0.0, nt)


def snap_in(obj, frame, dur=18, from_offset=(0, 0, -0.6), overshoot=True):
    """Slide+settle an object into its current location with a BACK ease."""
    end_loc = tuple(obj.location)
    start = tuple(e + o for e, o in zip(end_loc, from_offset))
    key(obj, "location", frame, start[0], 0)
    key(obj, "location", frame, start[1], 1)
    key(obj, "location", frame, start[2], 2)
    interp = "BACK" if overshoot else "BEZIER"
    for i, v in enumerate(end_loc):
        key(obj, "location", frame + dur, v, i, ease="EASE_OUT", interp=interp)


def render_stills(frames, out_dir, tag=""):
    scn = bpy.context.scene
    os.makedirs(out_dir, exist_ok=True)
    for f in frames:
        scn.frame_set(f)
        scn.render.filepath = os.path.join(out_dir, f"{tag}f{f:04d}.png")
        bpy.ops.render.render(write_still=True)


def render_animation(out_path):
    scn = bpy.context.scene
    scn.render.image_settings.file_format = "FFMPEG"
    scn.render.ffmpeg.format = "MPEG4"
    scn.render.ffmpeg.codec = "H264"
    scn.render.ffmpeg.constant_rate_factor = "HIGH"
    scn.render.filepath = out_path
    bpy.ops.render.render(animation=True)
