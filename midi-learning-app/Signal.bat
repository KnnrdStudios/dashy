@echo off
rem =========================================================================
rem  Signal — portable Windows launcher (no install required)
rem  Double-click this file from the midi-learning-app folder.
rem =========================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "PORT=8731"
if not "%SIGNAL_PORT%"=="" set "PORT=%SIGNAL_PORT%"

rem --- Find Python ---
set "PYCMD="
for %%P in (python python3 py) do (
  if not defined PYCMD (
    %%P --version >nul 2>&1
    if not errorlevel 1 set "PYCMD=%%P"
  )
)
if not defined PYCMD (
  echo.
  echo  Python 3 is required but was not found on PATH.
  echo.
  echo  Install it one of these ways:
  echo    1. Microsoft Store: search for "Python 3.12"
  echo    2. https://www.python.org/downloads/ ^(check "Add Python to PATH" during install^)
  echo    3. winget install Python.Python.3.12
  echo.
  pause
  exit /b 1
)

rem --- Pick a free port (try PORT..PORT+9) ---
for /L %%i in (0,1,9) do (
  set /a "TRYPORT=%PORT%+%%i"
  netstat -an | find ":!TRYPORT! " | find "LISTENING" >nul
  if errorlevel 1 (
    set "PORT=!TRYPORT!"
    goto :found
  )
)
:found

set "URL=http://localhost:%PORT%/"

echo.
echo  Signal serving from %CD%
echo  URL: %URL%
echo.

rem --- Start server in a separate minimized window ---
start "Signal server" /min "%PYCMD%" -m http.server %PORT% --bind 127.0.0.1

rem --- Give the server a moment ---
timeout /t 1 /nobreak >nul

rem --- Launch browser in app mode (preference order) ---
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app=%URL%
  goto :ok
)
set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app=%URL%
  goto :ok
)
set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app=%URL%
  goto :ok
)
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app=%URL%
  goto :ok
)
set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app=%URL%
  goto :ok
)
set "BRAVE=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
if exist "%BRAVE%" (
  start "" "%BRAVE%" --app=%URL%
  goto :ok
)
echo  (No Chromium-based browser found — opening default browser.)
echo  NOTE: Web MIDI only works in Chrome / Edge / Brave / Chromium.
start "" "%URL%"
:ok

echo.
echo  Signal is running.
echo  Close this window to stop the server.
echo.
pause >nul
