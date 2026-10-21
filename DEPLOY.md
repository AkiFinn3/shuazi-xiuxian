# 把游戏发给别人玩

游戏是**纯静态网页**（无后端、无数据库），所以发布非常简单。下面从「最快」到「最正式」排序，挑一种就行。

---

## 0. 一键出正式发布物

```bash
python3 tools/build_release.py
```

产出 `release/` 目录：

| 文件 | 用途 |
|---|---|
| `谁让这个刷子修仙的-v1.0.0-macOS.zip` | macOS 原生 `.app`（双击即玩，不需要浏览器） |
| `谁让这个刷子修仙的-v1.0.0-Windows.zip` | Windows 版（自带启动器，不需要装任何东西） |
| `谁让这个刷子修仙的-v1.0.0-web.zip` | 纯网页版（itch.io 上传 / 静态托管用） |
| `发布说明.md` | 商店页面文案 + 更新日志，直接复制粘贴 |

> macOS 包需要先跑一次 `./tools/build_macos_app.sh`（要 Xcode Command Line Tools）。

---

## 1. 局域网（同一 Wi-Fi，0 成本，马上能用）

```bash
./run.sh
```

- 电脑上玩：<http://localhost:8123>
- **手机上玩**：手机连同一个 Wi-Fi，浏览器打开 `http://192.168.1.46:8123`
  （IP 可能变化，用 `ipconfig getifaddr en0` 查；macOS 防火墙第一次会弹窗，选「允许」）

同一时间只有你电脑上的服务在跑，出了这个 Wi-Fi 就打不开了。

## 2. GitHub Pages（免费、公网链接、推荐）

1. 新建一个 GitHub 仓库（公开的即可）
2. 把 `dist/` 里的文件推到仓库根目录
   ```bash
   cd dist
   git init && git add -A
   git commit -m "发布修仙挂机游戏"
   git branch -M main
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```
3. 仓库 → **Settings → Pages** → Source 选 `main` / `root` → Save
4. 一两分钟后访问 `https://你的用户名.github.io/仓库名/`

> 每次更新游戏：改完代码 → 重新 `python3 tools/build_dist.py` → 在 dist 里 `git add -A && git push`。

## 3. Cloudflare Pages / Netlify / Vercel（拖拽即可，5 分钟上线）

- **Cloudflare Pages**：新建项目 → 「上传资产」→ 把 `dist/` 文件夹拖进去 → 得到 `xxx.pages.dev`
- **Netlify**：app.netlify.com/drop → 拖入 `dist/` 文件夹
- **Vercel**：`npx vercel --prod`（需 Node）或网页拖拽

这三个都自带 HTTPS，手机电脑直接开链接就能玩。

## 4. itch.io（做成正式「游戏页」，可被搜索到）

1. 注册 itch.io → New Project → **HTML** 类型
2. 上传 `release/谁让这个刷子修仙的-v1.0.0-web.zip`（index.html 必须在压缩包根目录）
3. 标题填「谁让这个刷子修仙的」，简介/标签/更新日志直接抄 `发布说明.md`
4. 上传 3-5 张截图（游戏内截图即可），勾选「可下载」和「在浏览器中运行」
5. 发布后别人能在 itch.io 页里直接玩，也能下载

## 5. 临时给朋友看看（隧道，10 秒出公网链接）

```bash
npx localtunnel --port 8123      # 需要 Node
# 或
cloudflared tunnel --url http://localhost:8123
```

会给你一个临时公网地址，朋友关掉页面链接就失效。

---

## 6. 桌面版（真正的"正式游戏"）

`release/` 里已经打好两个桌面包，直接发给别人就行：

- **macOS**：解压后双击 `刷子修仙.app`。原生窗口、无浏览器地址栏、离线可玩。
  别人第一次打开若提示"无法验证开发者"，让他们 **右键 → 打开 → 打开** 即可（没有开发者证书，无法做公证）。
- **Windows**：解压后双击 `Start Game.bat`。会自动启动本地服务并打开浏览器，
  **不需要装任何运行时**（用的是 Windows 自带的 PowerShell）。第一次可能弹防火墙，选"允许"。

自己重新打包：

```bash
./tools/build_macos_app.sh        # 生成 build/macos/刷子修仙.app + dist-macos/*.zip
python3 tools/build_release.py     # 汇总三个平台到 release/
```

> 想上 Steam / Epic 之类需要付费与审核的平台，得先把游戏外壳换成对应引擎的工程；
> 网页版跑不通 SDK 审核。itch.io 是不用审核就能上架的最佳落点。

---

## 手机上更好的体验：装成 App

游戏已内置 PWA（`manifest.webmanifest` + `sw.js`）：

- **iPhone / iPad**：Safari 打开链接 → 分享 → **添加到主屏幕**（全屏无地址栏，像原生 App）
- **Android**：Chrome 打开 → 菜单 → **安装应用 / 添加到主屏幕**
- 装好后**断网也能玩**（资源已缓存），存档存在手机本地

## 存档怎么在设备之间搬家

进度存在浏览器的 localStorage 里，**换设备不会自动同步**。两种办法：

1. **存档码**（精确迁移）：游戏内「设置 → 导出存档」复制那段码，在新设备「导入存档」粘贴 → 进度、装备、境界、仙缘全带走
2. **分享图**（炫耀用）：「仙缘」页 → 生成分享图，PNG 里带道号、称号、战力和存档码前缀

> 注意：不同浏览器、不同域名（8123 与 GitHub Pages 域名）算不同设备，localStorage 不互通，所以要用存档码搬家。

## 小贴士

- 部署的是 `dist/` 而不是整个项目目录：原始素材包 54MB 不需要上线，`dist/` 只留运行必需的文件
- 更新素材后记得重跑 `python3 tools/build_assets.py` 再 `python3 tools/build_dist.py`
- 静态托管的访问速度取决于图片加载：约 350 张图，首次加载 2-5 秒，之后有缓存
