# 谁让这个刷子修仙的 —— 本地服务器（Windows 自带 PowerShell，无需安装任何东西）
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$port = 8231

# 端口被占用就往后找
$listener = $null
for ($i = 0; $i -lt 20; $i++) {
    try {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Add("http://127.0.0.1:$port/")
        $l.Start()
        $listener = $l
        break
    } catch {
        $port = 8231 + $i + 1
    }
}
if ($null -eq $listener) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show('无法启动本地服务，请关闭占用 8231 端口的程序后重试。', '启动失败') | Out-Null
    exit 1
}

$types = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.woff2' = 'font/woff2'
    '.woff' = 'font/woff'
    '.ttf'  = 'font/ttf'
    '.txt'  = 'text/plain; charset=utf-8'
    '.md'   = 'text/plain; charset=utf-8'
}

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $rel = $ctx.Request.Url.AbsolutePath.TrimStart('/')
        if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
        if ($rel.EndsWith('/')) { $rel += 'index.html' }
        $rel = $rel.Replace('..', '')
        $file = Join-Path $root $rel

        if ((Test-Path -LiteralPath $file -PathType Leaf)) {
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            $ct = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ctx.Response.ContentType = $ct
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $ctx.Response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes('404')
            $ctx.Response.ContentLength64 = $msg.Length
            $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $ctx.Response.Close()
    } catch {
        Start-Sleep -Milliseconds 200
    }
}
