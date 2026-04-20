#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${CLSCLI_ENV_FILE:-${SKILL_DIR}/.env.clscli.local}"
ENV_FILE_DISPLAY="${ENV_FILE}"
if [[ "${ENV_FILE}" == "${SKILL_DIR}/"* ]]; then
  ENV_FILE_DISPLAY="${ENV_FILE#${SKILL_DIR}/}"
fi
MODE="${1:---check}"

print_usage() {
  cat <<'EOF'
用法：
  ./scripts/clscli-env.sh --check
  ./scripts/clscli-env.sh --env-file
  ./scripts/clscli-env.sh --export-sh

说明：
  --check     校验 CLS Node CLI 与本地凭证配置是否可用
  --env-file  输出当前使用的本地配置文件路径
  --export-sh 输出可被 eval 的 export 语句
EOF
}

if [[ "${MODE}" == "--env-file" ]]; then
  echo "${ENV_FILE_DISPLAY}"
  exit 0
fi

if [[ "${MODE}" == "--help" || "${MODE}" == "-h" ]]; then
  print_usage
  exit 0
fi

if [[ "${MODE}" != "--check" && "${MODE}" != "--export-sh" ]]; then
  echo "未知参数：${MODE}" >&2
  print_usage >&2
  exit 1
fi

case "${MODE}" in
  --check)
    if ! command -v node >/dev/null 2>&1; then
      echo "未检测到 Node.js，请先安装 Node。" >&2
      exit 1
    fi

    if [[ ! -f "${ENV_FILE}" ]]; then
      echo "未找到本地配置文件：${ENV_FILE_DISPLAY}" >&2
      echo "可以直接告诉 agent：帮我配置 CLS 凭证，然后提供 SecretId 和 SecretKey。" >&2
      exit 1
    fi

    # shellcheck disable=SC1090
    source "${ENV_FILE}"

    MISSING_VARS=()
    [[ -z "${TENCENTCLOUD_SECRET_ID:-}" ]] && MISSING_VARS+=("TENCENTCLOUD_SECRET_ID")
    [[ -z "${TENCENTCLOUD_SECRET_KEY:-}" ]] && MISSING_VARS+=("TENCENTCLOUD_SECRET_KEY")

    if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
      echo "本地配置缺少字段：${MISSING_VARS[*]}" >&2
      echo "可以直接告诉 agent：帮我重新配置 CLS 凭证。" >&2
      exit 1
    fi

    echo "CLS Node CLI 与本地凭证配置校验通过"
    echo "配置文件：${ENV_FILE_DISPLAY}"
    ;;
  --export-sh)
    if [[ ! -f "${ENV_FILE}" ]]; then
      echo "未找到本地配置文件：${ENV_FILE_DISPLAY}" >&2
      exit 1
    fi

    # shellcheck disable=SC1090
    source "${ENV_FILE}"

    MISSING_VARS=()
    [[ -z "${TENCENTCLOUD_SECRET_ID:-}" ]] && MISSING_VARS+=("TENCENTCLOUD_SECRET_ID")
    [[ -z "${TENCENTCLOUD_SECRET_KEY:-}" ]] && MISSING_VARS+=("TENCENTCLOUD_SECRET_KEY")

    if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
      echo "本地配置缺少字段：${MISSING_VARS[*]}" >&2
      exit 1
    fi

    printf 'export TENCENTCLOUD_SECRET_ID=%q\n' "${TENCENTCLOUD_SECRET_ID}"
    printf 'export TENCENTCLOUD_SECRET_KEY=%q\n' "${TENCENTCLOUD_SECRET_KEY}"
    if [[ -n "${TENCENTCLOUD_REGION:-}" ]]; then
      printf 'export TENCENTCLOUD_REGION=%q\n' "${TENCENTCLOUD_REGION}"
    fi
    ;;
  -h|--help)
    print_usage
    ;;
  *)
    echo "未知参数：${MODE}" >&2
    print_usage >&2
    exit 1
    ;;
esac
