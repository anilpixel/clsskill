#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${APM_TRACE_ENV_FILE:-${CLSCLI_ENV_FILE:-${SKILL_DIR}/.env.clscli.local}}"
TOOL_DIR="${TOOL_DIR_OVERRIDE:-${SKILL_DIR}/tools/apm-trace-cli}"
ENV_FILE_DISPLAY="${ENV_FILE}"
if [[ "${ENV_FILE}" == "${SKILL_DIR}/"* ]]; then
  ENV_FILE_DISPLAY="${ENV_FILE#${SKILL_DIR}/}"
fi

print_usage() {
  cat <<'EOF'
用法：
  ./scripts/apm-trace-env.sh --check
  ./scripts/apm-trace-env.sh --env-file
  ./scripts/apm-trace-env.sh --export-sh

说明：
  --check     校验 APM Node CLI 与本地配置是否可用
  --env-file  输出当前使用的本地配置文件路径
  --export-sh 输出可被 eval 的 export 语句
EOF
}

MODE="${1:---check}"

if [[ "${MODE}" == "--env-file" ]]; then
  echo "${ENV_FILE_DISPLAY}"
  exit 0
fi

if [[ "${MODE}" == "-h" || "${MODE}" == "--help" ]]; then
  print_usage
  exit 0
fi

if ! command -v node >/dev/null 2>&1 && [[ "${MODE}" == "--check" ]]; then
  echo "未检测到 node，请先安装 Node.js。" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "未找到本地配置文件：${ENV_FILE_DISPLAY}" >&2
  echo "可以直接告诉 agent：帮我配置 APM 调用链查询。" >&2
  exit 1
fi

if [[ ! -f "${TOOL_DIR}/package.json" && "${MODE}" == "--check" ]]; then
  echo "未找到 APM Trace CLI 工具目录：${TOOL_DIR}" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

MISSING_VARS=()
[[ -z "${TENCENTCLOUD_SECRET_ID:-}" ]] && MISSING_VARS+=("TENCENTCLOUD_SECRET_ID")
[[ -z "${TENCENTCLOUD_SECRET_KEY:-}" ]] && MISSING_VARS+=("TENCENTCLOUD_SECRET_KEY")
[[ -z "${TENCENTCLOUD_REGION:-}" ]] && MISSING_VARS+=("TENCENTCLOUD_REGION")

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  echo "本地配置缺少字段：${MISSING_VARS[*]}" >&2
  echo "可以直接告诉 agent：帮我配置 APM 调用链查询。" >&2
  exit 1
fi

case "${MODE}" in
  --check)
    echo "APM Node CLI 与本地配置校验通过"
    echo "配置文件：${ENV_FILE_DISPLAY}"
    if [[ -n "${TENCENTCLOUD_APM_INSTANCE_ID:-}" ]]; then
      echo "已配置 APM InstanceId：${TENCENTCLOUD_APM_INSTANCE_ID}"
    else
      echo "未配置 TENCENTCLOUD_APM_INSTANCE_ID，可先运行 ./scripts/apm-trace-run.sh instances"
    fi
    ;;
  --export-sh)
    printf 'export TENCENTCLOUD_SECRET_ID=%q\n' "${TENCENTCLOUD_SECRET_ID}"
    printf 'export TENCENTCLOUD_SECRET_KEY=%q\n' "${TENCENTCLOUD_SECRET_KEY}"
    printf 'export TENCENTCLOUD_REGION=%q\n' "${TENCENTCLOUD_REGION}"
    if [[ -n "${TENCENTCLOUD_APM_INSTANCE_ID:-}" ]]; then
      printf 'export TENCENTCLOUD_APM_INSTANCE_ID=%q\n' "${TENCENTCLOUD_APM_INSTANCE_ID}"
    fi
    if [[ -n "${TENCENTCLOUD_APM_BUSINESS_NAME:-}" ]]; then
      printf 'export TENCENTCLOUD_APM_BUSINESS_NAME=%q\n' "${TENCENTCLOUD_APM_BUSINESS_NAME}"
    fi
    ;;
  *)
    echo "未知参数：${MODE}" >&2
    print_usage >&2
    exit 1
    ;;
esac
