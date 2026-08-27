# Ad 2 — "Run the Whole Thing" (20s, 600 frames, 720x1280 Eevee)
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
scn = L.setup_render(600, res=(720, 1280), samples=48)
L.world_cream()
L.cyclorama()
L.lights()
L.shadow_decal(A("shadow_window"))

focus = L.focus_empty((0, 1.0, 1.2))
cam = L.camera(loc=(0, -6.8, 1.65), rot=(math.radians(82), 0, 0), fstop=2.2, focus=focus)
L.key(cam, "location", 1, -6.8, 1, interp="SINE")
L.key(cam, "location", 600, -5.9, 1, interp="SINE")
L.key(cam, "location", 1, 1.65, 2, interp="SINE")
L.key(cam, "location", 600, 1.5, 2, interp="SINE")

L.ribbon([(-3.5, 2.8, 2.3), (-1.5, 2.4, 1.6), (0.5, 2.6, 2.2), (2.8, 2.9, 1.7)], width=0.09, name="bg_wave")

# ---------------- the chaos: five tools, five places ----------------
# (name, scatter loc, scatter rot z-deg, stack z)
MINIS = [
    ("card_mini_invoices", (-0.95, 1.3, 2.0), -14, 2.15),
    ("card_mini_sheet", (0.85, 1.6, 2.15), 11, 1.70),
    ("card_mini_portfolio", (0.75, 0.8, 0.5), 8, 1.25),
    ("card_mini_cashflow", (-0.8, 0.9, 0.8), 16, 0.80),
    ("card_mini_receipts", (0.1, 1.9, 1.4), -7, 0.35),
]
minis = []
for name, loc, rz, _ in MINIS:
    c = L.card(name, A(name), 0.78, loc=loc)
    c.rotation_euler = (math.radians(90), 0, math.radians(rz))
    minis.append(c)

orb, orb_map = L.orb(loc=(-0.3, 2.6, 4.6), radius=0.40)
L.key_node(orb_map.inputs["Rotation"], 1, (0, 0, 0), orb.data.materials[0].node_tree)
L.key_node(orb_map.inputs["Rotation"], 600, (0, 0, math.tau), orb.data.materials[0].node_tree)

revenue = L.card("revenue", A("card_revenue"), 1.15, loc=(0.15, 0.7, -0.8))
chip = L.card("chip", A("chip_paid"), 0.28, loc=(0.62, 0.66, -0.35))
portfolio = L.card("portfolio", A("card_portfolio_big"), 1.15, loc=(-0.1, 0.75, -0.9))
bubble = L.card("bubble", A("bubble_changed"), 0.95, loc=(0, 0.7, 1.95))
wordmark = L.card("wordmark", A("wordmark_richy"), 1.25, loc=(0, 0.6, 1.5))
runline = L.card("runline", A("tagline_run"), 1.4, loc=(0, 0.6, 1.03))
coming = L.card("coming", A("tagline_coming"), 1.0, loc=(0, 0.6, 0.74))

for c, fin in ((bubble, 470), (wordmark, 532), (runline, 546), (coming, 560)):
    L.fade(c, f_in=fin)

K = L.key

# B1 (1-105): slow tumble drift of the scattered tools
for i, (c, (_, loc, rz, _)) in enumerate(zip(minis, MINIS)):
    K(c, "location", 1, loc[0], 0, interp="SINE")
    K(c, "location", 105, loc[0] + (0.12 if i % 2 else -0.12), 0, interp="SINE")
    K(c, "location", 1, loc[2], 2, interp="SINE")
    K(c, "location", 105, loc[2] + (0.08 if i % 2 else -0.06), 2, interp="SINE")
    K(c, "rotation_euler", 1, math.radians(rz), 2, interp="SINE")
    K(c, "rotation_euler", 105, math.radians(rz * 1.8), 2, interp="SINE")

# B2 (105-225): orb descends; the tools snap into one clean column
K(orb, "location", 108, -0.3, 0)
K(orb, "location", 108, 2.6, 1)
K(orb, "location", 108, 4.6, 2)
K(orb, "location", 162, -0.88, 0, ease="EASE_OUT", interp="BACK")
K(orb, "location", 162, 0.72, 1, ease="EASE_OUT", interp="BACK")
K(orb, "location", 162, 1.30, 2, ease="EASE_OUT", interp="BACK")
for i, (c, (_, loc, rz, stack_z)) in enumerate(zip(minis, MINIS)):
    f0 = 150 + i * 12
    K(c, "location", f0, c.location[0], 0)
    K(c, "location", f0, loc[1], 1)
    K(c, "location", f0, c.location[2], 2)
    K(c, "rotation_euler", f0, math.radians(rz * 1.8), 2)
    K(c, "location", f0 + 22, 0.35, 0, ease="EASE_OUT", interp="BACK")
    K(c, "location", f0 + 22, 0.85 + i * 0.02, 1, ease="EASE_OUT", interp="BACK")
    K(c, "location", f0 + 22, stack_z, 2, ease="EASE_OUT", interp="BACK")
    K(c, "rotation_euler", f0 + 22, 0.0, 2, ease="EASE_OUT", interp="BACK")

