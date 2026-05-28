@echo off
setlocal
cd /d "%~dp0"
title DC Bot Full Restart

echo ==========================================
echo   DC Bot Full Restart
echo ==========================================
echo.

echo [1/4] Stop old Node processes
taskkill /IM node.exe /F >nul 2>nul

echo.
echo [2/4] Install dependencies if needed
call npm.cmd install
if errorlevel 1 goto :failed

echo.
echo [3/4] Build latest bot and website
call npm.cmd run build
if errorlevel 1 goto :failed

echo.
echo [4/4] Start bot and website
call npm.cmd run lan
if errorlevel 1 goto :failed

echo.
echo Done.
pause
exit /b 0

:failed
echo.
echo Failed. Please check the error messages above.
pause
exit /b 1
