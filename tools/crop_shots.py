#!/usr/bin/env python3
"""把浏览器截图裁成 itch.io 用的素材。用法: python3 tools/crop_shots.py <截图名>"""
import os
import shutil
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "itch-assets", "raw")
OUT = os.path.join(ROOT, "itch-assets", "screenshots")

# 预览页里 iframe 的位置（device px，DPR=2）
IFRAME = (0, 0, 1600, 1000)
# 画布在截图中的位置
CANVAS = (272, 194, 980, 550)


def crop(src, region, dst, scale=1):
    im = Image.open(src).convert("RGB")
    x, y, w, h = region
    im = im.crop((x, y, x + w, y + h))
    if scale != 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    im.save(dst)
    return im.size


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    name = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else "ui"
    src = os.path.join(RAW, name)
    region = CANVAS if mode == "canvas" else IFRAME
    dst = os.path.join(OUT, os.path.splitext(name)[0] + ".png")
    print(crop(src, region, dst))
