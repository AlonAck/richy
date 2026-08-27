# Final assembly: rendered PNG frame sequence + Richard VO + burned subtitles +
# compliance strip → single-pass H.264/AAC encode via Blender's sequencer.
# Run: blender -b --factory-startup -P mux_ad.py -- <ad1|ad2> <frames_dir> <out_path>
import sys
import os
import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
AD, FRAMES_DIR, OUT = argv[0], argv[1], argv[2]

SCRATCH = r"C:\Users\ackal\AppData\Local\Temp\claude\C--Users-ackal-Downloads-Budget-App-Budget-App\152ceb6d-0b4e-4f87-879d-033ec2745b0f\scratchpad"
AUDIO = os.path.join(SCRATCH, "audio")
ASSETS = os.path.join(SCRATCH, "adref", "assets")

# (audio file | None, subtitle png | None, start frame, end frame)
# VO: ElevenLabs "George" — Richard's canonical voice. End-card lines have no
# subtitle strip; the card itself carries the words.
PLAN = {
    "ad1": [
        ("el_a1_1", "sub_a1_1", 8, 88),
        ("el_a1_2", "sub_a1_2", 96, 160),
        ("el_a1_3", "sub_a1_3", 200, 320),
        ("el_a1_4", "sub_a1_4", 336, 445),
        ("el_a1_5", "sub_a1_5", 455, 520),
        ("el_a1_6", None, 532, 600),
    ],
    "ad2": [
        ("el_a2_1", "sub_a2_1", 6, 100),
        ("el_a2_2", "sub_a2_2", 110, 170),
        ("el_a2_3", "sub_a2_3", 232, 355),
        ("el_a2_4", "sub_a2_4", 365, 458),
        ("el_a2_5", "sub_a2_5", 468, 520),
        ("el_a2_6", None, 532, 600),
    ],
}
COMPLIANCE_FROM = {"ad1": 450, "ad2": 462}

frames = sorted(f for f in os.listdir(FRAMES_DIR) if f.lower().endswith(".png"))
if len(frames) < 600:
    print(f"FATAL: only {len(frames)} frames in {FRAMES_DIR}")
    sys.exit(1)

import struct


def png_size(path):
    with open(path, "rb") as fh:
        fh.seek(16)
        return struct.unpack(">II", fh.read(8))


RES_X, RES_Y = png_size(os.path.join(FRAMES_DIR, frames[0]))

scn = bpy.context.scene
scn.render.resolution_x, scn.render.resolution_y = RES_X, RES_Y
scn.render.fps = 30
scn.frame_start, scn.frame_end = 1, 600

if not scn.sequence_editor:
    scn.sequence_editor_create()
se = scn.sequence_editor
strips = se.strips if hasattr(se, "strips") else se.sequences

video = strips.new_image("ad", os.path.join(FRAMES_DIR, frames[0]), channel=1, frame_start=1)
for f in frames[1:]:
    video.elements.append(f)


def place(img_strip, img_w_px, width_frac, y_frac):
    """Scale an overlay to width_frac of frame and center it at y_frac height."""
    s = (RES_X * width_frac) / img_w_px
    img_strip.transform.scale_x = img_strip.transform.scale_y = s
    img_strip.transform.offset_y = (y_frac - 0.5) * RES_Y


ch = 3
for vo, sub, f0, f1 in PLAN[AD]:
    if vo:
        ext = ".mp3" if vo.startswith("el_") else ".wav"
        strips.new_sound(vo, os.path.join(AUDIO, vo + ext), channel=2, frame_start=f0)
    if sub:
        p = os.path.join(ASSETS, sub + ".png")
        st = strips.new_image(sub, p, channel=ch, frame_start=f0)
        st.frame_final_duration = f1 - f0
        img = bpy.data.images.load(p)
        wide = img.size[0] > 1800
        place(st, img.size[0], 0.86 if wide else 0.72, 0.115)
        st.blend_type = "ALPHA_OVER"

comp = os.path.join(ASSETS, "compliance.png")
cs = strips.new_image("compliance", comp, channel=4, frame_start=COMPLIANCE_FROM[AD])
cs.frame_final_duration = 600 - COMPLIANCE_FROM[AD] + 1
cimg = bpy.data.images.load(comp)
place(cs, cimg.size[0], 0.88, 0.055)
cs.blend_type = "ALPHA_OVER"

try:
    scn.render.image_settings.media_type = "VIDEO"
except (AttributeError, TypeError):
    pass
scn.render.image_settings.file_format = "FFMPEG"
scn.render.ffmpeg.format = "MPEG4"
scn.render.ffmpeg.codec = "H264"
scn.render.ffmpeg.constant_rate_factor = "HIGH"
scn.render.ffmpeg.audio_codec = "AAC"
scn.render.ffmpeg.audio_bitrate = 192
scn.render.filepath = OUT
bpy.ops.render.render(animation=True)
print("MUX DONE", OUT)
