# Ad 1 — "The Intercept" (20s, 600 frames, 720x1280 Eevee)
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
scn = L.setup_render(600, res=(720, 1280), samples=48)
L.world_cream()
L.cyclorama()
L.lights()
L.shadow_decal(A("shadow_window"))

focus = L.focus_empty((-0.4, 1.0, 0.8))
cam = L.camera(loc=(0, -6.8, 1.65), rot=(math.radians(82), 0, 0), fstop=2.2, focus=focus)

# slow push-in across the whole spot
L.key(cam, "location", 1, -6.8, 1, ease="EASE_IN_OUT", interp="SINE")
L.key(cam, "location", 600, -5.9, 1, ease="EASE_IN_OUT", interp="SINE")
L.key(cam, "location", 1, 1.65, 2, interp="SINE")
L.key(cam, "location", 600, 1.5, 2, interp="SINE")

# deep background brand wave, permanently defocused
bg_wave = L.ribbon([(-3.5, 3.6, 2.6), (-1.5, 3.2, 2.0), (0.5, 3.4, 2.5), (2.8, 3.7, 2.1)], width=0.06, name="bg_wave")

# ---------------- props ----------------
box = L.gift_box(loc=(-1.5, 1.2, 0.5), size=0.72)

# flip rig: buy card front, "3 weeks of your Freedom Fund" back
bpy.ops.object.empty_add(location=(0.55, 1.0, 1.62))
flip = bpy.context.object
bpy.context.view_layer.update()
fl = flip.location
# offset the two faces along the flip normal so they never z-fight
front = L.card("buy_front", A("card_buynow"), 1.05, loc=(fl.x, fl.y - 0.01, fl.z))
back = L.card("buy_back", A("card_price_back"), 1.05, loc=(fl.x, fl.y + 0.01, fl.z))
back.rotation_euler = (math.radians(90), 0, math.pi)
for p in (front, back):
    p.parent = flip
    p.matrix_parent_inverse = flip.matrix_world.inverted()

orb, orb_map = L.orb(loc=(-2.4, 1.6, 2.7), radius=0.40)
# swirl all spot long
L.key_node(orb_map.inputs["Rotation"], 1, (0, 0, 0), orb.data.materials[0].node_tree)
L.key_node(orb_map.inputs["Rotation"], 600, (0, 0, math.tau), orb.data.materials[0].node_tree)

rib = L.ribbon(
    [(-2.8, 2.6, 1.1), (-1.6, 2.1, 1.7), (-0.5, 1.8, 1.0), (0.6, 2.0, 1.6), (1.9, 2.5, 2.0)],
    width=0.04,
)
rib.data.bevel_factor_end = 0.0

goal = L.card("goal", A("card_goal"), 1.15, loc=(-0.05, 0.75, -0.8))
# gold fill bar riding the goal card's empty track (card-local coords)
gold_m = L.mat_gold()
bpy.ops.mesh.primitive_cube_add(size=2, location=goal.location)
bar = bpy.context.object
bar.data.materials.append(gold_m)
bpy.context.view_layer.update()
bar.parent = goal
# The card plane is a UNIT plane scaled by the parent, so child coords live in
# unit space (±0.5) and inherit the card's scale. Identity parent inverse is
# exactly what we want here. Track on the 360x180 texture:
# x 28..332px, y 66..88px  →  unit x -0.4222..+0.4222, y center 0.0722.
bar.location = (-0.1646, 0.0722, 0.006)
bar.scale = (0.001, 0.0611, 0.006)
bb = bar.modifiers.new("bev", "BEVEL")
bb.width = 0.008
bb.segments = 3

bubble = L.card("bubble", A("bubble_skip"), 0.95, loc=(-0.3, 0.8, 1.95))
avatar = L.card("avatar", A("avatar_r"), 0.30, loc=(0, 0.6, 0.85))
wordmark = L.card("wordmark", A("wordmark_richy"), 1.25, loc=(0, 0.6, 1.5))
nota = L.card("nota", A("tagline_nota"), 1.5, loc=(0, 0.6, 1.03))
coming = L.card("coming", A("tagline_coming"), 1.2, loc=(0, 0.6, 0.72))

# late-scene cards start invisible
for c, fin in ((bubble, 392), (avatar, 470), (wordmark, 532), (nota, 546), (coming, 560)):
    L.fade(c, f_in=fin)

# ---------------- choreography ----------------
K = L.key

# B1 (1-90): box drifts toward the buy card
K(box, "location", 1, -1.5, 0, interp="SINE")
K(box, "location", 95, -0.25, 0, interp="SINE")
K(box, "location", 1, 0.5, 2, interp="SINE")
K(box, "location", 95, 0.85, 2, interp="SINE")
K(box, "rotation_euler", 1, math.radians(-9), 2, interp="SINE")
K(box, "rotation_euler", 95, math.radians(14), 2, interp="SINE")

