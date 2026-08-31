# api-spec

OpenAPI 스펙 원본과 오류 코드 표. **네 프론트 구현과 Core API가 공유하는 단일 명세다.**

`06 §9.1`이 명세 우선을 규정한다 — 스키마와 오류 코드를 코드보다 먼저 확정한다. 네 구현이 서로 다른 시점에 개발되므로, 명세가 흔들리면 구현마다 다른 가정이 굳는다.

## 담는 것

- `openapi.yaml` — 스펙 원본. 오퍼레이션 11건
- `errors.md` — 공통 오류 코드, 사용자 메시지 키, 재시도 가능 여부
- `redocly.yaml` — 린트 설정. 끈 규칙과 그 이유가 파일 안에 있다
- `design-checklist.md` — 엔드포인트마다 어떤 판단을 왜 했는지. 설계를 바꿀 때 여기부터 읽는다

## 규칙

- **호환 불가 변경은 major 버전을 올린다.** 필드·엔드포인트 추가는 minor.
- 생성물(`dist/`)은 커밋하지 않는다. 배포 시점에 `prepack`이 만든다.
- 명세를 고친 뒤 배포 전에 쓰려면 npm `link` / Gradle `mavenLocal()`을 쓰되, **그 상태로 커밋하지 않는다.**

## 버전이 적히는 곳

저장소 전체가 한 버전을 쓴다(ADR-0015). 갈라지면 패키지마다 다른 명세가 나간다.

| 위치 | 값 |
|---|---|
| git 태그 | `v0.2.1` |
| `api-spec/openapi.yaml` | `info.version` |
| `api-spec/package.json` | `version` |
| `api-spec/package-lock.json` | `version` 2곳 |
| `fixtures/package.json` | `version` |
| `gradle.properties` | `sharedVersion` |

`validate.yml`이 태그 없이 네 값을 대조하고, `publish.yml`의 `guard` 잡이 배포 전에 태그까지 다섯 값을 대조한다.

**`openapi.yaml`의 `info.version`이 가드에 늦게 들어왔다.** 0.2.0 배포본 안의 명세가 자기를 0.1.0이라고 말한 채로 나갔고, 소비자(`daylink-core-api`)가 열어 보고서야 드러났다. 이 값은 jar와 npm 패키지에 그대로 실려 **소비자가 읽는 값**이라 파일 셋만 맞춰서는 검사되지 않는다.

## 배포

태그를 밀면 배포된다. `main`에 밀어서는 배포되지 않는다(ADR-0015).

```bash
# 1. 위 표의 다섯 곳을 같은 값으로 맞춘다
# 2. 커밋하고 태그를 민다
git commit -am "api-spec 0.2.1"
git tag -a v0.2.1 -m "무엇이 바뀌었는지"
git push origin main --follow-tags
```

값이 갈라지면 배포 전에 CI가 막는다.

| 패키지 | 담는 것 | 소비자 |
|---|---|---|
| `@devc-showcase/api-spec` (npm) | `openapi.yaml`에서 생성한 TypeScript 타입 + 명세 원본 | 프론트 4벌 |
| `com.daylink:api-spec` (Maven) | 명세 원본만. 자바 코드는 생성하지 않는다 | Core API |

npm에만 생성물을 넣는 이유는 네 프론트가 **같은 타입**을 봐야 `00 §9` 동등성 비교가 성립하기 때문이다. 자바 쪽은 Spring 버전에 묶이는 생성 설정을 소비자가 정하는 편이 맞다.

## 배포본 확인

CI가 초록이라는 것은 "배포 명령이 오류 없이 끝났다"는 뜻이지 "올라간 물건이 옳다"는 뜻이 아니다. 배포 뒤에 한 번 열어 본다.

```bash
export GITHUB_ACTOR=<GitHub 로그인명>
export GITHUB_TOKEN=<classic 토큰, read:packages>
./scripts/verify-published.sh
```

Maven jar와 npm 두 패키지를 레지스트리에서 받아 안을 검사한다. 특히 `dist/openapi.d.ts`는 커밋하지 않고 CI 안에서 만들어지므로, 이 스크립트 말고는 결과물을 볼 통로가 없다.

