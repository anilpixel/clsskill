#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${CLSCLI_ENV_FILE:-${SKILL_DIR}/.env.clscli.local}"
ENV_FILE_DISPLAY="${ENV_FILE}"
if [[ "${ENV_FILE}" == "${SKILL_DIR}/"* ]]; then
  ENV_FILE_DISPLAY="${ENV_FILE#${SKILL_DIR}/}"
fi

print_usage() {
  cat <<EOF
用法：
  ./scripts/clscli-config.sh --secret-id <SecretId> --secret-key <SecretKey> [--region <region>]

说明：
  该脚本会把腾讯云 CLS 凭证写入 skill 根目录下的本地配置文件。
  默认文件：.env.clscli.local
EOF
}

SECRET_ID=""
SECRET_KEY=""
REGION=""
APM_INSTANCE_ID=""
APM_BUSINESS_NAME=""

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  SECRET_ID="${TENCENTCLOUD_SECRET_ID:-}"
  SECRET_KEY="${TENCENTCLOUD_SECRET_KEY:-}"
  REGION="${TENCENTCLOUD_REGION:-}"
  APM_INSTANCE_ID="${TENCENTCLOUD_APM_INSTANCE_ID:-}"
  APM_BUSINESS_NAME="${TENCENTCLOUD_APM_BUSINESS_NAME:-}"
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

if [[ -z "${SECRET_ID}" || -z "${SECRET_KEY}" ]]; then
  echo "缺少必填参数：--secret-id 和 --secret-key" >&2
  print_usage >&2
  exit 1
fi

mkdir -p "$(dirname "${ENV_FILE}")"

TMP_FILE="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
chmod 600 "${TMP_FILE}"

{
  printf 'TENCENTCLOUD_SECRET_ID=%q\n' "${SECRET_ID}"
  printf 'TENCENTCLOUD_SECRET_KEY=%q\n' "${SECRET_KEY}"
  if [[ -n "${REGION}" ]]; then
    printf 'TENCENTCLOUD_REGION=%q\n' "${REGION}"
  fi
  if [[ -n "${APM_INSTANCE_ID}" ]]; then
    printf 'TENCENTCLOUD_APM_INSTANCE_ID=%q\n' "${APM_INSTANCE_ID}"
  fi
  if [[ -n "${APM_BUSINESS_NAME}" ]]; then
    printf 'TENCENTCLOUD_APM_BUSINESS_NAME=%q\n' "${APM_BUSINESS_NAME}"
  fi
} > "${TMP_FILE}"

mv "${TMP_FILE}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

echo "已写入本地配置：${ENV_FILE_DISPLAY}"