# B2 (90-195): orb sweeps in and interposes; box recoils; ribbon grows
K(orb, "location", 92, -2.4, 0)
K(orb, "location", 92, 1.6, 1)
K(orb, "location", 92, 2.7, 2)
K(orb, "location", 152, -0.12, 0, ease="EASE_OUT", interp="BACK")
K(orb, "location", 152, 0.55, 1, ease="EASE_OUT", interp="BACK")
K(orb, "location", 152, 1.05, 2, ease="EASE_OUT", interp="BACK")
K(box, "location", 150, -0.25, 0)
K(box, "location", 195, -0.78, 0, ease="EASE_OUT")
L.key(rib.data, "bevel_factor_end", 95, 0.0)
L.key(rib.data, "bevel_factor_end", 165, 1.0, ease="EASE_IN_OUT", interp="SINE")

# B3 (195-330): the flip
K(flip, "rotation_euler", 212, 0.0, 2)
K(flip, "rotation_euler", 262, math.pi, 2, ease="EASE_IN_OUT", interp="BEZIER")
K(orb, "location", 212, -0.12, 0)
K(orb, "location", 330, 0.0, 0, interp="SINE")
K(orb, "location", 212, 1.05, 2)
K(orb, "location", 330, 1.1, 2, interp="SINE")

# B4 (330-450): buy assembly + box exit; goal card rises; gold bar fills 61→68%
K(flip, "location", 340, 0.55, 0)
K(flip, "location", 340, 1.62, 2)
K(flip, "location", 425, 1.95, 0, ease="EASE_IN", interp="SINE")
K(flip, "location", 425, 2.85, 2, ease="EASE_IN", interp="SINE")
K(box, "location", 340, -0.52, 0)
K(box, "location", 425, -2.4, 0, ease="EASE_IN", interp="SINE")
K(orb, "location", 340, 0.0, 0)
K(orb, "location", 400, 0.58, 0, interp="SINE")
K(orb, "location", 340, 1.1, 2)
K(orb, "location", 400, 1.5, 2, interp="SINE")
K(goal, "location", 335, -0.8, 2)
K(goal, "location", 385, 0.95, 2, ease="EASE_OUT", interp="BACK")
# fill 61% → 68% of the track (unit-space: left edge -0.4222, width 0.8444)
K(bar, "scale", 392, 0.2576, 0)
K(bar, "location", 392, -0.1646, 0)
K(bar, "scale", 448, 0.2871, 0, ease="EASE_IN_OUT", interp="SINE")
K(bar, "location", 448, -0.1351, 0, ease="EASE_IN_OUT", interp="SINE")

# B5 (450-525): board clears; orb takes center; monogram appears
for obj, fout in ((goal, 452), (bubble, 452)):
    L.fade(obj, f_out=fout)
K(orb, "location", 452, 0.58, 0)
K(orb, "location", 452, 1.5, 2)
K(orb, "location", 500, 0.0, 0, ease="EASE_OUT", interp="BACK")
K(orb, "location", 500, 1.55, 2, ease="EASE_OUT", interp="BACK")
K(orb, "scale", 452, 1.0, 0)
K(orb, "scale", 452, 1.0, 1)
K(orb, "scale", 452, 1.0, 2)
for i in range(3):
    K(orb, "scale", 500, 1.18, i, ease="EASE_OUT")

# ribbons bow out before the end card so the type stands alone
for r, exit_dz in ((rib, 2.6), (bg_wave, 2.2)):
    K(r, "location", 505, 0.0, 2, interp="SINE")
    K(r, "location", 552, exit_dz, 2, ease="EASE_IN", interp="SINE")

# B6 (525-600): end card — orb rises to crown the stack
K(orb, "location", 528, 0.0, 0)
K(orb, "location", 528, 1.55, 2)
K(orb, "location", 570, 0.0, 0, interp="SINE")
K(orb, "location", 570, 2.18, 2, ease="EASE_IN_OUT", interp="SINE")
for i in range(3):
    K(orb, "scale", 528, 1.18, i)
    K(orb, "scale", 570, 0.85, i, ease="EASE_IN_OUT", interp="SINE")
L.fade(avatar, f_out=524)

# ---------------- focus pulls ----------------
FK = [(1, (-0.6, 1.0, 0.75)), (100, (0.1, 0.7, 1.25)), (205, (0.55, 1.0, 1.62)),
      (350, (-0.05, 0.75, 0.95)), (465, (0.0, 0.6, 1.5)), (540, (0.0, 0.6, 1.4))]
for f, loc in FK:
    for i, v in enumerate(loc):
        K(focus, "location", f, v, i, interp="SINE")

# ---------------- output ----------------
if MODE == "anim":
    L.render_animation(OUT if OUT.endswith(".mp4") else os.path.join(OUT, "ad1_720.mp4"))
else:
    L.render_stills([45, 140, 260, 400, 490, 570], OUT, tag="ad1_")
print("AD1 DONE", MODE)
