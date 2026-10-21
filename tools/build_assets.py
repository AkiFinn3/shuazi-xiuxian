#!/usr/bin/env python3
"""
把 Xianxia Pixel Pack 加工成游戏可直接使用的动画条 + 资源清单。

输入: assets/raw/pack/Xianxia_Pixel_Pack
输出: assets/game/**        (规范化后的 PNG)
      js/data/sprites.js    (资源清单，供引擎加载)

规则:
  * 每个动画输出为一条横向 strip，所有帧统一 cell 尺寸，内容底部对齐（脚线一致）
  * smooth 动画保留原始 x 坐标，保证身体锚点不漂移
"""
import json
import os
import shutil
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(ROOT, "assets", "raw", "pack", "Xianxia_Pixel_Pack")
OUT = os.path.join(ROOT, "assets", "game")

HEROES = {
    "swordsman": "剑客",
    "heroine": "女侠",
    "spearman": "枪客",
    "monk": "武僧",
    "archer": "弓手",
    "fanscholar": "折扇书生",
    "staffbeggar": "铁杖散人",
    "saber": "刀客",
    "twinblade": "双刀客",
}

MOBS = {
    "bat": "蝠妖",
    "foxdemon": "狐妖",
    "foxfire": "狐火",
    "ghost": "游魂",
    "golem": "石傀",
    "jiangshi": "僵尸",
    "paperdoll": "纸人",
    "peachspirit": "桃妖",
    "skeleton": "骷髅",
    "snake": "妖蛇",
    "soldier": "鬼卒",
    "swordspirit": "剑灵",
    "thunderbird": "雷鸟",
    "toad": "蛤蟆精",
    "treant": "树精",
    "waterghost": "水鬼",
    "wolf": "妖狼",
}

MOB_VARIANTS = {
    "ghost_v_gold": "金煞",
    "ghost_v_violet": "紫煞",
    "jiangshi_v_purple": "紫僵",
    "swordspirit_v_gold": "剑煞",
    "foxfire_v_red": "赤狐火",
}

BOSSES = {
    "ninetail": "九尾狐",
    "fallenimmortal": "堕落剑仙",
    "jiaolong": "蛟龙",
}

NPC_PORTRAITS = [
    "xf_npc_scholar",
    "xf_npc_alchemist",
    "xf_npc_blacksmith",
    "xf_npc_peddler",
    "xf_npc_beggar",
    "xf_npc_princess",
    "xf_npc_fairy",
    "xf_npc_taoist",
    "xf_npc_granny",
    "xf_npc_fortune",
    "xf_npc_boatman",
    "xf_npc_herbalist",
]

TERRAIN_SETS = ["bamboo", "bluestone", "cloud", "redclay"]
TERRAIN_FILES = [
    "ground_body_M",
    "ground_top_M",
    "ground_body_S",
    "platform_top_M",
    "backwall_M",
]

ANIM_DIRS = {
    "characters": os.path.join(PACK, "characters"),
    "characters/smooth": os.path.join(PACK, "characters", "smooth"),
    "fx": os.path.join(PACK, "fx"),
}


def load_pack():
    with open(os.path.join(PACK, "pack.json"), encoding="utf-8") as fh:
        return json.load(fh)


def frame_files(directory, stem):
    """返回某动画的所有帧文件（按序号排序）。"""
    fdir = os.path.join(directory, stem + "_frames")
    if not os.path.isdir(fdir):
        return []
    files = [f for f in os.listdir(fdir) if f.lower().endswith(".png")]
    files.sort(key=lambda f: int("".join(ch for ch in f if ch.isdigit()) or 0))
    return [os.path.join(fdir, f) for f in files]


