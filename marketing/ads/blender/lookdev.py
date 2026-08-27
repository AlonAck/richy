# Look-dev: ONE hero frame (the intercept), iterated until it reads expensive.
# Tight 85mm macro, sharp subject zone, saturated brand color, real contrast.
import sys
import os
import math

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
import lib_richy as L

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.join(HERE, "lookdev_out")

ASSETS = os.environ.get(
    "RICHY_AD_ASSETS",
    r"C:\Users\ackal\AppData\Local\Temp\claude\C--Users-ackal-Downloads-Budget-App-Budget-App\152ceb6d-0b4e-4f87-879d-033ec2745b0f\scratchpad\adref\assets",
)


def A(name):
    return os.path.join(ASSETS, name + ".png")


L.clear_scene()
scn = L.setup_render(1, res=(720, 1280), samples=112)
L.world_cream(0.12)
L.cyclorama()
L.lights(target_loc=(0, 0.7, 0.9))
L.shadow_decal(A("shadow_window"), size=6.5, loc=(0.4, 1.8, 0.012))

# ---- hero arrangement: big, overlapping, edges cropped ----
box = L.gift_box(loc=(-0.62, 1.0, 0.5), size=1.0)
box.rotation_euler = (0, 0, math.radians(-14))

orb, _ = L.orb(loc=(0.30, 0.45, 1.12), radius=0.48)

buy = L.card("buy", A("card_buynow"), 1.25, loc=(0.85, 1.45, 1.95))
buy.rotation_euler = (math.radians(90), 0, math.radians(-7))

rib = L.ribbon(
    [(-2.2, 2.6, 1.4), (-1.0, 2.2, 2.0), (0.2, 1.9, 1.5), (1.4, 2.1, 2.2), (2.4, 2.6, 1.7)],
    width=0.055,
)

# foreground bokeh occluders — the macro "expensive" trick.
# They blur in-lens only: no shadows, or they smear dirt onto the subjects.
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

# ---- tight macro camera, subject-zone SHARP ----
focus = L.focus_empty((0.30, 0.45, 1.12))  # locked on the orb
cam = L.camera(loc=(0.05, -4.9, 1.25), rot=(math.radians(86), 0, math.radians(-1.5)), fstop=5.0, focus=focus)
cam.data.lens = 70

L.render_stills([1], OUT, tag="lookdev_")
print("LOOKDEV DONE")
