# api-spec

OpenAPI 스펙 원본과 오류 코드 표. **네 프론트 구현과 Core API가 공유하는 단일 명세다.**

`06 §9.1`이 명세 우선을 규정한다 — 스키마와 오류 코드를 코드보다 먼저 확정한다. 네 구현이 서로 다른 시점에 개발되므로, 명세가 흔들리면 구현마다 다른 가정이 굳는다.

## 담을 것

- `openapi.yaml` — 스펙 원본
- `errors.md` — 공통 오류 코드, 사용자 메시지 키, 재시도 가능 여부
- 생성 설정 — TypeScript(npm)·Java(Maven) 타입 생성기 구성

## 규칙

- **호환 불가 변경은 major 버전을 올린다.** 필드·엔드포인트 추가는 minor.
- 생성물(`generated/`)은 커밋하지 않는다. 빌드 시점에 만든다.
- 명세를 고친 뒤 배포 전에 로컬에서 쓰려면 npm `link` / Gradle `mavenLocal()`을 쓰되, **그 상태로 커밋하지 않는다.**

## 배포

태그를 밀면 배포된다. `main`에 밀어서는 배포되지 않는다(ADR-0015).

```bash
# 1. 세 곳의 버전을 같은 값으로 맞춘다
#    api-spec/package.json  "version"
#    gradle.properties      apiSpecVersion
# 2. 커밋하고 태그를 민다
git commit -am "api-spec 0.1.0"
git tag v0.1.0
git push && git push --tags
```

세 값이 다르면 배포 전에 CI가 막는다.

| 패키지 | 담는 것 | 소비자 |
|---|---|---|
| `@devc-showcase/api-spec` (npm) | `openapi.yaml`에서 생성한 TypeScript 타입 + 명세 원본 | 프론트 4벌 |
| `com.daylink:api-spec` (Maven) | 명세 원본만. 자바 코드는 생성하지 않는다 | Core API |

npm에만 생성물을 넣는 이유는 네 프론트가 **같은 타입**을 봐야 `00 §9` 동등성 비교가 성립하기 때문이다. 자바 쪽은 Spring 버전에 묶이는 생성 설정을 소비자가 정하는 편이 맞다.

## 소비

프론트 저장소의 `.npmrc`:

```
@devc-showcase:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Core API의 `build.gradle.kts`:

```kotlin
repositories {
    maven {
        url = uri("https://maven.pkg.github.com/devc-showcase/daylink-shared")
        credentials { /* gpr.user · gpr.key */ }
    }
}
dependencies { implementation("com.daylink:api-spec:0.1.0") }
```

## 미배포 명세로 개발하기

명세를 고칠 때마다 배포할 수는 없다. 배포 전에 쓰려면 로컬 우회로를 쓴다(ADR-0005).

```bash
# npm
cd api-spec && npm run generate && npm link
cd ../../daylink-b2c-next && npm link @devc-showcase/api-spec

# Maven
cd daylink-shared && ./gradlew publishToMavenLocal
# 소비자 build.gradle.kts의 repositories에 mavenLocal()을 앞에 둔다
```

**이 상태로 커밋하지 않는다.** `package.json`에 `link:` 경로가 남거나 `mavenLocal()`이 커밋되면 다른 사람이 빌드하지 못한다.

## 로컬에서 검증

```bash
cd api-spec
npm ci
npm run lint      # OpenAPI 문법
npm run generate  # 타입 생성
```
