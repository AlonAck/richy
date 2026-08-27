# Ad 1 â€” "The Intercept" (20s, 600 frames) â€” v3 look: tight 70mm macro,
# sharp subject zone at f/5, saturated cobalt, filmic AgX-punchy grade.
# Run:  blender -b --factory-startup -P ad1_intercept.py -- [stills|anim] [out_dir]
import sys
import os
import math

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
import lib_richy as L

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = argv[0] if argv else "stills"
OUT = argv[1] if len(argv) > 1 else os.path.join(HERE, "out_ad1")

ASSETS = os.environ.get(
    "RICHY_AD_ASSETS",
    r"C:\Users\ackal\AppData\Local\Temp\claude\C--Users-ackal-Downloads-Budget-App-Budget-App\152ceb6d-0b4e-4f87-879d-033ec2745b0f\scratchpad\adref\assets",
)


def A(name):
    return os.path.join(ASSETS, name + ".png")


L.clear_scene()
if MODE == "anim":
    scn = L.setup_render(600, res=(1080, 1920), samples=96)
else:
    scn = L.setup_render(600, res=(720, 1280), samples=48)
L.world_cream(0.12)
L.cyclorama()
L.lights(target_loc=(0, 0.7, 0.9))
L.shadow_decal(A("shadow_window"), size=6.5, loc=(0.4, 1.8, 0.012))

# ---- camera: fixed macro, slow push, focus tracks the beat hero ----
focus = L.focus_empty((-0.5, 1.0, 0.7))
cam = L.camera(loc=(-0.15, -5.5, 1.25), rot=(math.radians(86), 0, 0), fstop=5.0, focus=focus)
cam.data.lens = 70
L.key(cam, "location", 1, -5.5, 1, interp="SINE")
L.key(cam, "location", 600, -4.7, 1, interp="SINE")

# foreground bokeh occluders (no shadows) â€” exit before the end card
fgm = L.mat_gloss("fg_white", L.WHITE, 0.15)
bpy.ops.mesh.primitive_plane_add(size=1, location=(-1.35, -2.6, 0.25))
fg1 = bpy.context.object
fg1.scale = (1.1, 0.7, 1)
fg1.rotation_euler = (math.radians(78), 0, math.radians(30))
fg1.data.materials.append(fgm)
fg1.visible_shadow = False
bpy.ops.mesh.primitive_cylinder_add(radius=0.14, depth=0.03, location=(1.35, -2.2, 2.05))
coin = bpy.context.object
coin.rotation_euler = (math.radians(75), 0, 0)
coin.data.materials.append(L.mat_gold())
coin.visible_shadow = False

# background ribbons, silky mid-blue, behind everything
bg_wave = L.ribbon([(-3.0, 3.6, 2.2), (-1.2, 3.2, 1.9), (0.6, 3.4, 2.2), (2.6, 3.7, 2.0)], width=0.06, name="bg_wave")
rib = L.ribbon(
    [(-2.4, 2.6, 1.4), (-1.1, 2.2, 2.0), (0.2, 1.9, 1.5), (1.4, 2.1, 2.2), (2.4, 2.6, 1.7)],
    width=0.055,
)
rib.data.bevel_factor_end = 0.0

# ---------------- props ----------------
box = L.gift_box(loc=(-1.5, 1.0, 0.55), size=1.0)
box.rotation_euler = (0, 0, math.radians(-14))

bpy.ops.object.empty_add(location=(0.45, 1.35, 1.95))
flip = bpy.context.object
bpy.context.view_layer.update()
fl = flip.location
front = L.card("buy_front", A("card_buynow"), 1.25, loc=(fl.x, fl.y - 0.01, fl.z))
back = L.card("buy_back", A("card_price_back"), 1.25, loc=(fl.x, fl.y + 0.01, fl.z))
front.rotation_euler = (math.radians(90), 0, math.radians(-7))
back.rotation_euler = (math.radians(90), 0, math.pi - math.radians(7))
for p in (front, back):
    p.parent = flip
    p.matrix_parent_inverse = flip.matrix_world.inverted()

