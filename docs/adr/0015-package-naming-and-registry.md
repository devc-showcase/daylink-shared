# ADR-0015 패키지를 GitHub Packages에 `@devc-showcase` 스코프로 배포한다

| 항목 | 내용 |
|---|---|
| 상태 | **유효** |
| 결정일 | 2026-08-31 |
| 관련 문서 | `00 §9`, `06 §9.1`, `api-spec/README.md` |
| 관련 ADR | ADR-0005(저장소 구조 — 이 ADR이 패키지 이름을 대체한다), ADR-0009(도구), ADR-0011(`api-spec` 개명) |

## 맥락

ADR-0005는 공유 자산을 `@daylink/contract`(npm)·`com.daylink:contract`(Maven)로 배포하기로 했다. ADR-0011이 `contract` → `api-spec`으로 개명했으므로 지금 이름은 `@daylink/api-spec`·`com.daylink:api-spec`이다.

배포 워크플로를 짜면서 **npm 쪽 이름이 실제로는 배포되지 않는다**는 사실이 드러났다.

**GitHub Packages의 npm 레지스트리는 패키지 스코프가 저장소 소유자 이름과 같아야 한다.** 조직이 `devc-showcase`이므로 `@daylink/...`는 거부된다. 대소문자까지 일치해야 한다. Maven 레지스트리에는 이 제약이 없어 `com.daylink:api-spec`은 그대로 쓸 수 있다.

`@daylink` 스코프를 쓰려면 그 이름의 GitHub 조직을 따로 만들어야 하는데, 조직을 프로젝트마다 만드는 것은 `devc-showcase`라는 이름을 고른 취지와 어긋난다.

## 결정

**npm 패키지는 `@devc-showcase/api-spec`이다.** 레지스트리는 GitHub Packages(`https://npm.pkg.github.com`).

**Maven 아티팩트는 `com.daylink:api-spec`을 유지한다.** 제약이 없고, groupId는 도메인 관례를 따르는 편이 자연스럽다.

**두 이름이 갈라지는 것을 감수한다.** 하나로 맞추려면 `com.devc.showcase:api-spec` 같은 groupId를 써야 하는데, 그건 Java 관례에 어긋나고 얻는 것이 이름의 대칭뿐이다.

**Maven 아티팩트에는 명세만 담고 자바 코드를 생성하지 않는다.** npm 쪽은 반대로 생성한 타입을 배포한다.

**`tokens`·`fixtures` 패키지는 내용이 생길 때 만든다.** ADR-0005가 세 npm 패키지를 예고했으나 지금 둘은 README뿐이다. 빈 패키지를 배포하면 소비자가 무엇을 기대할지 알 수 없다.

## 근거

**왜 Maven에는 생성 코드를 안 넣나.** 서버 측 생성 코드는 Spring 버전과 생성기 설정에 묶인다. 그 설정은 `daylink-core-api`가 자기 빌드에서 정하는 편이 맞다. 여기서 생성해 배포하면 Core API의 Spring을 올릴 때마다 이 저장소를 먼저 배포해야 한다. 의존 방향이 거꾸로 선다.

**왜 npm에는 생성물을 넣나.** 프론트 네 구현이 **같은 타입**을 봐야 `00 §9`의 동등성 비교가 성립한다. 각자 생성하면 생성기 버전이나 옵션이 갈릴 수 있고, 그 차이가 구현 차이로 오인된다.

**타입만 생성하고 호출 코드는 생성하지 않는다.** `openapi-typescript`를 쓴다. 호출 계층을 각 구현이 직접 짜야 Next의 server action·캐시와 Nuxt의 `useFetch`·`useAsyncData` 차이가 드러난다. 그 차이가 `03 §9` 비교 기록의 재료다. 클라이언트까지 생성하면 네 구현이 같은 코드를 쓰게 되어 비교할 것이 사라진다.

탈락한 대안:

| 대안 | 탈락 사유 |
|---|---|
| npmjs.com에 `@daylink` 조직 생성 | ADR-0005 이름을 지킬 수 있으나 레지스트리가 npm과 Maven으로 갈리고, npm 토큰을 GitHub Secrets에 따로 넣어야 한다. 얻는 것이 이름뿐이다 |
| 조직명을 `daylink`로 변경 | `devc-showcase`는 여러 프로젝트를 담는 이름이다. 프로젝트 하나에 조직을 맞추면 다음 프로젝트에서 같은 문제가 생긴다 |
| 레지스트리를 쓰지 않고 로컬 링크만 | ADR-0005 번복 조건 ①이다. 진도는 빨라지지만 "구현마다 다른 명세를 보는" 위험이 그대로 남아 `00 §9`가 무너진다 |
| `orval` 등으로 클라이언트까지 생성 | 위 참조. 학습 목적과 정면으로 부딪힌다 |

## 결과

- **배포는 태그를 밀 때만 일어난다.** `publish.yml`이 `v*` 태그에서만 돈다. ADR-0005는 "`docs/` 변경이 배포를 트리거하지 않도록 경로 필터"를 요구했는데, 태그 트리거는 그보다 강하다 — `main`에 무엇을 밀든 배포되지 않는다. 경로 필터는 검증 워크플로(`validate.yml`)에 남겼다.
- **버전이 세 곳에 적힌다** — 태그, `api-spec/package.json`, `gradle.properties`. 갈라지면 npm과 Maven이 다른 버전으로 나간다. `publish.yml`의 `guard` 잡이 배포 전에 세 값을 대조하고, `validate.yml`이 태그 없이도 두 파일을 대조한다.
- **생성물을 커밋하지 않는다.** `dist/`는 빌드 시점에 만든다. CI가 `dist/`가 추적되고 있으면 실패시킨다.
- **소비자는 `.npmrc`에 레지스트리를 지정해야 한다.** GitHub Packages는 스코프별 레지스트리 설정이 필요하다. 다섯 저장소 각각에 들어간다.
- **번복 조건**: ① 프론트 구현에서 타입만으로 부족하다는 것이 M2에 드러나면 클라이언트 생성을 재검토한다 ② 외부 협업자가 생겨 GitHub Packages 인증이 부담이 되면 npmjs.com 공개 배포로 옮긴다.
