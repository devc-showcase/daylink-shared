# 아키텍처 결정 기록 (ADR)

DayLink 프로젝트의 **기술 판단**을 기록하는 곳이다. 제품 요구(화면·경로·권한·상태)는 `00`~`06` PRD와 IA가 담고, 두 기술의 구현 차이 비교는 `03 §9`·`04 §10`의 비교 기록이 담는다. 경계는 ADR-0001에 정의했다.

## 목록

| 번호 | 제목 | 상태 | 결정일 |
|---|---|---|---|
| [0001](0001-record-architecture-decisions.md) | 아키텍처 결정을 ADR로 기록한다 | 유효 | 2026-08-24 |
| [0002](0002-core-api-stack-spring-boot.md) | Core API 스택을 Spring Boot(JVM)로 한다 | 유효 | 2026-08-23 |
| [0003](0003-core-api-language-java-21.md) | Core API 언어를 Java 21로 한다 | 유효 | 2026-08-24 |
| [0004](0004-persistence-explicit-sql-first.md) | 영속성은 명시적 SQL 우선, JPA는 M3 후반 낙관적 락에 한정한다 | 유효 | 2026-08-24 |
| [0005](0005-repository-structure.md) | 저장소를 조직 아래 6개로 분리하고 공유 자산을 패키지로 배포한다 | 유효 (명명은 → 0011·0015) | 2026-08-24 |
| [0006](0006-persistence-tool-mybatis.md) | 명시적 SQL 도구로 MyBatis를 쓴다 | 유효 | 2026-08-24 |
| [0007](0007-transaction-boundary-and-rollback.md) | 트랜잭션 경계와 롤백 규칙을 고정하고, 원자성은 격리 수준이 아니라 문장으로 얻는다 | 유효 | 2026-08-31 |
| [0008](0008-frontend-libraries.md) | 프론트 라이브러리는 각 생태계 관용을 따르고, 비교는 층을 나눠 기록한다 | 유효 | 2026-09-04 |
| [0009](0009-build-and-test-toolchain.md) | 빌드·테스트 도구를 고정하고 버전을 잠금 파일로 관리한다 | 유효 | 2026-08-24 |
| [0010](0010-schema-migration-liquibase.md) | 스키마 마이그레이션은 Liquibase로 하고 changelog는 SQL 형식으로 쓴다 | 유효 (루트 형식은 → 0016) | 2026-08-31 |
| [0011](0011-shared-spec-folder-naming.md) | 공유 규격의 폴더·패키지 이름을 `api-spec`으로 한다 | 유효 | 2026-08-26 |
| [0012](0012-documents-live-in-notion.md) | 제품 문서의 원본을 Notion에 두고 저장소에는 사본을 두지 않는다 | 대체됨 (→ 0013) | 2026-08-27 |
| [0013](0013-documents-live-in-repo.md) | 문서의 원본은 저장소에 두고 Notion은 읽기용 사본으로 삼는다 | 유효 | 2026-08-28 |
| [0014](0014-slot-naming.md) | 회차의 영어 식별자를 `Slot`으로 한다 | 유효 | 2026-08-31 |
| [0015](0015-package-naming-and-registry.md) | 패키지를 GitHub Packages에 `@devc-showcase` 스코프로 배포한다 | 유효 | 2026-08-31 |
| [0016](0016-changelog-root-format.md) | 루트 changelog만 YAML로 두고 변경 정의는 전부 SQL 파일에 둔다 | 유효 | 2026-08-31 |
| [0017](0017-swagger-ui-serves-the-spec.md) | Swagger UI는 화면만 가져오고, 코드에서 명세를 생성하지 않는다 | 유효 | 2026-09-01 |
| [0018](0018-idempotency-key-lifetime.md) | 멱등 키는 24시간 살고, 만료된 키는 거부하며, 행은 7일 보관한다 | 유효 | 2026-09-04 |
| [0019](0019-partial-refund-allocation.md) | 환불은 결제액을 기준으로 계산하고, 수수료를 먼저 반납한다 | 유효 | 2026-09-04 |
| [0020](0020-slot-cancellation.md) | 회차 취소는 한 번에 끝내고, 귀책이 있는 쪽이 전액 부담한다 | 유효 | 2026-09-04 |

## 쓰는 법

1. `_template.md`를 복사해 `NNNN-ascii-slug.md`로 만든다
2. 맥락·결정·근거·결과 네 항목을 채운다. **근거에는 탈락한 대안과 이유를 반드시 적는다**
3. 위 표에 한 줄 추가한다
4. **이미 쓴 ADR은 고치지 않는다.** 생각이 바뀌면 새 ADR을 쓰고 옛 ADR의 상태만 `대체됨(→ ADR-NNNN)`으로 바꾼다

## 곧 필요한 ADR

| 예정 | 내용 | 필요 시점 |
|---|---|---|
| — | Vue 서버 상태 도구 확정 (ADR-0008이 선정 기준만 정했다) | M2 착수 시 |
