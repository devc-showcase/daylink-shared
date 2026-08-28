# PRD — Notion에 있다

제품 요구 문서의 **원본은 Notion이다.** 이 폴더에는 사본을 두지 않는다. 같은 글을 두 곳에 두면 어느 쪽이 진짜인지 알 수 없게 되기 때문이다. 근거는 [ADR-0012](../adr/0012-documents-live-in-notion.md).

전체 묶음은 [DayLink](https://app.notion.com/p/3c9af54d93a081299340c907da2bb16d)에 있고, 개별 문서는 다음과 같다.

1. [00 제품 기획 개요](https://app.notion.com/p/3c9af54d93a081aa8be7cacc034a9a52) — 제품 경계와 공통 정책. **최상위 문서다**
2. [01 B2C PRD](https://app.notion.com/p/3c9af54d93a081189d2ece9374ac1819) — 고객 앱 요구사항과 화면 28개
3. [02 Admin PRD](https://app.notion.com/p/3c9af54d93a08110a6e1ec72f1a11f5a) — 운영 앱 요구사항과 화면 56개
4. [03 B2C Next.js·Nuxt 비교 학습 구현 가이드](https://app.notion.com/p/3c9af54d93a081d7bd54f745895d5de0)
5. [04 Admin React·Vue 비교 학습 구현 가이드](https://app.notion.com/p/3c9af54d93a08177bb1cde476b3b741d)
6. [05 서비스 플로우·기획 결함 검증](https://app.notion.com/p/3c9af54d93a081e7b4b1ffe003c709a4)
7. [06 Core API PRD](https://app.notion.com/p/3c9af54d93a08120b6dcd3ee147045d3) — 동시성·멱등성이 여기 있다

[확인필요 7건 결정 기록](https://app.notion.com/p/3c9af54d93a0810391fbc61b218456f2)과 [화면 목록 IA v2.3](https://app.notion.com/p/3c9f9750b79d4f8db619bdd252743661)이 함께 있다. IA는 84행 데이터베이스라 앱·모듈·마일스톤으로 필터와 그룹화가 된다.

**충돌 시 `00`이 최상위다.** PRD와 ADR이 어긋나면 PRD가 우선하고, 그 사실을 ADR에 기록한다.

## 이 폴더에 남아 있는 것

- `archive/` — 대체된 문서. 4사이트 시절 PRD 6종, 구버전 IA 5종, 커리큘럼 4종, 결정기록 1종. **Notion에 없다.** git 이력이 생기기 전의 기록이라 여기가 유일한 사본이다.
- `reference/` — Ops 화면설계 PPTX, SI 화면설계서 샘플 PNG. 바이너리라 Notion으로 옮기지 않았다.