# B3 (225-360): stack recedes; revenue card takes the front, Paid chip stamps on
for i, c in enumerate(minis):
    K(c, "location", 240, 0.35, 0)
    K(c, "location", 300, 0.95, 0, interp="SINE")
    K(c, "location", 240, 0.85 + i * 0.02, 1)
    K(c, "location", 300, 1.7 + i * 0.02, 1, interp="SINE")
K(revenue, "location", 238, -0.8, 2)
K(revenue, "location", 288, 1.18, 2, ease="EASE_OUT", interp="BACK")
# Paid chip stamps onto the open lower-left area of the revenue card
K(chip, "location", 298, -0.35, 2)
K(chip, "location", 298, 0.64, 1)
K(chip, "location", 298, -0.02, 0)
K(chip, "location", 318, 0.98, 2, ease="EASE_OUT", interp="BACK")
K(chip, "location", 318, 0.62, 1, ease="EASE_OUT", interp="BACK")
K(chip, "rotation_euler", 298, math.radians(90), 0)
K(chip, "rotation_euler", 298, math.radians(-18), 1)
K(chip, "rotation_euler", 318, math.radians(-8), 1, ease="EASE_OUT", interp="BACK")
K(orb, "location", 240, -0.88, 0)
K(orb, "location", 320, -0.95, 0, interp="SINE")

# B4 (360-465): revenue out; portfolio in
K(revenue, "location", 368, 1.18, 2)
K(revenue, "location", 368, 0.15, 0)
K(revenue, "location", 415, 2.6, 2, ease="EASE_IN", interp="SINE")
K(revenue, "location", 415, -1.4, 0, ease="EASE_IN", interp="SINE")
K(chip, "location", 368, 0.98, 2)
K(chip, "location", 368, -0.02, 0)
K(chip, "location", 415, 3.0, 2, ease="EASE_IN", interp="SINE")
K(chip, "location", 415, -0.9, 0, ease="EASE_IN", interp="SINE")
K(portfolio, "location", 372, -0.9, 2)
K(portfolio, "location", 422, 1.15, 2, ease="EASE_OUT", interp="BACK")
K(orb, "location", 372, -0.95, 0)
K(orb, "location", 430, 0.68, 0, interp="SINE")
K(orb, "location", 372, 1.30, 2)
K(orb, "location", 430, 1.85, 2, interp="SINE")

# B5 (465-525): bubble over the portfolio; orb bobs to it
K(portfolio, "location", 470, 1.15, 2)
K(portfolio, "location", 520, 0.98, 2, interp="SINE")
K(orb, "location", 470, 0.68, 0)
K(orb, "location", 505, 0.55, 0, interp="SINE")
K(orb, "location", 470, 1.85, 2)
K(orb, "location", 505, 2.05, 2, interp="SINE")

# B6 (525-600): clear; end card
L.fade(portfolio, f_out=524)
L.fade(bubble, f_out=524)
for c in minis:
    L.fade(c, f_out=520)
K(orb, "location", 528, 0.55, 0)
K(orb, "location", 528, 2.05, 2)
K(orb, "location", 570, 0.0, 0, ease="EASE_IN_OUT", interp="SINE")
K(orb, "location", 570, 2.18, 2, ease="EASE_IN_OUT", interp="SINE")
for i in range(3):
    K(orb, "scale", 528, 1.0, i)
    K(orb, "scale", 570, 0.85, i, ease="EASE_IN_OUT", interp="SINE")

# ---------------- focus pulls ----------------
FK = [(1, (0.0, 1.2, 1.4)), (130, (-0.5, 0.75, 1.3)), (250, (0.15, 0.7, 1.18)),
      (390, (-0.1, 0.75, 1.15)), (475, (0.0, 0.7, 1.9)), (540, (0.0, 0.6, 1.4))]
for f, loc in FK:
    for i, v in enumerate(loc):
        K(focus, "location", f, v, i, interp="SINE")

if MODE == "anim":
    L.render_animation(OUT if OUT.endswith(".mp4") else os.path.join(OUT, "ad2_720.mp4"))
else:
    L.render_stills([50, 170, 300, 420, 495, 575], OUT, tag="ad2_")
print("AD2 DONE", MODE)
