# PRD

제품 요구 문서다. **원본은 이 폴더의 파일이고, git이 버전을 남긴다.** 고칠 때는 여기서 고친다. 근거는 [ADR-0013](../adr/0013-documents-live-in-repo.md).

읽는 순서는 다음과 같다.

1. [00 제품 기획 개요](00-DayLink-PRD-개요.md) — 제품 경계와 공통 정책. **최상위 문서다**
2. [01 B2C PRD](01-DayLink-B2C-PRD.md) — 고객 앱 요구사항과 화면 28개
3. [02 Admin PRD](02-DayLink-Admin-PRD.md) — 운영 앱 요구사항과 화면 56개
4. [03 B2C Next.js·Nuxt 비교 학습 구현 가이드](03-DayLink-B2C-NextJS-NuxtJS-학습구현가이드.md)
5. [04 Admin React·Vue 비교 학습 구현 가이드](04-DayLink-Admin-React-Vue-학습구현가이드.md)
6. [05 서비스 플로우·기획 결함 검증](05-DayLink-서비스플로우-검증.md)
7. [06 Core API PRD](06-DayLink-CoreAPI-PRD.md) — 동시성·멱등성이 여기 있다

[확인필요 7건 결정 기록](DayLink-확인필요-7건-결정기록-v2.0.md)과 [화면 목록 IA v2.3](DayLink-화면목록-IA-v2.3.xlsx)이 함께 있다. IA는 84행이며 PRD 01·02의 화면 목록과 대조 검증을 마친 상태다.

**충돌 시 `00`이 최상위다.** PRD와 ADR이 어긋나면 PRD가 우선하고, 그 사실을 ADR에 기록한다.

## 읽기용 사본

[Notion DayLink](https://app.notion.com/p/3c9af54d93a081299340c907da2bb16d)에 사본이 있다. 모바일 열람과 IA 필터링에 쓴다. **거기서 고치지 않는다** — 자동으로 따라오지 않으므로 낡았을 수 있다.

## 하위 폴더

- `archive/` — 대체된 문서. 4사이트 시절 PRD 6종, 구버전 IA 5종, 커리큘럼 4종, 결정기록 1종
- `reference/` — Ops 화면설계 PPTX, SI 화면설계서 샘플 PNG
