#!/usr/bin/env python3
"""
打包正式发布物到 release/：

    release/
      谁让这个刷子修仙的-v1.0.0-macOS.zip     原生 .app
      谁让这个刷子修仙的-v1.0.0-Windows.zip   Windows 启动包（自带服务器，无需装任何东西）
      谁让这个刷子修仙的-v1.0.0-web.zip       纯网页版（itch.io / 静态托管用）
      发布说明.md                             商店页面文案 + 更新日志

用法: python3 tools/build_release.py
"""
import os
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RELEASE = os.path.join(ROOT, "release")
VERSION = "1.0.0"
TITLE = "谁让这个刷子修仙的"
SHORT = "刷子修仙"


def sh(cmd, cwd=None):
    return subprocess.run(cmd, shell=True, cwd=cwd, check=True,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def zip_folder(src, out, exclude=()):
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for dp, _, fs in os.walk(src):
            for f in fs:
                p = os.path.join(dp, f)
                rel = os.path.relpath(p, src)
                if any(rel.startswith(e) for e in exclude):
                    continue
                z.write(p, rel)


def main():
    if os.path.exists(RELEASE):
        shutil.rmtree(RELEASE)
    os.makedirs(RELEASE)

    print("→ 打包网页版")
    sh("python3 tools/build_dist.py")
    dist = os.path.join(ROOT, "dist")
    web_zip = os.path.join(RELEASE, f"{TITLE}-v{VERSION}-web.zip")
    zip_folder(dist, web_zip, exclude=("README.md", "LICENSES.md"))

    print("→ 打包 Windows 版")
    win_src = os.path.join(ROOT, "dist-windows")
    win_build = os.path.join(ROOT, "build", "windows")
    if os.path.exists(win_build):
        shutil.rmtree(win_build)
    shutil.copytree(win_src, win_build)
    # 把网页资源塞进去
    for item in ("index.html", "css", "js", "assets"):
        s = os.path.join(dist, item)
        if os.path.exists(s):
            d = os.path.join(win_build, item)
            if os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
            else:
                shutil.copy2(s, d)
    shutil.copy2(os.path.join(ROOT, "LICENSES.md"), win_build)
    win_zip = os.path.join(RELEASE, f"{TITLE}-v{VERSION}-Windows.zip")
    zip_folder(win_build, win_zip)

    print("→ 打包 macOS 版")
    mac_zip = None
    mac_build = os.path.join(ROOT, "build", "macos", f"{SHORT}.app")
    if os.path.isdir(mac_build):
        mac_zip = os.path.join(RELEASE, f"{TITLE}-v{VERSION}-macOS.zip")
        zip_folder(os.path.dirname(mac_build), mac_zip)
    else:
        print("   （未找到 .app，请先执行 tools/build_macos_app.sh）")

    print("→ 写发布说明")
    shutil.copy2(os.path.join(ROOT, "发布说明.md"), os.path.join(RELEASE, "发布说明.md"))

    print("\n发布物：")
    for f in sorted(os.listdir(RELEASE)):
        p = os.path.join(RELEASE, f)
        size = os.path.getsize(p) / 1024 / 1024
        print("  %-52s %6.1f MB" % (f, size))
    return 0


if __name__ == "__main__":
    sys.exit(main())
