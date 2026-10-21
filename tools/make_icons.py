#!/usr/bin/env python3
"""
生成本项目自绘的 UI 图标（32x32 像素图，风格与素材包一致）。
不依赖任何第三方素材，输出到 assets/icons/。
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "icons")

# 调色板（与游戏 UI 一致）
JADE = (111, 214, 176, 255)
GOLD = (232, 196, 106, 255)
DARK = (38, 44, 58, 255)
STEEL = (196, 205, 220, 255)
WOOD = (150, 104, 62, 255)
RED = (224, 87, 79, 255)
BLUE = (120, 190, 255, 255)


def new_canvas():
    return Image.new("RGBA", (32, 32), (0, 0, 0, 0))


def px(im, x, y, color):
    if 0 <= x < 32 and 0 <= y < 32:
        im.putpixel((x, y), color)


def rect(im, x0, y0, x1, y1, color):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px(im, x, y, color)


def save(im, name):
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, name + ".png"))
    return name


def slot_weapon():
    """剑：斜置长剑"""
    im = new_canvas()
    for i in range(20):
        px(im, 6 + i, 24 - i, STEEL)
        px(im, 7 + i, 24 - i, (255, 255, 255, 255))
    rect(im, 3, 24, 8, 28, GOLD)      # 护手
    rect(im, 1, 28, 4, 30, WOOD)      # 柄
    px(im, 3, 27, GOLD)
    return save(im, "slot_weapon")


def slot_head():
    """冠：玉冠"""
    im = new_canvas()
    rect(im, 7, 14, 24, 22, GOLD)
    rect(im, 9, 16, 22, 20, (250, 225, 160, 255))
    for x in (9, 14, 19, 24):
        rect(im, x, 10, x + 1, 15, GOLD)
    px(im, 10, 11, JADE)
    px(im, 15, 11, JADE)
    px(im, 20, 11, JADE)
    px(im, 25, 11, JADE)
    rect(im, 8, 23, 23, 25, (150, 104, 62, 255))
    return save(im, "slot_head")


def slot_robe():
    """袍：道袍"""
    im = new_canvas()
    rect(im, 11, 6, 20, 12, JADE)          # 领
    for y in range(12, 27):
        w = 3 + (y - 12) // 3
        rect(im, 15 - w, y, 16 + w, y, (70, 150, 130, 255) if y % 6 else (86, 176, 150, 255))
    rect(im, 15, 12, 16, 27, GOLD)         # 中缝
    px(im, 14, 20, GOLD)
    px(im, 17, 20, GOLD)
    return save(im, "slot_robe")


def slot_boots():
    """靴"""
    im = new_canvas()
    rect(im, 9, 8, 13, 22, (60, 66, 84, 255))
    rect(im, 18, 8, 22, 22, (60, 66, 84, 255))
    rect(im, 8, 22, 15, 26, WOOD)
    rect(im, 17, 22, 24, 26, WOOD)
    rect(im, 8, 26, 15, 28, (110, 76, 44, 255))
    rect(im, 17, 26, 24, 28, (110, 76, 44, 255))
    rect(im, 9, 6, 13, 8, (46, 52, 68, 255))
    rect(im, 18, 6, 22, 8, (46, 52, 68, 255))
    return save(im, "slot_boots")


def slot_pendant():
    """玉佩：环 + 流苏"""
    im = new_canvas()
    for a in range(0, 360, 6):
        import math
        x = 15 + int(7 * math.cos(math.radians(a)))
        y = 14 + int(7 * math.sin(math.radians(a)))
        px(im, x, y, JADE)
        px(im, x, y + 1, (70, 150, 130, 255))
    px(im, 15, 14, (255, 255, 255, 255))
    rect(im, 15, 21, 16, 27, RED)
    px(im, 15, 28, RED)
    px(im, 16, 28, RED)
    return save(im, "slot_pendant")


def slot_ring():
    """戒：金环 + 灵石"""
    im = new_canvas()
    for a in range(0, 360, 6):
        import math
        x = 15 + int(7 * math.cos(math.radians(a)))
        y = 18 + int(7 * math.sin(math.radians(a)))
        px(im, x, y, GOLD)
    px(im, 15, 6, BLUE)
    px(im, 14, 7, BLUE)
    px(im, 16, 7, BLUE)
    px(im, 15, 8, (180, 220, 255, 255))
    return save(im, "slot_ring")


def app_icon(size, name):
    """App 图标：主角立绘 + 灵石"""
    hero = Image.open(os.path.join(ROOT, "assets", "game", "anim", "hero", "swordsman_idle.png")).convert("RGBA")
    cell_w, cell_h = 111, 81
    hero = hero.crop((0, 0, cell_w, cell_h))

    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for y in range(size):
        t = y / size
        bg.paste((int(20 + 30 * t), int(28 + 40 * t), int(40 + 36 * t), 255), (0, y, size, y + 1))
    from PIL import ImageDraw
    d = ImageDraw.Draw(bg)
    pad = int(size * 0.06)
    d.rectangle([pad, pad, size - pad, size - pad], outline=JADE, width=max(2, size // 48))

    scale = int(size * 0.62 / cell_h)
    w, h = cell_w * scale, cell_h * scale
    bg.alpha_composite(hero.resize((w, h), Image.NEAREST), ((size - w) // 2, int(size * 0.78) - h))

    stone = Image.open(os.path.join(ROOT, "assets", "game", "ui", "ui_xianxia_item_spirit_stone.png")).convert("RGBA")
    ss = int(size * 0.22)
    bg.alpha_composite(stone.resize((ss, ss), Image.NEAREST), (size - pad - ss, pad))
    bg.convert("RGB").save(os.path.join(OUT, name))
    return name


if __name__ == "__main__":
    made = [slot_weapon(), slot_head(), slot_robe(), slot_boots(), slot_pendant(), slot_ring()]
    app_icon(192, "icon-192.png")
    app_icon(512, "icon-512.png")
    app_icon(180, "apple-touch-icon.png")
    print("生成图标:", made, "+ app icons")
