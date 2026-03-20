#!/usr/bin/env bash
set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="${SCRIPT_DIR}/wrangler.json"

echo "Deploying worker from ${CONFIG_PATH} (CI=TRUE)..."

# CI=TRUE を設定して非対話モードで実行
export CI=TRUE
npx wrangler deploy --config "${CONFIG_PATH}"
