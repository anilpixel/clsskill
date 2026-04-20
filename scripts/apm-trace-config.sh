#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${APM_TRACE_ENV_FILE:-${CLSCLI_ENV_FILE:-${SKILL_DIR}/.env.clscli.local}}"
ENV_FILE_DISPLAY="${ENV_FILE}"
if [[ "${ENV_FILE}" == "${SKILL_DIR}/"* ]]; then
  ENV_FILE_DISPLAY="${ENV_FILE#${SKILL_DIR}/}"
fi

print_usage() {
  cat <<'EOF'
用法：
  ./scripts/apm-trace-config.sh --instance-id <InstanceId> [--business-name <BusinessName>] [--region <region>] [--secret-id <SecretId>] [--secret-key <SecretKey>]

说明：
  该脚本会把腾讯云 APM 调用链查询所需配置写入 skill 根目录下的本地配置文件。
  默认文件：.env.clscli.local
EOF
}

SECRET_ID=""
SECRET_KEY=""
REGION=""
INSTANCE_ID=""
BUSINESS_NAME=""

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  SECRET_ID="${TENCENTCLOUD_SECRET_ID:-}"
  SECRET_KEY="${TENCENTCLOUD_SECRET_KEY:-}"
  REGION="${TENCENTCLOUD_REGION:-}"
  INSTANCE_ID="${TENCENTCLOUD_APM_INSTANCE_ID:-}"
  BUSINESS_NAME="${TENCENTCLOUD_APM_BUSINESS_NAME:-}"
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --secret-id)
      SECRET_ID="${2:-}"
      shift 2
      ;;
    --secret-key)
      SECRET_KEY="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --instance-id)
      INSTANCE_ID="${2:-}"
      shift 2
      ;;
    --business-name)
      BUSINESS_NAME="${2:-}"
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "未知参数：$1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
done

MISSING_VARS=()
[[ -z "${SECRET_ID}" ]] && MISSING_VARS+=("TENCENTCLOUD_SECRET_ID")
[[ -z "${SECRET_KEY}" ]] && MISSING_VARS+=("TENCENTCLOUD_SECRET_KEY")
[[ -z "${REGION}" ]] && MISSING_VARS+=("TENCENTCLOUD_REGION")
[[ -z "${INSTANCE_ID}" ]] && MISSING_VARS+=("TENCENTCLOUD_APM_INSTANCE_ID")

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  echo "配置不完整，缺少字段：${MISSING_VARS[*]}" >&2
  print_usage >&2
  exit 1
fi

mkdir -p "$(dirname "${ENV_FILE}")"

TMP_FILE="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
chmod 600 "${TMP_FILE}"

{
  printf 'TENCENTCLOUD_SECRET_ID=%q\n' "${SECRET_ID}"
  printf 'TENCENTCLOUD_SECRET_KEY=%q\n' "${SECRET_KEY}"
  printf 'TENCENTCLOUD_REGION=%q\n' "${REGION}"
  printf 'TENCENTCLOUD_APM_INSTANCE_ID=%q\n' "${INSTANCE_ID}"
  if [[ -n "${BUSINESS_NAME}" ]]; then
    printf 'TENCENTCLOUD_APM_BUSINESS_NAME=%q\n' "${BUSINESS_NAME}"
  fi
} > "${TMP_FILE}"

mv "${TMP_FILE}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

echo "已写入本地配置：${ENV_FILE_DISPLAY}"
