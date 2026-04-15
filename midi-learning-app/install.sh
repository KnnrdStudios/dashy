#!/usr/bin/env bash
# =============================================================================
#  Signal — MIDI & Mixer Learning Studio
#  Installer for Ubuntu / WSL (Ubuntu on Windows)
# =============================================================================
#  Installs Signal to ~/.local/share/signal-midi and adds a `signal` command
#  to ~/.local/bin that serves the app and opens it in a MIDI-capable browser.
#
#  Usage:
#      ./install.sh                  # install
#      ./install.sh --uninstall      # remove everything
#      ./install.sh --run            # install (if needed) and launch
# =============================================================================

set -euo pipefail

APP_NAME="signal-midi"
APP_PRETTY="Signal"
INSTALL_DIR="${HOME}/.local/share/${APP_NAME}"
BIN_DIR="${HOME}/.local/bin"
LAUNCHER="${BIN_DIR}/signal"
DESKTOP_FILE="${HOME}/.local/share/applications/${APP_NAME}.desktop"
DEFAULT_PORT="${SIGNAL_PORT:-8731}"

# ---- Pretty output ----
if [ -t 1 ]; then
  C_OFF=$'\033[0m'; C_B=$'\033[1m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_R=$'\033[31m'; C_C=$'\033[36m'
else
  C_OFF=""; C_B=""; C_G=""; C_Y=""; C_R=""; C_C=""
fi
say()  { printf "%s==>%s %s\n" "$C_C" "$C_OFF" "$*"; }
ok()   { printf "%s ✓ %s%s\n"  "$C_G" "$*" "$C_OFF"; }
warn() { printf "%s ⚠ %s%s\n"  "$C_Y" "$*" "$C_OFF"; }
err()  { printf "%s ✖ %s%s\n"  "$C_R" "$*" "$C_OFF" 1>&2; }

# ---- Detect environment ----
is_wsl() {
  [ -n "${WSL_DISTRO_NAME:-}" ] || grep -qEi '(Microsoft|WSL)' /proc/version 2>/dev/null
}

detect_env() {
  if is_wsl; then echo "wsl"; return; fi
  if [ "$(uname -s)" = "Linux" ]; then echo "linux"; return; fi
  echo "unknown"
}

ENV_KIND="$(detect_env)"

# ---- Dependency checks ----
have() { command -v "$1" >/dev/null 2>&1; }

check_python() {
  if have python3; then return 0; fi
  warn "python3 not found — needed for the local web server."
  if have apt-get && [ "$ENV_KIND" != "unknown" ]; then
    read -r -p "Install python3 via apt now? [Y/n] " ans
    if [ -z "$ans" ] || [ "$ans" = "y" ] || [ "$ans" = "Y" ]; then
      sudo apt-get update && sudo apt-get install -y python3
    fi
  fi
  have python3
}

check_browser_native() {
  for b in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge brave-browser; do
    if have "$b"; then BROWSER_CMD="$b"; return 0; fi
  done
  return 1
}

offer_install_chromium() {
  warn "No MIDI-capable browser found (Chrome / Chromium / Edge / Brave)."
  if have apt-get; then
    read -r -p "Install chromium-browser via apt now? [y/N] " ans
    if [ "$ans" = "y" ] || [ "$ans" = "Y" ]; then
      sudo apt-get update
      sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium || true
    fi
  fi
}

# ---- Commands ----
cmd_uninstall() {
  say "Uninstalling ${APP_PRETTY}…"
  rm -rf "$INSTALL_DIR"
  rm -f  "$LAUNCHER"
  rm -f  "$DESKTOP_FILE"
  ok "Removed."
}

cmd_install() {
  say "Installing ${APP_PRETTY} to ${INSTALL_DIR}"
  mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$(dirname "$DESKTOP_FILE")"

  # Copy app sources
  local SRC
  SRC="$(cd "$(dirname "$0")" && pwd)"
  cp -r "$SRC/index.html" "$SRC/css" "$SRC/js" "$INSTALL_DIR/"
  if [ -f "$SRC/README.md" ]; then cp "$SRC/README.md" "$INSTALL_DIR/"; fi
  ok "App files copied."

  # Dependencies
  if ! check_python; then
    err "python3 is required. Aborting."
    exit 1
  fi
  ok "python3 available."

  if [ "$ENV_KIND" = "wsl" ]; then
    say "WSL detected. Signal will serve from WSL and open in your Windows browser"
    say "so the Akai MPK Mini is visible via Web MIDI."
    warn "Tip: make sure your MPK Mini is plugged into Windows (not forwarded via usbipd) for best results."
  else
    if ! check_browser_native; then
      offer_install_chromium
      check_browser_native || warn "You can still run Signal via any Chromium-based browser manually."
    else
      ok "Browser detected: $BROWSER_CMD"
    fi
  fi

  # Create launcher
  cat > "$LAUNCHER" <<'LAUNCH_EOF'
#!/usr/bin/env bash
# Signal launcher — starts a local web server in the app dir and opens a browser.
set -euo pipefail
APP_DIR="__INSTALL_DIR__"
PORT="${SIGNAL_PORT:-__DEFAULT_PORT__}"
URL="http://localhost:${PORT}/"

is_wsl() {
  [ -n "${WSL_DISTRO_NAME:-}" ] || grep -qEi '(Microsoft|WSL)' /proc/version 2>/dev/null
}

# If port busy, try the next 10 ports.
pick_port() {
  local p=$PORT
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if ! (echo > /dev/tcp/127.0.0.1/$p) >/dev/null 2>&1; then
      PORT=$p; URL="http://localhost:${PORT}/"
      return 0
    fi
    p=$((p+1))
  done
}
pick_port

cd "$APP_DIR"
echo "Signal serving from $APP_DIR on $URL"
# Start server in background
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT INT TERM

# Give it a beat to start
sleep 0.5

# Open browser
if is_wsl; then
  # Use Windows browser so MIDI + audio work natively
  if command -v wslview >/dev/null 2>&1; then
    wslview "$URL" || true
  elif command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c start "" "$URL" 2>/dev/null || true
  elif command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Start-Process '$URL'" || true
  else
    echo "Could not find a Windows browser launcher. Open $URL manually."
  fi
else
  for cand in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge brave-browser xdg-open; do
    if command -v "$cand" >/dev/null 2>&1; then
      if [ "$cand" = "xdg-open" ]; then
        "$cand" "$URL" &
      else
        "$cand" --app="$URL" >/dev/null 2>&1 &
      fi
      break
    fi
  done
fi

echo "Press Ctrl+C to stop the server."
wait $SERVER_PID
LAUNCH_EOF

  sed -i "s|__INSTALL_DIR__|${INSTALL_DIR//|/\\|}|g" "$LAUNCHER"
  sed -i "s|__DEFAULT_PORT__|${DEFAULT_PORT}|g"      "$LAUNCHER"
  chmod +x "$LAUNCHER"
  ok "Launcher installed at $LAUNCHER"

  # Desktop entry (native Linux only — WSL with WSLg also honours it)
  cat > "$DESKTOP_FILE" <<DESK_EOF
[Desktop Entry]
Type=Application
Name=${APP_PRETTY}
Comment=MIDI & Mixer Learning Studio
Exec=${LAUNCHER}
Icon=audio-x-generic
Terminal=false
Categories=AudioVideo;Audio;Music;Education;
DESK_EOF
  ok "Desktop entry installed."

  # PATH hint
  if ! echo ":$PATH:" | grep -q ":${BIN_DIR}:"; then
    warn "${BIN_DIR} is not on your PATH."
    echo "    Add this to your ~/.bashrc or ~/.zshrc:"
    echo "      export PATH=\"\$HOME/.local/bin:\$PATH\""
  fi

  echo
  ok "Installation complete!"
  echo
  echo "  Launch:  ${C_B}signal${C_OFF}    (or: ${LAUNCHER})"
  echo "  Env var: SIGNAL_PORT=9000 signal  (change port)"
  echo
  if [ "$ENV_KIND" = "wsl" ]; then
    echo "  ${C_B}WSL notes:${C_OFF}"
    echo "   • Plug the MPK Mini into your Windows host directly."
    echo "   • Windows will open its default browser — use Chrome, Edge or Brave for Web MIDI."
    echo "   • Audio comes out of Windows speakers via WSLg → no extra setup."
  else
    echo "  ${C_B}Linux notes:${C_OFF}"
    echo "   • Ensure your user is in the 'audio' group (needed for ALSA):"
    echo "       sudo usermod -aG audio \$USER"
    echo "   • Plug the MPK Mini in BEFORE launching the app."
  fi
  echo
}

cmd_run() {
  [ -d "$INSTALL_DIR" ] || cmd_install
  exec "$LAUNCHER"
}

# ---- Dispatch ----
case "${1:-install}" in
  -u|--uninstall) cmd_uninstall ;;
  -r|--run)       cmd_run ;;
  -h|--help)
    cat <<HELP
Signal installer
Usage:
  $0                install Signal to ~/.local/share/${APP_NAME}
  $0 --run          install (if needed) and launch the app
  $0 --uninstall    remove Signal and its launcher

Environment:
  SIGNAL_PORT       local server port (default: ${DEFAULT_PORT})
HELP
    ;;
  *) cmd_install ;;
esac
