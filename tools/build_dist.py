#!/usr/bin/env python3
"""
打包可发布的版本到 dist/（只保留运行时需要的文件）。

    python3 tools/build_dist.py

产物可以直接：
  * 上传到 GitHub Pages / Cloudflare Pages / Netlify / Vercel（静态托管）
  * 丢进 itch.io 的 zip 上传
  * 放到任意支持 HTTPS 的静态服务器
"""
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

# (源, 目标) 规则
FILES = [
    ("index.html", "index.html"),
    ("manifest.webmanifest", "manifest.webmanifest"),
    ("sw.js", "sw.js"),
    ("README.md", "README.md"),
    ("LICENSES.md", "LICENSES.md"),
]
DIRS = [
    ("css", "css"),
    ("js", "js"),
    ("assets/game", "assets/game"),
    ("assets/icons", "assets/icons"),
    ("assets/fonts", "assets/fonts"),
]
# 排除的文件（原始素材包、工具脚本等，不必发布）
SKIP_EXT = {".mp4", ".zip", ".tsx", ".tres"}


def copy_tree(src, dst):
    os.makedirs(dst, exist_ok=True)
    for dp, _, fs in os.walk(src):
        rel = os.path.relpath(dp, src)
        for f in fs:
            if os.path.splitext(f)[1].lower() in SKIP_EXT:
                continue
            s = os.path.join(dp, f)
            d = os.path.join(dst, rel, f) if rel != "." else os.path.join(dst, f)
            os.makedirs(os.path.dirname(d), exist_ok=True)
            shutil.copy2(s, d)


def main():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    for src, dst in FILES:
        s = os.path.join(ROOT, src)
        if os.path.exists(s):
            shutil.copy2(s, os.path.join(DIST, dst))
    for src, dst in DIRS:
        s = os.path.join(ROOT, src)
        if os.path.isdir(s):
            copy_tree(s, os.path.join(DIST, dst))

    total = 0
    count = 0
    for dp, _, fs in os.walk(DIST):
        for f in fs:
            total += os.path.getsize(os.path.join(dp, f))
            count += 1
    print("dist/ 已生成：%d 个文件，%.1f MB" % (count, total / 1024 / 1024))
    print("位置：", DIST)
    if total > 100 * 1024 * 1024:
        print("提示：超过 100MB，GitHub 单文件上限 100MB，注意拆分资源。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
