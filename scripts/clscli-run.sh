#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -eq 0 ]]; then
  cat <<'EOF' >&2
用法：
  ./scripts/clscli-run.sh <CLS CLI 子命令及参数>

示例：
  ./scripts/clscli-run.sh topics --region ap-shanghai --limit 20
  ./scripts/clscli-run.sh query --region ap-shanghai -t <TopicId> --last 30m -q "*"
EOF
  exit 1
fi

DIST_CLI="${SCRIPT_DIR}/../tools/cls-query-cli/dist/cli.js"
TOOL_DIR="${SCRIPT_DIR}/../tools/cls-query-cli"
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
  if [[ ! -f "${DIST_CLI}" ]]; then
    return 0
  fi

  if [[ "${TOOL_DIR}/package.json" -nt "${DIST_CLI}" ]]; then
    return 0
  fi

  if [[ "${TOOL_DIR}/package-lock.json" -nt "${DIST_CLI}" ]]; then
    return 0
  fi

  if [[ "${TOOL_DIR}/tsconfig.json" -nt "${DIST_CLI}" ]]; then
    return 0
  fi

  if [[ "${TOOL_DIR}/vitest.config.ts" -nt "${DIST_CLI}" ]]; then
    return 0
  fi

  if find "${TOOL_DIR}/src" -type f -newer "${DIST_CLI}" -print -quit | grep -q .; then
    return 0
  fi

  return 1
}

if needs_install; then
  npm install --prefix "${TOOL_DIR}" >/dev/null
fi

if needs_build; then
  npm run --prefix "${TOOL_DIR}" build >/dev/null
fi

if [[ "$1" == "help" ]]; then
  exec node "${DIST_CLI}" "$@"
fi

for arg in "$@"; do
  if [[ "${arg}" == "-h" || "${arg}" == "--help" ]]; then
    exec node "${DIST_CLI}" "$@"
  fi
done

eval "$("${SCRIPT_DIR}/clscli-env.sh" --export-sh)"
exec node "${DIST_CLI}" "$@"
