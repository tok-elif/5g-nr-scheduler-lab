@echo off
setlocal
cd /d "%~dp0"

where node.exe >nul 2>nul
if errorlevel 1 (
  echo HATA: Node.js bulunamadi.
  echo Node.js kurup bu dosyayi yeniden calistirin.
  pause
  exit /b 1
)

echo.
echo === Bagimliliklar kontrol ediliyor ===
if not exist "node_modules\vite\bin\vite.js" (
  echo node_modules bulunamadi. npm ci calistiriliyor...
  call npm.cmd ci
  if errorlevel 1 (
    echo.
    echo npm ci basarisiz oldu. npm install deneniyor...
    call npm.cmd install
    if errorlevel 1 (
      echo HATA: Bagimliliklar kurulamadi.
      pause
      exit /b 1
    )
  )
)

echo.
echo === 5G NR Scheduler baslatiliyor ===
echo Tarayici adresi: http://127.0.0.1:5173
call npm.cmd run dev -- --host 127.0.0.1
set RC=%ERRORLEVEL%

echo.
echo Program sonlandi. Hata kodu: %RC%
pause
exit /b %RC%
