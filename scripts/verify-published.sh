#!/usr/bin/env bash
#
# 배포본 열어 보기 — 레지스트리에 실제로 올라간 물건이 예상과 같은지 확인한다.
#
# 왜 필요한가:
#   CI가 초록이라는 것은 "배포 명령이 오류 없이 끝났다"는 뜻이지
#   "올라간 물건이 옳다"는 뜻이 아니다. 실제로 0.2.0 배포본 안의
#   openapi.yaml이 자기를 0.1.0이라고 말하는 상태로 나간 일이 있었고,
#   그것은 소비자(daylink-core-api)가 열어 보고서야 드러났다.
#   06 §12의 "실패를 만들지 못하는 검증은 무효" 원칙을 배포에 적용한 것이다.
#
# 쓰는 법:
#   export GITHUB_ACTOR=<GitHub 사용자명>
#   export GITHUB_TOKEN=<read:packages 범위 토큰>
#   ./scripts/verify-published.sh          # gradle.properties의 버전
#   ./scripts/verify-published.sh 0.2.1    # 버전 지정
#
# 토큰은 인자로 받지 않는다. 셸 히스토리와 프로세스 목록에 남기지 않기 위해서다.

set -euo pipefail

OWNER="devc-showcase"
REPO="daylink-shared"
MAVEN_HOST="https://maven.pkg.github.com"
NPM_HOST="https://npm.pkg.github.com"

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

VERSION="${1:-$(grep '^sharedVersion=' gradle.properties | cut -d= -f2)}"

