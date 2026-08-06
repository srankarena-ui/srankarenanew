@echo off
title S-Rank Arena - cliente
cd /d "%~dp0"
start "" http://localhost:8788
node server.mjs
pause