## 소비

### 인증 — 여기서 막히는 자리다

**GitHub Packages는 classic 토큰만 받는다.** 지금 GitHub은 토큰 생성 화면에서 fine-grained를 먼저 보여 주므로, 무심코 만들면 안 되는 토큰이 나온다. fine-grained 토큰은 `api.github.com`에는 통하고 레지스트리에서만 거부되기 때문에 **인증은 되는데 권한이 없는 것처럼(403)** 보인다.

받는 쪽이 갖춰야 할 것 셋이다.

1. **classic 토큰**에 `read:packages` 범위 — Settings → Developer settings → Personal access tokens → `Tokens (classic)`
2. 사용자명이 **토큰 주인의 GitHub 로그인명**과 같을 것. Maven은 기본 인증이라 조직명이나 본명을 넣으면 403이다
3. 조직 설정에서 classic 토큰의 조직 자원 접근이 **허용**돼 있을 것 — 조직 Settings → Personal access tokens → Settings → `Tokens (classic)` 탭에서 `Allow access`

**실제로 이 프로젝트를 막은 것은 3번이었다.** GitHub 문서는 기본값이 허용이라고 적지만 `devc-showcase`는 차단으로 되어 있었다. 토큰을 아무리 다시 만들어도 뚫리지 않는다. 패키지가 Private이면 이 정책에 그대로 걸린다 — 공개 자원만 정책과 무관하게 접근된다.

**증상으로 가리는 법**: `[0/3]`의 앞 세 줄이 PASS인데 `조직 패키지 목록 조회`가 403이면 토큰 문제가 아니라 이 정책이다. 그 조회는 레지스트리가 아니라 평범한 REST 호출이고, 조직 소유자 본인의 토큰이 거기서 막힐 이유는 정책 말고 없다.

`scripts/verify-published.sh`의 `[0/3]` 단계가 이 셋을 갈라 준다. 403이 나면 거기부터 본다.

### 프론트 (npm)

저장소에 `.npmrc`를 커밋하지 않는다. 토큰이 들어가는 파일이다.

```
@devc-showcase:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

CI에서는 `actions/setup-node`에 `registry-url`·`scope`를 주면 `.npmrc`를 만들어 준다.

### Core API (Maven)

```kotlin
repositories {
    mavenCentral()
    maven {
        name = "GitHubPackages"
        url = uri("https://maven.pkg.github.com/devc-showcase/daylink-shared")
        credentials { /* gpr.user · gpr.key, 또는 GITHUB_ACTOR · GITHUB_TOKEN */ }
        content { includeGroup("com.daylink") }   // 이 저장소는 com.daylink만 담당
    }
}
dependencies { implementation("com.daylink:api-spec:0.2.1") }
```

자격 증명은 저장소가 아니라 `~/.gradle/gradle.properties`에 둔다. `content { includeGroup(...) }`을 두는 이유는 다른 의존성이 이 레지스트리로 새서 엉뚱한 401·403을 만나지 않게 하기 위해서다.

## 미배포 명세로 개발하기

명세를 고칠 때마다 배포할 수는 없다. 배포 전에 쓰려면 로컬 우회로를 쓴다(ADR-0005).

```bash
# npm
cd api-spec && npm run generate && npm link
cd ../../daylink-b2c-next && npm link @devc-showcase/api-spec

# Maven
cd daylink-shared && ./gradlew publishToMavenLocal
```

`daylink-core-api`는 `mavenLocal()`을 이미 `com.daylink` 그룹 한정으로 걸어 두었고, 그쪽으로 내려갈 때 로그에 한 줄 찍는다. **조용히 갈아타면 레지스트리에서 받은 줄 착각하게 되므로** 어느 경로를 썼는지 밝힌다.

**로컬 우회로 상태로 커밋하지 않는다.** `package.json`에 `link:` 경로가 남으면 다른 사람이 빌드하지 못한다.

## 로컬에서 검증

```bash
cd api-spec
npm ci
npm run lint      # OpenAPI 문법 (redocly)
npm run generate  # 타입 생성 → dist/openapi.d.ts
```
