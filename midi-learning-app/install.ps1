# =============================================================================
#  Signal — MIDI & Mixer Learning Studio
#  Native Windows installer (PowerShell)
# =============================================================================
#  Installs Signal to %LOCALAPPDATA%\Signal and creates:
#    - A `signal.cmd` launcher on the PATH
#    - A Start Menu shortcut
#    - A Desktop shortcut (optional)
#
#  Run in PowerShell from the midi-learning-app folder:
#      .\install.ps1
#
#  Flags:
#      .\install.ps1              # install
#      .\install.ps1 -Run         # install and launch
#      .\install.ps1 -Uninstall   # remove everything
#      .\install.ps1 -NoDesktop   # skip desktop shortcut
# =============================================================================

[CmdletBinding()]
param(
    [switch]$Run,
    [switch]$Uninstall,
    [switch]$NoDesktop,
    [int]$Port = 8731
)

$ErrorActionPreference = 'Stop'

$AppName     = 'Signal'
$InstallDir  = Join-Path $env:LOCALAPPDATA 'Signal'
$BinDir      = Join-Path $env:LOCALAPPDATA 'Signal\bin'
$LauncherCmd = Join-Path $BinDir 'signal.cmd'
$StartMenu   = [Environment]::GetFolderPath('Programs')
$Desktop     = [Environment]::GetFolderPath('Desktop')
$ShortcutStart = Join-Path $StartMenu  'Signal.lnk'
$ShortcutDesk  = Join-Path $Desktop    'Signal.lnk'

function Write-Step($msg)  { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host " OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host " !!  $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host " XX  $msg" -ForegroundColor Red }

function Test-Python {
    $candidates = @('python', 'python3', 'py')
    foreach ($c in $candidates) {
        try {
            $ver = & $c --version 2>&1
            if ($LASTEXITCODE -eq 0 -and $ver -match 'Python 3') {
                return $c
            }
        } catch { }
    }
    return $null
}

function Test-Browser {
    $browsers = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles}\BraveSoftware\Brave-Browser\Application\brave.exe",
        "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
    )
    foreach ($b in $browsers) {
        if (Test-Path $b) { return $b }
    }
    return $null
}

function Add-ToUserPath($dir) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($null -eq $userPath) { $userPath = '' }
    $parts = $userPath -split ';' | Where-Object { $_ -ne '' }
    if ($parts -notcontains $dir) {
        $newPath = (@($parts + $dir) -join ';')
        [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
        Write-Ok "Added $dir to your user PATH (restart terminal to pick up)."
    }
}

function New-Shortcut($targetPath, $linkPath, $iconPath) {
    $wsh = New-Object -ComObject WScript.Shell
    $sc  = $wsh.CreateShortcut($linkPath)
    $sc.TargetPath       = $targetPath
    $sc.WorkingDirectory = Split-Path $targetPath -Parent
    $sc.Description      = 'Signal — MIDI & Mixer Learning Studio'
    $sc.WindowStyle      = 7     # minimized (launcher window)
    if ($iconPath -and (Test-Path $iconPath)) { $sc.IconLocation = $iconPath }
    $sc.Save()
}

# ---------- UNINSTALL ----------
if ($Uninstall) {
    Write-Step "Uninstalling $AppName…"
    if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
    if (Test-Path $ShortcutStart) { Remove-Item $ShortcutStart -Force }
    if (Test-Path $ShortcutDesk)  { Remove-Item $ShortcutDesk  -Force }
    Write-Ok "Removed."
    exit 0
}

# ---------- INSTALL ----------
Write-Step "Installing $AppName to $InstallDir"

# Source = the folder this script is in
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path

# Sanity check
$required = @('index.html', 'css\styles.css', 'js\main.js')
foreach ($f in $required) {
    if (-not (Test-Path (Join-Path $Source $f))) {
        Write-Err "Missing $f in $Source — run this script from the midi-learning-app folder."
        exit 1
    }
}

# Fresh install dir
if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
New-Item -ItemType Directory -Path $InstallDir, $BinDir -Force | Out-Null

# Copy sources
Copy-Item (Join-Path $Source 'index.html') $InstallDir -Force
Copy-Item (Join-Path $Source 'css')        $InstallDir -Recurse -Force
Copy-Item (Join-Path $Source 'js')         $InstallDir -Recurse -Force
if (Test-Path (Join-Path $Source 'README.md')) {
    Copy-Item (Join-Path $Source 'README.md') $InstallDir -Force
}
Write-Ok "App files copied."