def build_anim(stem, src_dir, dst_rel, meta=None, fps=8, loop=True):
    """把一个动画合成为统一 cell 的横向 strip。返回 manifest 条目或 None。"""
    files = frame_files(src_dir, stem)
    if not files:
        return None

    imgs = [Image.open(f).convert("RGBA") for f in files]
    cell_w = max(i.width for i in imgs)
    cell_h = max(i.height for i in imgs)

    strip = Image.new("RGBA", (cell_w * len(imgs), cell_h), (0, 0, 0, 0))
    for idx, im in enumerate(imgs):
        alpha = im.getchannel("A")
        bbox = alpha.getbbox()
        if not bbox:
            continue
        # 内容底部对齐到 cell 底部（脚线一致），x 保持原样（保留身体锚点）
        y = cell_h - bbox[3]
        strip.paste(im, (idx * cell_w, y), im)

    dst = os.path.join(OUT, dst_rel + ".png")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    strip.save(dst, optimize=True)
    return {
        "src": os.path.relpath(dst, ROOT).replace(os.sep, "/"),
        "cell": [cell_w, cell_h],
        "frames": len(imgs),
        "fps": fps,
        "loop": bool(loop),
    }


def copy_rel(rel, dst_rel=None):
    src = os.path.join(PACK, rel)
    if not os.path.exists(src):
        return None
    dst = os.path.join(OUT, dst_rel or rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.isdir(src):
        shutil.copytree(src, dst, dirs_exist_ok=True)
    else:
        shutil.copy2(src, dst)
    return os.path.relpath(dst, ROOT).replace(os.sep, "/")


def main():
    if not os.path.isdir(PACK):
        sys.exit("素材包不存在: %s" % PACK)

    pack = load_pack()
    chars = pack["characters"]
    smooth_meta = pack.get("smooth_animations", {})
    manifest = {"anims": {}, "images": {}, "meta": {}}

    # ---------- 主角 ----------
    for hero in HEROES:
        for anim in ("idle", "walk", "attack", "cast", "hurt", "death", "dash", "block"):
            stem = "xf_hero_%s_%s" % (hero, anim)
            smooth_stem = stem
            if smooth_stem in smooth_meta:
                meta = smooth_meta[smooth_stem]
                entry = build_anim(
                    smooth_stem,
                    ANIM_DIRS["characters/smooth"],
                    "anim/hero/%s_%s" % (hero, anim),
                    fps=meta.get("fps", 12),
                    loop=meta.get("loop", anim in ("idle", "walk")),
                )
            else:
                info = chars.get(stem, {})
                entry = build_anim(
                    stem,
                    ANIM_DIRS["characters"],
                    "anim/hero/%s_%s" % (hero, anim),
                    fps=info.get("fps", 8),
                    loop=info.get("loop", anim in ("idle", "walk")),
                )
            if entry:
                manifest["anims"]["hero/%s_%s" % (hero, anim)] = entry
        # 三段连击
        for i in (1, 2, 3):
            stem = "xf_hero_%s_combo%d" % (hero, i)
            meta = smooth_meta.get(stem)
            if meta:
                entry = build_anim(
                    stem,
                    ANIM_DIRS["characters/smooth"],
                    "anim/hero/%s_combo%d" % (hero, i),
                    fps=meta.get("fps", 12),
                    loop=False,
                )
                if entry:
                    manifest["anims"]["hero/%s_combo%d" % (hero, i)] = entry

    # ---------- 妖兽 ----------
    for mob in list(MOBS) + list(MOB_VARIANTS):
        for anim in ("idle", "move", "attack", "hurt", "death"):
            stem = "xf_mob_%s_%s" % (mob, anim)
            entry = build_anim(stem, ANIM_DIRS["characters"], "anim/mob/%s_%s" % (mob, anim),
                               fps=8, loop=anim in ("idle", "move"))
            if entry:
                manifest["anims"]["mob/%s_%s" % (mob, anim)] = entry

    # ---------- BOSS ----------
    for boss in BOSSES:
        for anim in ("idle", "move", "attack_a", "attack_b", "special", "hurt", "death"):
            stem = "xf_boss_%s_%s" % (boss, anim)
            entry = build_anim(stem, ANIM_DIRS["characters"], "anim/boss/%s_%s" % (boss, anim),
                               fps=8, loop=anim in ("idle", "move"))
            if entry:
                manifest["anims"]["boss/%s_%s" % (boss, anim)] = entry

    # ---------- NPC 立绘 ----------
    for npc in NPC_PORTRAITS:
        faces = chars.get(npc, {}).get("faces", ["neutral"])
        for face in faces:
            rel = "characters/%s_%s.png" % (npc, face)
            dst = copy_rel(rel, "npc/%s_%s.png" % (npc, face))
            if dst:
                im = Image.open(os.path.join(PACK, rel))
                manifest["images"]["npc/%s_%s" % (npc, face)] = {
                    "src": dst, "w": im.width, "h": im.height,
                }
        manifest["meta"].setdefault("npc", {})[npc] = {
            "faces": faces,
            "name": chars.get(npc, {}).get("name", npc),
        }

    # ---------- 地形 ----------
    for s in TERRAIN_SETS:
        for t in TERRAIN_FILES:
            rel = "terrain/tr_xianxia_set_%s_%s.png" % (s, t)
            dst = copy_rel(rel, "terrain/%s_%s.png" % (s, t))
            if dst:
                manifest["images"]["terrain/%s_%s" % (s, t)] = {"src": dst, "w": 32, "h": 32}

    # ---------- 背景装饰 ----------
    bg_dir = os.path.join(PACK, "backgrounds")
    for f in sorted(os.listdir(bg_dir)):
        if not f.endswith(".png"):
            continue
        stem = f[:-4]
        info = pack["backgrounds"].get(stem, {})
        dst = copy_rel("backgrounds/" + f, "bg/" + f)
        if dst:
            manifest["images"]["bg/" + stem] = {
                "src": dst, "w": info.get("w", 0), "h": info.get("h", 0),
                "layer": info.get("layer", "mid"), "factor": info.get("factor", 0.18),
                "ground": info.get("ground", True),
            }

    # ---------- 特效（单色，可运行时染色） ----------
    fx_dir = os.path.join(PACK, "fx")
    for f in sorted(os.listdir(fx_dir)):
        if not f.endswith(".png") or f.endswith("_sheet.png"):
            continue
        stem = f[:-4]
        if stem.endswith("_frames"):
            continue
        dst = copy_rel("fx/" + f, "fx/" + f)
        if not dst:
            continue
        im = Image.open(os.path.join(PACK, "fx", f))
        cell = pack.get("fx", {}).get(stem, {}).get("cell", 256)
        frames = max(1, im.width // cell)
        manifest["images"]["fx/" + stem] = {
            "src": dst, "cell": cell, "frames": frames, "w": im.width, "h": im.height,
        }

    # ---------- 图标与 UI ----------
    for sub in ("icons", "ui"):
        d = os.path.join(PACK, sub)
        for f in sorted(os.listdir(d)):
            if not f.endswith(".png"):
                continue
            stem = f[:-4]
            dst = copy_rel("%s/%s" % (sub, f), "%s/%s" % (sub, f))
            if not dst:
                continue
            im = Image.open(os.path.join(PACK, sub, f))
            manifest["images"]["%s/%s" % (sub, stem)] = {
                "src": dst, "w": im.width, "h": im.height,
            }

    # ---------- 武器图标 + 武器贴图 ----------
    wdir = os.path.join(PACK, "weapons")
    for f in sorted(os.listdir(wdir)):
        if not f.endswith(".png"):
            continue
        stem = f[:-4]
        dst = copy_rel("weapons/" + f, "weapons/" + f)
        if dst:
            im = Image.open(os.path.join(PACK, "weapons", f))
            manifest["images"]["weapon/" + stem] = {"src": dst, "w": im.width, "h": im.height}

    out_js = os.path.join(ROOT, "js", "data", "sprites.js")
    os.makedirs(os.path.dirname(out_js), exist_ok=True)
    with open(out_js, "w", encoding="utf-8") as fh:
        fh.write("// 由 tools/build_assets.py 自动生成，请勿手改\n")
        fh.write("export const SPRITES = ")
        fh.write(json.dumps(manifest, ensure_ascii=False, indent=1))
        fh.write(";\n")
        fh.write("export default SPRITES;\n")

    total = sum(os.path.getsize(os.path.join(dp, f))
                for dp, _, fs in os.walk(OUT) for f in fs)
    print("动画 %d 条 / 图片 %d 张 / 输出 %.1f MB" %
          (len(manifest["anims"]), len(manifest["images"]), total / 1024 / 1024))
    print("清单 ->", os.path.relpath(out_js, ROOT))


if __name__ == "__main__":
    main()
