#!/usr/bin/env bash
# 构建 macOS 原生 .app（内嵌网页版资源 + 极简本地服务器）
# 用法: ./tools/build_macos_app.sh
set -euo pipefail
cd "$(dirname "$0")/.."

APP_NAME="刷子修仙"
BUNDLE_ID="com.shuazi.xiuxian"
VERSION="1.0.0"
ROOT="$(pwd)"
BUILD="$ROOT/build/macos"
APP="${BUILD}/${APP_NAME}.app"
DIST="$ROOT/dist-macos"

echo "→ 准备资源"
rm -rf "$BUILD"
mkdir -p "${APP}/Contents/MacOS" "${APP}/Contents/Resources"

python3 tools/build_dist.py >/dev/null
# 资源放在 Resources/game 下，避免和 App 自身的文件混在一起
mkdir -p "${APP}/Contents/Resources/game"
rsync -a --exclude 'LICENSES.md' --exclude 'README.md' dist/ "${APP}/Contents/Resources/game/"
cp LICENSES.md "${APP}/Contents/Resources/game/"

echo "→ 编译"
swiftc -O -whole-module-optimization \
  -framework Cocoa -framework WebKit -framework Network \
  -o "${APP}/Contents/MacOS/Game" app/mac/main.swift

echo "→ 图标"
ICONSET="build/AppIcon.iconset"
rm -rf "$ICONSET"; mkdir -p "$ICONSET"
ICON_PNG="assets/icons/icon-512.png"
for s in 16 32 128 256 512; do
  sips -z $s $s "$ICON_PNG" --out "${ICONSET}/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) "$ICON_PNG" --out "${ICONSET}/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "${APP}/Contents/Resources/AppIcon.icns"

cat > "${APP}/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key><string>谁让这个刷子修仙的</string>
  <key>CFBundleExecutable</key><string>Game</string>
  <key>CFBundleIdentifier</key><string>${BUNDLE_ID}</string>
  <key>CFBundleVersion</key><string>${VERSION}</string>
  <key>CFBundleShortVersionString</key><string>${VERSION}</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>免费游戏，素材 CC0</string>
</dict>
</plist>
PLIST

printf 'APPL????' > "${APP}/Contents/PkgInfo"

echo "→ 签名（ad-hoc）"
codesign --force --deep --sign - "${APP}" 2>/dev/null || true

echo "→ 打包"
rm -rf "$DIST"; mkdir -p "$DIST"
ZIP_PATH="${DIST}/${APP_NAME}-${VERSION}-macOS.zip"
(cd "$BUILD" && zip -q -r "$ZIP_PATH" "${APP_NAME}.app")

SIZE=$(du -sh "$ZIP_PATH" | cut -f1)
echo "完成：${ZIP_PATH} (${SIZE})"
echo "本机运行： open '${APP}'"
