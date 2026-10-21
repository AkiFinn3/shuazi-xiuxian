#!/usr/bin/env python3
"""
把抓到的原始截图加工成 itch.io 上架素材：
  screenshots/*.png   商店截图
  cover.png            封面（630x500）
  preview.gif          预览动图（640x360）
"""
import os
import shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "itch-assets", "raw")
OUT = os.path.join(ROOT, "itch-assets")
SHOTS = os.path.join(OUT, "screenshots")
FONT = os.path.join(ROOT, "assets", "fonts", "zpix.ttf")
HERO = os.path.join(ROOT, "assets", "game", "anim", "hero", "swordsman_idle.png")

# 预览页里 iframe / 画布在整张截图中的位置（device px）
IFRAME_BOX = (0, 0, 1600, 1000)
CANVAS_BOX = (272, 194, 980, 550)

UI_SHOTS = [
    ("01_creat.png", "1_创建角色.png"),
    ("02_battle.png", "2_自动战斗.png"),
    ("03_boss.png", "3_守关Boss.png"),
    ("05_bag.png", "4_装备与背包.png"),
    ("06_cave.png", "5_洞府炼丹炼器.png"),
    ("07_sect.png", "6_宗门与道侣.png"),
    ("08_tribulation.png", "7_渡劫.png"),
    ("09_spirit.png", "8_本命法宝器灵.png"),
    ("10_ascend.png", "9_飞升仙缘.png"),
    ("04_battle2.png", "10_云海仙宫.png"),
]

GIF_FRAMES = [
    "g6TXSm", "DfWtS1", "8w7bjk", "xUCG3o", "33jWzN", "BdOaZd",
    "YRuhSr", "6KWbSK", "j0eOIa", "ASXe41", "DwcACj", "OweIr1",
]
BROWSER_TMP = "/var/folders/6s/c42z1cl91rq2l_q888lznm_80000gn/T/opencode-browser"


def crop_box(path, box, size=None):
    im = Image.open(path).convert("RGB")
    im = im.crop((box[0], box[1], box[0] + box[2], box[1] + box[3]))
    if size:
        im = im.resize(size, Image.LANCZOS)
    return im


def build_screenshots():
    os.makedirs(SHOTS, exist_ok=True)
    for src, dst in UI_SHOTS:
        p = os.path.join(RAW, src)
        if not os.path.exists(p):
            print("  跳过（缺图）:", src)
            continue
        crop_box(p, IFRAME_BOX).save(os.path.join(SHOTS, dst))
        print("  ✓", dst)


def build_gif():
    frames = []
    for tag in GIF_FRAMES:
        p = os.path.join(BROWSER_TMP + "-" + tag, "0", "screenshot.png")
        if not os.path.exists(p):
            print("  缺帧:", tag)
            continue
        im = crop_box(p, CANVAS_BOX, (640, 360))
        frames.append(im)
    if not frames:
        print("  没有可用帧")
        return
    gif = os.path.join(OUT, "preview.gif")
    frames[0].save(gif, save_all=True, append_images=frames[1:], duration=420, loop=0, optimize=True)
    print("  ✓ preview.gif (%d 帧, %.1f MB)" % (len(frames), os.path.getsize(gif) / 1024 / 1024))


def build_cover():
    W, H = 630, 500
    # 背景：取一帧战斗画面，压暗
    bg_src = os.path.join(RAW, "10_battle2.png") if os.path.exists(os.path.join(RAW, "10_battle2.png")) else os.path.join(RAW, "04_battle2.png")
    base = crop_box(bg_src, CANVAS_BOX, (W, H)).convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (6, 9, 15, 120))
    base = Image.alpha_composite(base, overlay)

    d = ImageDraw.Draw(base)
    # 顶部标题牌
    d.rectangle([0, 0, W, 118], fill=(10, 14, 22, 205))
    d.line([(0, 118), (W, 118)], fill=(232, 196, 106, 255), width=3)
    try:
        title = ImageFont.truetype(FONT, 44)
        sub = ImageFont.truetype(FONT, 16)
    except Exception:
        title = ImageFont.load_default()
        sub = ImageFont.load_default()
    t = "谁让这个刷子修仙的"
    bbox = d.textbbox((0, 0), t, font=title)
    d.text(((W - (bbox[2] - bbox[0])) / 2, 26), t, font=title, fill=(232, 196, 106, 255))
    st = "挂机刷宝 · 像素修仙 · 离线也赚"
    bbox = d.textbbox((0, 0), st, font=sub)
    d.text(((W - (bbox[2] - bbox[0])) / 2, 84), st, font=sub, fill=(111, 214, 176, 255))

    # 主角立绘：场景里已经有角色了，这里不再重复贴，改放一枚灵石点缀
    try:
        stone = Image.open(os.path.join(ROOT, "assets", "game", "ui",
                                       "ui_xianxia_item_spirit_stone.png")).convert("RGBA")
        ss = 28
        stone = stone.resize((ss, ss), Image.NEAREST)
        base.alpha_composite(stone, (W - 60, H - 78))
    except Exception as e:
        print("  点缀失败:", e)

    # 角落标签
    d.rounded_rectangle([14, H - 44, 214, H - 14], 4, fill=(10, 14, 22, 190), outline=(59, 71, 99, 255))
    d.text((24, H - 38), "自动打怪 · 刷装备 · 渡劫", font=sub, fill=(200, 212, 230, 255))

    # 底部说明条
    d.rectangle([0, H - 40, W, H], fill=(10, 14, 22, 215))
    d.line([(0, H - 40), (W, H - 40)], fill=(59, 71, 99, 255), width=1)

    base.convert("RGB").save(os.path.join(OUT, "cover.png"))
    print("  ✓ cover.png (630x500)")


if __name__ == "__main__":
    print("生成商店素材…")
    build_screenshots()
    build_gif()
    build_cover()
    print("完成 ->", OUT)