orb, orb_map = L.orb(loc=(-2.2, 1.6, 2.9), radius=0.48)
L.key_node(orb_map.inputs["Rotation"], 1, (0, 0, 0), orb.data.materials[0].node_tree)
L.key_node(orb_map.inputs["Rotation"], 600, (0, 0, math.tau), orb.data.materials[0].node_tree)

goal = L.card("goal", A("card_goal"), 1.3, loc=(0.0, 0.85, -0.9))
gold_m = L.mat_gold()
bpy.ops.mesh.primitive_cube_add(size=2, location=goal.location)
bar = bpy.context.object
bar.data.materials.append(gold_m)
bpy.context.view_layer.update()
bar.parent = goal  # identity parent inverse: bar lives in the card's unit space
bar.location = (-0.1646, 0.0722, 0.006)
bar.scale = (0.001, 0.0611, 0.006)
bb = bar.modifiers.new("bev", "BEVEL")
bb.width = 0.008
bb.segments = 3

bubble = L.card("bubble", A("bubble_skip"), 0.95, loc=(0.1, 1.0, 1.95))
avatar = L.card("avatar", A("avatar_r"), 0.34, loc=(0, 0.6, 0.62))
wordmark = L.card("wordmark", A("wordmark_richy"), 1.15, loc=(0, 0.6, 1.35))
nota = L.card("nota", A("tagline_nota"), 1.3, loc=(0, 0.6, 0.92))
coming = L.card("coming", A("tagline_coming"), 1.05, loc=(0, 0.6, 0.6))

for c, fin in ((bubble, 392), (avatar, 470), (wordmark, 532), (nota, 546), (coming, 560)):
    L.fade(c, f_in=fin)

# ---------------- choreography ----------------
K = L.key

# B1 (1-90): box drifts toward the buy card
K(box, "location", 1, -1.5, 0, interp="SINE")
K(box, "location", 95, -0.5, 0, interp="SINE")
K(box, "location", 1, 0.55, 2, interp="SINE")
K(box, "location", 95, 0.6, 2, interp="SINE")
K(box, "rotation_euler", 1, math.radians(-26), 2, interp="SINE")
K(box, "rotation_euler", 95, math.radians(-8), 2, interp="SINE")

# B2 (90-195): orb sweeps in and interposes; box recoils; ribbon grows
K(orb, "location", 92, -2.2, 0)
K(orb, "location", 92, 1.6, 1)
K(orb, "location", 92, 2.9, 2)
K(orb, "location", 152, -0.3, 0, ease="EASE_OUT", interp="BACK")
K(orb, "location", 152, 0.5, 1, ease="EASE_OUT", interp="BACK")
K(orb, "location", 152, 1.38, 2, ease="EASE_OUT", interp="BACK")
K(box, "location", 150, -0.5, 0)
K(box, "location", 195, -0.7, 0, ease="EASE_OUT")
L.key(rib.data, "bevel_factor_end", 95, 0.0)
L.key(rib.data, "bevel_factor_end", 165, 1.0, ease="EASE_IN_OUT", interp="SINE")

# B3 (195-330): the flip — the card glides left as it turns so the
# revealed message sits centered in frame
K(flip, "rotation_euler", 212, 0.0, 2)
K(flip, "rotation_euler", 262, math.pi, 2, ease="EASE_IN_OUT", interp="BEZIER")
K(flip, "location", 212, 0.45, 0)
K(flip, "location", 262, 0.05, 0, ease="EASE_IN_OUT", interp="SINE")
K(orb, "location", 212, -0.3, 0)
K(orb, "location", 330, -0.55, 0, interp="SINE")
K(orb, "location", 212, 1.38, 2)
K(orb, "location", 330, 1.12, 2, interp="SINE")