if [ -z "${GITHUB_ACTOR:-}" ] || [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "GITHUB_ACTOR와 GITHUB_TOKEN이 필요하다." >&2
  echo "  export GITHUB_ACTOR=<GitHub 사용자명>" >&2
  echo "  export GITHUB_TOKEN=<read:packages 토큰>" >&2
  exit 2
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

FAILED=0
RESULTS=""

record() { # 상태 항목 상세
  RESULTS="${RESULTS}$1\t$2\t$3\n"
  [ "$1" = "FAIL" ] && FAILED=1
  return 0
}

expect() { # 항목 기대 실제
  if [ "$2" = "$3" ]; then
    record PASS "$1" "$3"
  else
    record FAIL "$1" "기대 $2, 실제 $3"
  fi
}

echo "대상 버전: $VERSION"
echo

# ─────────────────────────────────────────────────────────────
# 1. Maven — com.daylink:api-spec
# ─────────────────────────────────────────────────────────────
echo "[1/3] Maven com.daylink:api-spec:$VERSION"
JAR="$TMP/api-spec.jar"
JAR_URL="$MAVEN_HOST/$OWNER/$REPO/com/daylink/api-spec/$VERSION/api-spec-$VERSION.jar"

if curl -fsSL -u "$GITHUB_ACTOR:$GITHUB_TOKEN" -o "$JAR" "$JAR_URL"; then
  record PASS "maven: 내려받기" "$(wc -c < "$JAR" | tr -d ' ') 바이트"
  mkdir -p "$TMP/jar" && (cd "$TMP/jar" && unzip -qo "$JAR")

  if [ -f "$TMP/jar/daylink/openapi.yaml" ]; then
    record PASS "maven: daylink/openapi.yaml 존재" "있음"
    INFO="$(awk '/^info:/{f=1;next} f&&/^  version:/{print $2;exit}' "$TMP/jar/daylink/openapi.yaml")"
    expect "maven: 명세가 선언한 info.version" "$VERSION" "$INFO"
    OPS="$(grep -c 'operationId:' "$TMP/jar/daylink/openapi.yaml" || true)"
    expect "maven: 오퍼레이션 수" "11" "$OPS"
  else
    record FAIL "maven: daylink/openapi.yaml 존재" "없음"
  fi

  if [ -f "$TMP/jar/daylink/errors.md" ]; then
    record PASS "maven: daylink/errors.md 존재" "있음"
  else
    record FAIL "maven: daylink/errors.md 존재" "없음"
  fi
else
  record FAIL "maven: 내려받기" "실패 — 토큰 범위(read:packages)와 버전을 확인한다"
fi
echo

# ─────────────────────────────────────────────────────────────
# npm 공통 준비 — 토큰이 든 .npmrc는 임시 폴더에만 둔다
# ─────────────────────────────────────────────────────────────
NPMRC="$TMP/.npmrc"
{
  echo "@devc-showcase:registry=$NPM_HOST"
  echo "//${NPM_HOST#https://}/:_authToken=$GITHUB_TOKEN"
} > "$NPMRC"
chmod 600 "$NPMRC"
export npm_config_userconfig="$NPMRC"

fetch_npm() { # 패키지이름 → tar 목록을 stdout으로
  local pkg="$1" dir="$2"
  mkdir -p "$dir"
  ( cd "$dir" && npm pack "@devc-showcase/$pkg@$VERSION" --silent >/dev/null 2>&1 ) || return 1
  local tgz
  tgz="$(ls "$dir"/*.tgz 2>/dev/null | head -1)"
  [ -n "$tgz" ] || return 1
  ( cd "$dir" && tar xzf "$tgz" )
  return 0
}

# ─────────────────────────────────────────────────────────────
# 2. npm — @devc-showcase/api-spec
# ─────────────────────────────────────────────────────────────
echo "[2/3] npm @devc-showcase/api-spec@$VERSION"
if fetch_npm api-spec "$TMP/npm-spec"; then
  P="$TMP/npm-spec/package"
  record PASS "npm(api-spec): 내려받기" "성공"
  expect "npm(api-spec): package.json version" "$VERSION" "$(node -p "require('$P/package.json').version")"

  # dist/는 커밋하지 않는다. prepack이 배포 시점에 만든다 —
  # 즉 이 파일의 존재는 CI에서만 결정되고, 여기서 처음 확인된다.
  if [ -f "$P/dist/openapi.d.ts" ]; then
    LINES="$(wc -l < "$P/dist/openapi.d.ts" | tr -d ' ')"
    record PASS "npm(api-spec): dist/openapi.d.ts 존재" "$LINES 줄"
    if grep -q 'operations' "$P/dist/openapi.d.ts"; then
      record PASS "npm(api-spec): 생성 타입에 operations 포함" "있음"
    else
      record FAIL "npm(api-spec): 생성 타입에 operations 포함" "없음 — 빈 생성일 수 있다"
    fi
  else
    record FAIL "npm(api-spec): dist/openapi.d.ts 존재" "없음 — prepack이 안 돌았다"
  fi

  if [ -f "$P/openapi.yaml" ]; then
    INFO2="$(awk '/^info:/{f=1;next} f&&/^  version:/{print $2;exit}' "$P/openapi.yaml")"
    expect "npm(api-spec): 명세 info.version" "$VERSION" "$INFO2"
  else
    record FAIL "npm(api-spec): openapi.yaml 존재" "없음"
  fi
else
  record FAIL "npm(api-spec): 내려받기" "실패"
fi
echo

# ─────────────────────────────────────────────────────────────
# 3. npm — @devc-showcase/fixtures
# ─────────────────────────────────────────────────────────────
echo "[3/3] npm @devc-showcase/fixtures@$VERSION"
if fetch_npm fixtures "$TMP/npm-fix"; then
  P="$TMP/npm-fix/package"
  record PASS "npm(fixtures): 내려받기" "성공"
  expect "npm(fixtures): package.json version" "$VERSION" "$(node -p "require('$P/package.json').version")"
  for f in accounts.json catalog.json bookings.json; do
    if [ -f "$P/$f" ]; then
      record PASS "npm(fixtures): $f 존재" "$(wc -c < "$P/$f" | tr -d ' ') 바이트"
    else
      record FAIL "npm(fixtures): $f 존재" "없음"
    fi
  done
  # 시드가 저장소의 원본과 같은지. 배포본이 낡았으면 여기서 갈린다.
  for f in accounts.json catalog.json bookings.json; do
    if [ -f "$P/$f" ] && [ -f "$ROOT/fixtures/$f" ]; then
      if cmp -s "$P/$f" "$ROOT/fixtures/$f"; then
        record PASS "npm(fixtures): $f 가 저장소 원본과 같다" "일치"
      else
        record FAIL "npm(fixtures): $f 가 저장소 원본과 같다" "다름 — 배포 후 원본이 바뀌었을 수 있다"
      fi
    fi
  done
else
  record FAIL "npm(fixtures): 내려받기" "실패"
fi
echo

# ─────────────────────────────────────────────────────────────
echo "───────────────────────────────────────────────"
printf '%b' "$RESULTS" | while IFS=$'\t' read -r st item detail; do
  printf "%-4s  %-42s  %s\n" "$st" "$item" "$detail"
done
echo "───────────────────────────────────────────────"

if [ "$FAILED" -ne 0 ]; then
  echo "실패 항목이 있다. 위 표를 보고 원인을 가린다."
  exit 1
fi
echo "배포본이 예상과 같다."
