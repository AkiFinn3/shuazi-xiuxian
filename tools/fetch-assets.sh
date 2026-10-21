#!/usr/bin/env bash
# 重新下载 Xianxia Pixel Pack（CC0）并加工成引擎可用的动画条
# 用法: ./tools/fetch-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="xianxia-pixel-pack"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
OUT="assets/raw"

mkdir -p "$OUT"
JAR="$(mktemp)"
PAGE="$(mktemp)"

echo "→ 取得下载页"
curl -sL --retry 3 --retry-all-errors -4 -c "$JAR" -b "$JAR" -A "$UA" \
  "https://willyee.itch.io/${SLUG}/purchase" -o "$PAGE"

CSRF=$(python3 - "$PAGE" <<'PY'
import re, sys
html = open(sys.argv[1], encoding='utf-8', errors='replace').read()
m = re.search(r'csrf_token" value="([^"]+)"', html)
print(m.group(1))
PY
)

echo "→ 申请下载链接"
RESP=$(curl -s --retry 3 --retry-all-errors -4 -c "$JAR" -b "$JAR" -A "$UA" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Referer: https://willyee.itch.io/${SLUG}/purchase" \
  --data-urlencode "csrf_token=${CSRF}" \
  "https://willyee.itch.io/${SLUG}/file/19514395?source=game_download&after_download_lightbox=1&as_props=1")

URL=$(python3 - "$RESP" <<'PY'
import json, sys
print(json.loads(sys.argv[1])['url'])
PY
)

echo "→ 下载（约 45MB）"
curl -sL --retry 3 --retry-all-errors -4 -A "$UA" "$URL" -o "${OUT}/${SLUG}.zip"

echo "→ 解包"
rm -rf "${OUT}/pack"
mkdir -p "${OUT}/pack"
unzip -q -o "${OUT}/${SLUG}.zip" -d "${OUT}/pack"

rm -f "$JAR" "$PAGE"
echo "→ 加工资源"
python3 tools/build_assets.py
echo "完成。资源位于 assets/game/"
