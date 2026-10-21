#!/usr/bin/env python3
"""
生成三个端的正式发布文件夹（含署名与授权），并打包 zip。

    release/
      谁让这个刷子修仙的-v1.0.0-macOS/
      谁让这个刷子修仙的-v1.0.0-Windows/
      谁让这个刷子修仙的-v1.0.0-网页版/
      *.zip
"""
import os
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RELEASE = os.path.join(ROOT, "release")
TITLE = "谁让这个刷子修仙的"
VERSION = "1.0.0"
AUTHOR = "渝州秋 (AkiFinn3)"

CREDITS = """《{title}》 v{version}
{title} —— 挂机刷宝 · 像素修仙 · 离线也赚
==================================================

【署名】
制作 / 程序 / 策划：{author}
发行：{title} v{version}

【美术素材】
Xianxia Pixel Pack
  作者：willYEE
  来源：https://willyee.itch.io/xianxia-pixel-pack
  授权：CC0 1.0 Universal（公共领域，可商用、可修改、无需署名）
  说明：9 位主角（待机/行走/三段连击/施法/受击/死亡）、17 种妖兽、
       3 头守关 Boss、30 组 NPC 立绘、4 套地形、法术特效、兵器图标、玉纹 UI 套件。
  声明：原作者在素材页披露部分图像由 AI 生成后人工逐帧清理，CC0 授权覆盖全部内容。

【字体】
Fusion Pixel 12px（缝合像素字体）
  作者：TakWolf
  来源：https://github.com/TakWolf/fusion-pixel-font
  授权：SIL Open Font License 1.1
Zpix（最像素）
  来源：https://github.com/SolidZORO/zpix-pixel-font
  授权：免费使用（含商用）

【音频】
全部音效与背景提示音由 WebAudio 实时合成（js/engine/audio.js），
未使用任何第三方音频素材。

【界面图标】
装备部位图标、App 图标由本项目脚本绘制（tools/make_icons.py），原创。

【代码与文案】
全部代码、界面、数值表、剧情与文案为原创。

【免责】
本游戏为免费作品，不含内购与广告。
游戏内含成人向情感暗示（不露骨），建议 18 岁以上游玩。
{extra}
"""


def write(path, text):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def build_macos():
    src = os.path.join(ROOT, "build", "macos", "刷子修仙.app")
    if not os.path.isdir(src):
        print("  跳过 macOS（未构建 .app）")
        return None
    out = os.path.join(RELEASE, f"{TITLE}-v{VERSION}-macOS")
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    shutil.copytree(src, os.path.join(out, "刷子修仙.app"))
    write(os.path.join(out, "署名与授权.txt"),
          CREDITS.format(title=TITLE, version=VERSION, author=AUTHOR,
                          extra="\n【macOS 版说明】\n"
                                "双击「刷子修仙.app」即可运行，无需浏览器、无需联网。\n"
                                "首次打开若提示「无法验证开发者」，请右键点��� → 打开 → 打开。\n"
                                "（本作未购买 Apple 开发者证书，故无法做公证与 Gatekeeper 放行。）\n"
                                "存档保存在应用内建的浏览器数据中；换机请在游戏内「设置 - 导出存档」。\n"))
    write(os.path.join(out, "怎么玩.txt"),
          "《%s》\n\n"
          "1. 双击「刷子修仙.app」\n"
          "2. 起个道号（试试「元始天尊」），选出身，进去就是自动战斗\n"
          "3. 空格暂停/继续；右侧六个页签分别是 背包 / 洞府 / 宗门 / 法宝 / 秘境 / 仙缘\n"
          "4. 离线最多算 12 小时，60%% 效率\n\n"
          "问题排查：\n"
          "· 游戏打不开？右键 → 打开。\n"
          "· 画面卡？关掉其他占显存的程序。\n"
          "· 想重新开始？游戏内「设置 - 重开一世」。\n" % TITLE)
    return out


def build_windows():
    out = os.path.join(RELEASE, f"{TITLE}-v{VERSION}-Windows")
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)

    src = os.path.join(ROOT, "dist-windows")
    for f in os.listdir(src):
        s = os.path.join(src, f)
        d = os.path.join(out, f)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

    dist = os.path.join(ROOT, "dist")
    for item in ("index.html", "css", "js", "assets", "manifest.webmanifest", "sw.js"):
        s = os.path.join(dist, item)
        if not os.path.exists(s):
            continue
        d = os.path.join(out, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    shutil.copy2(os.path.join(ROOT, "LICENSES.md"), out)

    write(os.path.join(out, "署名与授权.txt"),
          CREDITS.format(title=TITLE, version=VERSION, author=AUTHOR,
                          extra="\n【Windows 版说明】\n"
                                "双击「Start Game.bat」：会自动用系统自带的 PowerShell 起一个本地服务\n"
                                "（只监听 127.0.0.1，不对外网开放），并自动打开浏览器进入游戏。\n"
                                "不需要安装 Python / Node / 任何运行时。\n"
                                "请保留随附的 start-server.ps1，路径不要改。\n"))
    return out


def build_web():
    out = os.path.join(RELEASE, f"{TITLE}-v{VERSION}-网页版")
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    dist = os.path.join(ROOT, "dist")
    for item in os.listdir(dist):
        s = os.path.join(dist, item)
        d = os.path.join(out, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)
    write(os.path.join(out, "署名与授权.txt"),
          CREDITS.format(title=TITLE, version=VERSION, author=AUTHOR,
                          extra="\n【网页版说明】\n"
                                "纯静态网页，把整个文件夹丢到任意静态托管即可\n"
                                "（GitHub Pages / Cloudflare Pages / Netlify / itch.io）。\n"
                                "index.html 必须在根目录。\n"
                                "手机浏览器打开后「添加到主屏幕」即可当 App 玩，断网也能开。\n"))
    write(os.path.join(out, "部署说明.txt"),
          "把本文件夹里的所有文件（index.html / css / js / assets）一起上传到静态托管根目录。\n"
          "注意：assets/game 是运行必需资源（约 22MB），不能漏。\n")
    return out


def make_zip(folder):
    name = os.path.basename(folder)
    zip_path = os.path.join(RELEASE, name + ".zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        base = os.path.dirname(folder)
        for dp, _, fs in os.walk(folder):
            for f in fs:
                p = os.path.join(dp, f)
                z.write(p, os.path.relpath(p, base))
    return zip_path


if __name__ == "__main__":
    os.makedirs(RELEASE, exist_ok=True)
    for f in os.listdir(RELEASE):
        if f.endswith(".zip") or f.startswith(TITLE):
            p = os.path.join(RELEASE, f)
            if os.path.isdir(p):
                shutil.rmtree(p)
            else:
                os.remove(p)

    folders = [build_macos(), build_windows(), build_web()]
    print("生成文件夹：")
    for f in folders:
        if not f:
            continue
        z = make_zip(f)
        print("  %-44s %s" % (os.path.basename(f) + "/", os.path.basename(z)))
    print("\n发布物：")
    for f in sorted(os.listdir(RELEASE)):
        p = os.path.join(RELEASE, f)
        size = os.path.getsize(p) / 1024 / 1024 if os.path.isfile(p) else 0
        print("  %-46s %s" % (f, ("%.1f MB" % size) if size else "<目录>"))
