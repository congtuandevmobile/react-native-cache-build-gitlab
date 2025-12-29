#!/bin/bash
PROJECT_ID=1234
PACKAGE_NAME="mobile-artifacts"
PACKAGE_VERSION="1.0.0"
REGISTRY_SERVER="https://domain-gitlab.com.vn"

FILE_PATH="$1"
FILE_UPLOAD_NAME="$2"
PLATFORM="$3"

HEADERS="PRIVATE-TOKEN: $CI_JOB_TOKEN"

if [[ "$CI" == "true" ]]; then
    HEADERS="JOB-TOKEN: $CI_JOB_TOKEN"
fi

derive_fp_from_basename() {
  local dir_base="$1"
  local lastdash="${dir_base##*-}"
  echo "$lastdash"
}

TMP_DIR=""
UPLOAD_FILE="$FILE_PATH"

if [[ -d "$FILE_PATH" ]]; then
  base="$(basename "$FILE_PATH")"
  TMP_DIR="$(mktemp -d)"
  ZIP_NAME="$FILE_UPLOAD_NAME"
  [[ "$ZIP_NAME" != *.zip && "$ZIP_NAME" != *.tar.gz ]] && ZIP_NAME="${FILE_UPLOAD_NAME%.*}.zip"

  echo "Zipping folder → ${TMP_DIR}/${ZIP_NAME}"
  (cd "$FILE_PATH" && zip -qry "${TMP_DIR}/${ZIP_NAME}" .)

  UPLOAD_FILE="${TMP_DIR}/${ZIP_NAME}"
fi

if [[ ! -f "$UPLOAD_FILE" ]]; then
  echo "Upload file not found: $UPLOAD_FILE"
  exit 1
fi

UPLOAD_URL="${REGISTRY_SERVER}/api/v4/projects/${PROJECT_ID}/packages/generic/${PACKAGE_NAME}/${PACKAGE_VERSION}/${FILE_UPLOAD_NAME}"

echo "→ Uploading"
echo "  Project : $PROJECT_ID"
echo "  Name    : $PACKAGE_NAME"
echo "  Version : $PACKAGE_VERSION"
echo "  File    : $UPLOAD_FILE"
echo "  As      : $FILE_UPLOAD_NAME"
echo "  URL     : $UPLOAD_URL"

curl --fail --location \
  --header "$HEADERS" \
  --upload-file "$UPLOAD_FILE" \
  "$UPLOAD_URL"

echo "✓ Done"

# Cleanup
if [[ -n "$TMP_DIR" ]]; then
  rm -rf "$TMP_DIR" || true
fi