# B4 (330-450): buy assembly + box exit; goal card rises; gold bar fills 61â†’68%
K(flip, "location", 340, 0.05, 0)
K(flip, "location", 340, 1.95, 2)
K(flip, "location", 425, 1.4, 0, ease="EASE_IN", interp="SINE")
K(flip, "location", 425, 3.3, 2, ease="EASE_IN", interp="SINE")
K(box, "location", 340, -0.95, 0)
K(box, "location", 425, -2.6, 0, ease="EASE_IN", interp="SINE")
K(orb, "location", 340, -0.55, 0)
K(orb, "location", 400, 0.55, 0, interp="SINE")
K(orb, "location", 340, 1.12, 2)
K(orb, "location", 400, 1.55, 2, interp="SINE")
K(goal, "location", 335, -0.9, 2)
K(goal, "location", 385, 0.95, 2, ease="EASE_OUT", interp="BACK")
K(bar, "scale", 392, 0.2576, 0)
K(bar, "location", 392, -0.1646, 0)
K(bar, "scale", 448, 0.2871, 0, ease="EASE_IN_OUT", interp="SINE")
K(bar, "location", 448, -0.1351, 0, ease="EASE_IN_OUT", interp="SINE")

# B5 (450-525): board clears; orb takes center; monogram appears
for obj, fout in ((goal, 452), (bubble, 452)):
    L.fade(obj, f_out=fout)
bar.hide_render = False
bar.keyframe_insert("hide_render", frame=455)
bar.hide_render = True
bar.keyframe_insert("hide_render", frame=463)
bar.hide_render = False
K(orb, "location", 452, 0.55, 0)
K(orb, "location", 452, 1.55, 2)
K(orb, "location", 500, 0.0, 0, ease="EASE_OUT", interp="BACK")
K(orb, "location", 500, 1.4, 2, ease="EASE_OUT", interp="BACK")
for i in range(3):
    K(orb, "scale", 452, 1.0, i)
    K(orb, "scale", 500, 1.12, i, ease="EASE_OUT")

# ribbons and foreground props bow out before the end card
for r, exit_dz in ((rib, 2.6), (bg_wave, 2.2)):
    K(r, "location", 505, 0.0, 2, interp="SINE")
    K(r, "location", 552, exit_dz, 2, ease="EASE_IN", interp="SINE")
K(fg1, "location", 505, 0.25, 2, interp="SINE")
K(fg1, "location", 545, -2.2, 2, ease="EASE_IN", interp="SINE")
K(coin, "location", 505, 2.05, 2, interp="SINE")
K(coin, "location", 545, 4.2, 2, ease="EASE_IN", interp="SINE")

# B6 (525-600): end card â€” orb rises to crown the stack
K(orb, "location", 528, 0.0, 0)
K(orb, "location", 528, 1.4, 2)
K(orb, "location", 566, 0.0, 0, interp="SINE")
K(orb, "location", 566, 1.8, 2, ease="EASE_IN_OUT", interp="SINE")
for i in range(3):
    K(orb, "scale", 528, 1.12, i)
    K(orb, "scale", 566, 0.78, i, ease="EASE_IN_OUT", interp="SINE")
L.fade(avatar, f_out=524)

# ---------------- focus pulls ----------------
FK = [(1, (-0.7, 1.0, 0.7)), (100, (-0.2, 0.6, 1.2)), (205, (0.15, 1.35, 1.95)),
      (350, (0.0, 0.85, 0.95)), (465, (0.0, 0.6, 1.4)), (540, (0.0, 0.6, 1.35))]
for f, loc in FK:
    for i, v in enumerate(loc):
        K(focus, "location", f, v, i, interp="SINE")

# ---------------- output ----------------
if MODE == "anim":
    os.makedirs(OUT, exist_ok=True)
    scn.render.filepath = os.path.join(OUT, "f")
    scn.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(animation=True)
else:
    L.render_stills([45, 140, 260, 400, 490, 570], OUT, tag="ad1_")
print("AD1 DONE", MODE)
