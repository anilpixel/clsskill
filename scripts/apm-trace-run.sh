#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TOOL_DIR="${SKILL_DIR}/tools/apm-trace-cli"
ENV_FILE="${APM_TRACE_ENV_FILE:-${CLSCLI_ENV_FILE:-${SKILL_DIR}/.env.clscli.local}}"
NODE_MODULES_DIR="${TOOL_DIR}/node_modules"
NODE_MODULES_LOCK="${NODE_MODULES_DIR}/.package-lock.json"

needs_install() {
  if [[ ! -d "${NODE_MODULES_DIR}" ]]; then
    return 0
  fi

  if [[ ! -f "${NODE_MODULES_LOCK}" ]]; then
    return 0
  fi

  if [[ "${TOOL_DIR}/package.json" -nt "${NODE_MODULES_LOCK}" ]]; then
    return 0
  fi

  if [[ "${TOOL_DIR}/package-lock.json" -nt "${NODE_MODULES_LOCK}" ]]; then
    return 0
  fi

  return 1
}

needs_build() {
  if [[ ! -f "${TOOL_DIR}/dist/cli.js" ]]; then
    return 0
  fi

  if [[ "${TOOL_DIR}/package.json" -nt "${TOOL_DIR}/dist/cli.js" ]]; then
    return 0
  fi

  if [[ "${TOOL_DIR}/package-lock.json" -nt "${TOOL_DIR}/dist/cli.js" ]]; then
    return 0
  fi

  if [[ "${TOOL_DIR}/tsconfig.json" -nt "${TOOL_DIR}/dist/cli.js" ]]; then
    return 0
  fi

  if find "${TOOL_DIR}/src" -type f -newer "${TOOL_DIR}/dist/cli.js" -print -quit | grep -q .; then
    return 0
  fi

  return 1
}

if [[ $# -eq 0 ]]; then
  cat <<'EOF' >&2
用法：
  ./scripts/apm-trace-run.sh <子命令及参数>

示例：
  ./scripts/apm-trace-run.sh search --trace-id <traceId> --last 15m
  ./scripts/apm-trace-run.sh get --trace-id <traceId> --last 15m
EOF
  exit 1
fi

if needs_install; then
  npm install --prefix "${TOOL_DIR}" >/dev/null
fi

if needs_build; then
  npm run --prefix "${TOOL_DIR}" build >/dev/null
fi

if [[ "$1" != "search" && "$1" != "get" && "$1" != "instances" && "$1" != "raw" ]]; then
  exec node "${TOOL_DIR}/dist/cli.js" "$@"
fi

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

exec node "${TOOL_DIR}/dist/cli.js" "$@"
