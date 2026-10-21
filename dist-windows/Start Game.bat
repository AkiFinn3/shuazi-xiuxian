@echo off
chcp 65001 >nul
title Who Let This Grinder Cultivate
cd /d "%~dp0"

rem ---- start local server (built-in PowerShell, nothing to install) ----
start "" /min powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"

rem ---- wait for the port, then open the browser ----
set /a tries=0
:wait
timeout /t 1 /nobreak >nul
set /a tries+=1
powershell -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient; try{$c.Connect('127.0.0.1',8231);$c.Close();exit 0}catch{exit 1}" >nul 2>&1
if %tries% lss 25 goto wait

start "" "http://127.0.0.1:8231/index.html"
echo.
echo  Game started. It runs in a browser tab - keep this small window open.
echo  Save data lives in this browser. To move to another PC:
echo  in-game "Settings - Export save", then "Import save" on the new PC.
echo.
pause