# Python check
$py = Test-Python
if (-not $py) {
    Write-Warn2 "Python 3 not found on PATH."
    Write-Host "   Install options:"
    Write-Host "     1. Microsoft Store: search 'Python 3.12' (easiest)"
    Write-Host "     2. https://www.python.org/downloads/ (check 'Add to PATH' at install)"
    Write-Host "     3. winget install Python.Python.3.12"
    $ans = Read-Host "Try 'winget install Python.Python.3.12' now? [y/N]"
    if ($ans -eq 'y' -or $ans -eq 'Y') {
        try {
            winget install --id Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
            $py = Test-Python
        } catch {
            Write-Warn2 "winget failed. Install Python manually then re-run this script."
        }
    }
    if (-not $py) {
        Write-Warn2 "Continuing without Python — you'll need it before launching."
    }
}
if ($py) { Write-Ok "Python found: $py" }

# Browser check
$browser = Test-Browser
if ($browser) {
    Write-Ok "Browser found: $browser"
} else {
    Write-Warn2 "No Chromium-based browser detected. Install Chrome, Edge or Brave for Web MIDI."
}

# Create launcher cmd
$launcherContent = @"
@echo off
rem Signal launcher — starts local web server and opens the browser.
setlocal
set "APPDIR=$InstallDir"
set "PORT=$Port"
if not "%SIGNAL_PORT%"=="" set "PORT=%SIGNAL_PORT%"

rem Find Python
set "PYCMD="
for %%P in (python python3 py) do (
  if not defined PYCMD (
    %%P --version >nul 2>&1
    if not errorlevel 1 set "PYCMD=%%P"
  )
)
if not defined PYCMD (
  echo Python 3 is required. Install from https://www.python.org/downloads/
  echo or 'winget install Python.Python.3.12', then try again.
  pause
  exit /b 1
)

rem Try picked port, step up if busy
for /L %%i in (0,1,9) do (
  set /a "TRYPORT=%PORT%+%%i"
  netstat -an | find ":!TRYPORT! " | find "LISTENING" >nul
  if errorlevel 1 (
    set "PORT=!TRYPORT!"
    goto :found
  )
)
:found
setlocal enabledelayedexpansion

echo Signal serving from "%APPDIR%" on http://localhost:%PORT%/
cd /d "%APPDIR%"

rem Start server in background
start "Signal server" /min "%PYCMD%" -m http.server %PORT% --bind 127.0.0.1

rem Give it a moment
timeout /t 1 /nobreak >nul

rem Launch browser in app mode (preference order: Chrome, Edge, Brave, default)
set "URL=http://localhost:%PORT%/"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app=%URL%
  goto :done
)
set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app=%URL%
  goto :done
)
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app=%URL%
  goto :done
)
set "BRAVE=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
if exist "%BRAVE%" (
  start "" "%BRAVE%" --app=%URL%
  goto :done
)
start "" "%URL%"
:done
echo.
echo Signal is running. Close this window to stop the server.
echo (Port: %PORT%)
pause >nul
"@

Set-Content -Path $LauncherCmd -Value $launcherContent -Encoding ASCII
Write-Ok "Launcher installed: $LauncherCmd"

# Add bin dir to PATH
Add-ToUserPath $BinDir

# Shortcuts
New-Shortcut $LauncherCmd $ShortcutStart $null
Write-Ok "Start Menu shortcut created."

if (-not $NoDesktop) {
    New-Shortcut $LauncherCmd $ShortcutDesk $null
    Write-Ok "Desktop shortcut created."
}

Write-Host ""
Write-Ok "$AppName installed."
Write-Host ""
Write-Host "  Launch options:" -ForegroundColor White
Write-Host "    • Double-click Signal on your Desktop or Start Menu"
Write-Host "    • Or type 'signal' in a new Command Prompt / PowerShell"
Write-Host "    • Or run: $LauncherCmd"
Write-Host ""
Write-Host "  Tips:" -ForegroundColor White
Write-Host "    • Plug the Akai MPK Mini in BEFORE launching"
Write-Host "    • Use Chrome, Edge or Brave — Web MIDI doesn't work in Firefox"
Write-Host "    • Click 'Enable audio' on first launch (browsers require a gesture)"
Write-Host ""

if ($Run) {
    Write-Step "Launching Signal…"
    Start-Process -FilePath $LauncherCmd
}
