# daylink-shared

DayLink 프로젝트의 **명세·자산·문서**를 담는 저장소다. 다섯 개 코드베이스가 여기서 나온 것을 소비한다.

구조와 배포 방식은 [ADR-0005](docs/adr/0005-repository-structure.md)에서 정했다.

## 구조

| 경로 | 내용 | 배포 |
|---|---|---|
| `api-spec/` | OpenAPI 스펙 원본, 오류 코드 표 | `@daylink/api-spec` (npm) · `com.daylink:api-spec` (Maven) |
| `tokens/` | 디자인 토큰, 아이콘, 이미지 비율 | `@daylink/tokens` (npm) |
| `fixtures/` | 시드 데이터, 테스트 계정 | `@daylink/fixtures` (npm) |
| `e2e/` | 네 구현 공통 E2E 시나리오 (Playwright) | 배포하지 않음 |
| `docs/prd/` | **Notion 링크만.** 원본은 Notion (ADR-0012) | 배포하지 않음 |
| `docs/adr/` | 아키텍처 결정 기록 | 배포하지 않음 |
| `docs/journal/` | **Notion 링크만.** 원본은 Notion (ADR-0012) | 배포하지 않음 |

## 소비하는 저장소

| 저장소 | 소비 | 포트 |
|---|---|---|
| `daylink-core-api` | Maven | 8080 |
| `daylink-b2c-next` | npm | 3000 |
| `daylink-b2c-nuxt` | npm | 3001 |
| `daylink-admin-react` | npm | 5173 |
| `daylink-admin-vue` | npm | 5174 |

## 로컬 작업 공간

여섯 저장소를 **한 부모 폴더 아래 형제로** 클론한다. 부모 폴더는 저장소가 아니라 작업 공간이다.

```
portfolio/                 ← 컨테이너 (git 저장소 아님)
  daylink-shared/          ← 이 저장소
  daylink-core-api/
  daylink-b2c-next/
  daylink-b2c-nuxt/
  daylink-admin-react/
  daylink-admin-vue/
```

`e2e/`가 네 구현을 동시에 기동한 상태를 전제하므로 이 배치를 지킨다.

**기준선 구현의 소스를 학습 대상 구현 창에 열어두지 않는다.** `00 §2.1` 규칙 1이며, ADR-0005가 저장소를 분리한 이유이기도 하다. 형제 폴더로 나란히 두더라도 편집기 창은 저장소 단위로 연다.

## 버전 규약

SemVer를 쓴다. 명세의 **호환 불가 변경은 major**, 필드·엔드포인트 추가는 minor다.
`docs/` 변경은 배포를 트리거하지 않는다 — 워크플로에 경로 필터를 건다.

## 문서를 읽는 순서

제품 요구(PRD)와 학습 기록(journal)의 **원본은 Notion**이다 — [DayLink 묶음](https://app.notion.com/p/3c9af54d93a081299340c907da2bb16d). 근거는 [ADR-0012](docs/adr/0012-documents-live-in-notion.md).

1. [00 제품 기획 개요](https://app.notion.com/p/3c9af54d93a081aa8be7cacc034a9a52) — 제품 경계와 공통 정책. 최상위 문서다
2. [01 B2C](https://app.notion.com/p/3c9af54d93a081189d2ece9374ac1819) · [02 Admin](https://app.notion.com/p/3c9af54d93a08110a6e1ec72f1a11f5a) — 두 제품의 요구사항과 화면 목록
3. [06 Core API](https://app.notion.com/p/3c9af54d93a08120b6dcd3ee147045d3) — Core API 요구사항. 동시성·멱등성이 여기 있다
4. [`docs/adr/README.md`](docs/adr/README.md) — 기술 결정과 그 근거. **이건 저장소가 원본이다**
5. [journal](https://app.notion.com/p/3c9af54d93a08188a746c645bc145cd1) — 학습 계획과 진행 기록

**충돌 시 `00`이 최상위다.** PRD와 ADR이 어긋나면 PRD가 우선하고, 그 사실을 ADR에 기록한다.
