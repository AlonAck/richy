# Ad 2 â€” "Run the Whole Thing" (20s, 600 frames) â€” v3 look: tight 70mm macro.
# Run:  blender -b --factory-startup -P ad2_business.py -- [stills|anim] [out_dir]
import sys
import os
import math

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
import lib_richy as L

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = argv[0] if argv else "stills"
OUT = argv[1] if len(argv) > 1 else os.path.join(HERE, "out_ad2")

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

focus = L.focus_empty((0, 1.0, 1.2))
cam = L.camera(loc=(-0.15, -5.5, 1.25), rot=(math.radians(86), 0, 0), fstop=5.0, focus=focus)
cam.data.lens = 70
L.key(cam, "location", 1, -5.5, 1, interp="SINE")
L.key(cam, "location", 600, -4.7, 1, interp="SINE")

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

bg_wave = L.ribbon([(-3.0, 3.6, 2.4), (-1.2, 3.2, 1.8), (0.6, 3.4, 2.3), (2.6, 3.7, 1.9)], width=0.06, name="bg_wave")

# ---- the chaos: five tools scattered in the macro frame ----
# (name, scatter loc, scatter rot z-deg, stack z)
MINIS = [
    ("card_mini_invoices", (-0.6, 1.3, 1.95), -13, 1.98),
    ("card_mini_sheet", (0.62, 1.5, 2.05), 10, 1.56),
    ("card_mini_portfolio", (0.55, 0.8, 0.45), 8, 1.14),
    ("card_mini_cashflow", (-0.6, 0.9, 0.7), 15, 0.72),
    ("card_mini_receipts", (0.05, 1.7, 1.3), -7, 0.30),
]
minis = []
for name, loc, rz, _ in MINIS:
    c = L.card(name, A(name), 0.92, loc=loc)
    c.rotation_euler = (math.radians(90), 0, math.radians(rz))
    minis.append(c)

orb, orb_map = L.orb(loc=(-0.3, 2.6, 4.6), radius=0.48)
L.key_node(orb_map.inputs["Rotation"], 1, (0, 0, 0), orb.data.materials[0].node_tree)
L.key_node(orb_map.inputs["Rotation"], 600, (0, 0, math.tau), orb.data.materials[0].node_tree)

revenue = L.card("revenue", A("card_revenue"), 1.35, loc=(0.1, 0.7, -0.9))
chip = L.card("chip", A("chip_paid"), 0.32, loc=(0.55, 0.64, -0.4))
portfolio = L.card("portfolio", A("card_portfolio_big"), 1.35, loc=(-0.05, 0.75, -0.95))
bubble = L.card("bubble", A("bubble_changed"), 1.0, loc=(0, 0.7, 2.0))
wordmark = L.card("wordmark", A("wordmark_richy"), 1.15, loc=(0, 0.6, 1.35))
runline = L.card("runline", A("tagline_run"), 1.25, loc=(0, 0.6, 0.92))
coming = L.card("coming", A("tagline_coming"), 1.05, loc=(0, 0.6, 0.6))

for c, fin in ((bubble, 470), (wordmark, 548), (runline, 558), (coming, 568)):
    L.fade(c, f_in=fin)

K = L.key

# B1 (1-105): slow tumble drift of the scattered tools
for i, (c, (_, loc, rz, _)) in enumerate(zip(minis, MINIS)):
    K(c, "location", 1, loc[0], 0, interp="SINE")
    K(c, "location", 105, loc[0] + (0.1 if i % 2 else -0.1), 0, interp="SINE")
    K(c, "location", 1, loc[2], 2, interp="SINE")
    K(c, "location", 105, loc[2] + (0.07 if i % 2 else -0.05), 2, interp="SINE")
    K(c, "rotation_euler", 1, math.radians(rz), 2, interp="SINE")
    K(c, "rotation_euler", 105, math.radians(rz * 1.8), 2, interp="SINE")

# B2 (105-225): orb descends; the tools snap into one clean column
K(orb, "location", 108, -0.3, 0)
K(orb, "location", 108, 2.6, 1)
K(orb, "location", 108, 4.6, 2)
K(orb, "location", 162, -0.68, 0, ease="EASE_OUT", interp="BACK")
K(orb, "location", 162, 0.62, 1, ease="EASE_OUT", interp="BACK")
K(orb, "location", 162, 1.25, 2, ease="EASE_OUT", interp="BACK")
for i, (c, (_, loc, rz, stack_z)) in enumerate(zip(minis, MINIS)):
    f0 = 150 + i * 12
    K(c, "location", f0, c.location[0], 0)
    K(c, "location", f0, loc[1], 1)
    K(c, "location", f0, c.location[2], 2)
    K(c, "rotation_euler", f0, math.radians(rz * 1.8), 2)
    K(c, "location", f0 + 22, 0.34, 0, ease="EASE_OUT", interp="BACK")
    K(c, "location", f0 + 22, 0.85 + i * 0.02, 1, ease="EASE_OUT", interp="BACK")
    K(c, "location", f0 + 22, stack_z, 2, ease="EASE_OUT", interp="BACK")
    K(c, "rotation_euler", f0 + 22, 0.0, 2, ease="EASE_OUT", interp="BACK")

