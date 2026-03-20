#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_PATH="${SCRIPT_DIR}/wrangler.json"
LOG_PATH="${SCRIPT_DIR}/wrangler.dev.log"
PID_PATH="${SCRIPT_DIR}/wrangler.dev.pid"

cd "${ROOT_DIR}"

PATTERN="wrangler dev.*${CONFIG_PATH}|wrangler dev.*worker/wrangler.json|npx wrangler dev.*${CONFIG_PATH}|npx wrangler dev.*worker/wrangler.json"

if [[ -f "${PID_PATH}" ]]; then
  OLD_PID="$(cat "${PID_PATH}")"
  if [[ -n "${OLD_PID}" ]] && ps -p "${OLD_PID}" >/dev/null 2>&1; then
    echo "Stopping previous worker dev pid=${OLD_PID}..."
    kill "${OLD_PID}" || true
    sleep 1
  fi
  rm -f "${PID_PATH}"
fi

if pgrep -af "${PATTERN}" >/dev/null 2>&1; then
  echo "Stopping existing worker dev processes..."
  pkill -f "${PATTERN}" || true
  sleep 1
fi

if pgrep -af "${PATTERN}" >/dev/null 2>&1; then
  echo "Worker dev processes are still running; forcing stop..."
  pkill -9 -f "${PATTERN}" || true
  sleep 1
fi

echo "Starting worker dev..."
: > "${LOG_PATH}"
setsid bash -lc "cd '${ROOT_DIR}' && exec npx wrangler dev -c '${CONFIG_PATH}'" >>"${LOG_PATH}" 2>&1 &
sleep 4

NEW_PID="$(pgrep -af "${PATTERN}" | awk 'NR==1 {print $1}')"

if [[ -n "${NEW_PID:-}" ]] && ps -p "${NEW_PID}" >/dev/null 2>&1; then
  echo "${NEW_PID}" > "${PID_PATH}"
  echo "Worker dev started. pid=${NEW_PID}"
  echo "log=${LOG_PATH}"
else
  echo "Worker dev failed to start. Check log: ${LOG_PATH}" >&2
  exit 1
fi
