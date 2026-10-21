#!/usr/bin/env bash
# 启动本地服务器（ES 模块需要 http 协议）
set -e
PORT="${1:-8123}"
cd "$(dirname "$0")"
echo "谁让这个刷子修仙的  →  http://localhost:${PORT}"
python3 -m http.server "$PORT" --bind 127.0.0.1