# B3 (225-360): stack recedes; revenue card takes the front, Paid chip stamps on
for i, c in enumerate(minis):
    K(c, "location", 240, 0.34, 0)
    K(c, "location", 300, 0.85, 0, interp="SINE")
    K(c, "location", 240, 0.85 + i * 0.02, 1)
    K(c, "location", 300, 1.8 + i * 0.02, 1, interp="SINE")
K(revenue, "location", 238, -0.9, 2)
K(revenue, "location", 288, 1.15, 2, ease="EASE_OUT", interp="BACK")
K(chip, "location", 298, -0.4, 2)
K(chip, "location", 298, 0.64, 1)
K(chip, "location", 298, -0.12, 0)
K(chip, "location", 318, 0.92, 2, ease="EASE_OUT", interp="BACK")
K(chip, "location", 318, 0.62, 1, ease="EASE_OUT", interp="BACK")
K(chip, "rotation_euler", 298, math.radians(90), 0)
K(chip, "rotation_euler", 298, math.radians(-18), 1)
K(chip, "rotation_euler", 318, math.radians(-8), 1, ease="EASE_OUT", interp="BACK")
K(orb, "location", 240, -0.68, 0)
K(orb, "location", 320, -0.78, 0, interp="SINE")

# B4 (360-465): revenue fully out; portfolio in
K(revenue, "location", 368, 1.15, 2)
K(revenue, "location", 368, 0.1, 0)
K(revenue, "location", 415, 3.6, 2, ease="EASE_IN", interp="SINE")
K(revenue, "location", 415, -2.6, 0, ease="EASE_IN", interp="SINE")
K(chip, "location", 368, 0.92, 2)
K(chip, "location", 368, -0.12, 0)
K(chip, "location", 415, 3.9, 2, ease="EASE_IN", interp="SINE")
K(chip, "location", 415, -2.0, 0, ease="EASE_IN", interp="SINE")
K(portfolio, "location", 372, -0.95, 2)
K(portfolio, "location", 422, 1.1, 2, ease="EASE_OUT", interp="BACK")
K(orb, "location", 372, -0.78, 0)
K(orb, "location", 430, 0.62, 0, interp="SINE")
K(orb, "location", 372, 1.25, 2)
K(orb, "location", 430, 1.9, 2, interp="SINE")

# B5 (465-525): bubble over the portfolio; orb bobs to it
K(portfolio, "location", 470, 1.1, 2)
K(portfolio, "location", 520, 0.95, 2, interp="SINE")
K(orb, "location", 470, 0.62, 0)
K(orb, "location", 505, 0.5, 0, interp="SINE")
K(orb, "location", 470, 1.9, 2)
K(orb, "location", 505, 2.05, 2, interp="SINE")

# ribbons and fg props bow out; board clears
L.fade(portfolio, f_out=524)
L.fade(bubble, f_out=524)
for c in minis:
    L.fade(c, f_out=520)
K(bg_wave, "location", 505, 0.0, 2, interp="SINE")
K(bg_wave, "location", 552, 2.2, 2, ease="EASE_IN", interp="SINE")
K(fg1, "location", 505, 0.25, 2, interp="SINE")
K(fg1, "location", 545, -2.2, 2, ease="EASE_IN", interp="SINE")
K(coin, "location", 505, 2.05, 2, interp="SINE")
K(coin, "location", 545, 4.2, 2, ease="EASE_IN", interp="SINE")

# B6 (525-600): end card
K(orb, "location", 522, 0.5, 0)
K(orb, "location", 522, 2.05, 2)
K(orb, "location", 556, 0.0, 0, ease="EASE_IN_OUT", interp="SINE")
K(orb, "location", 556, 1.8, 2, ease="EASE_IN_OUT", interp="SINE")
for i in range(3):
    K(orb, "scale", 522, 1.0, i)
    K(orb, "scale", 556, 0.78, i, ease="EASE_IN_OUT", interp="SINE")

FK = [(1, (0.0, 1.2, 1.3)), (130, (-0.4, 0.7, 1.25)), (250, (0.1, 0.7, 1.15)),
      (390, (-0.05, 0.75, 1.1)), (475, (0.0, 0.7, 1.95)), (540, (0.0, 0.6, 1.35))]
for f, loc in FK:
    for i, v in enumerate(loc):
        K(focus, "location", f, v, i, interp="SINE")

if MODE == "anim":
    os.makedirs(OUT, exist_ok=True)
    scn.render.filepath = os.path.join(OUT, "f")
    scn.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(animation=True)
else:
    L.render_stills([50, 170, 300, 420, 495, 575], OUT, tag="ad2_")
print("AD2 DONE", MODE)
