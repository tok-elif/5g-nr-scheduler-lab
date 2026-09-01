@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\vitest\vitest.mjs" (
  echo node_modules bulunamadi. Once KUR_VE_CALISTIR.bat dosyasini calistirin.
  pause
  exit /b 1
)

echo === Version ===
call npm.cmd run version:check
echo.
echo === Test ===
call npm.cmd test
echo.
echo === Lint ===
call npm.cmd run lint
echo.
echo === Build ===
call npm.cmd run build
echo.
pause
