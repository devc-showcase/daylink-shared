# openapi.yaml 읽는 법

> **작성 시점의 기록이다.** 예시로 든 명세 조각이 지금 `openapi.yaml`과 다른 자리가 있다 — `/holds/{holdId}`의 `delete`는 폐기됐고(`POST .../release`로 바뀌었다), `adminAuth`는 이제 `check-ins`·`slots`가 참조한다. **문법 설명 자체는 그대로 유효하다.** 현행 명세는 [`openapi.yaml`](openapi.yaml)을 본다.

`POST /holds` 하나를 뜯어 OpenAPI 문법을 익힌다. **판단이 아니라 문법만 다룬다.** 무엇을 쓸지는 `design-checklist.md`가 묻는다.

---

## 1. 파일의 큰 구조

최상위 키는 일곱 개뿐이다. 이 골격만 잡히면 나머지는 중첩이다.

```yaml
openapi: 3.1.0        # ① 스펙 버전
info:                 # ② 이 API가 무엇인가
servers:              # ③ 어디로 요청하나
security:             # ④ 기본 인증 방식
tags:                 # ⑤ 엔드포인트 묶음 이름
paths:                # ⑥ 엔드포인트 본체   ← 분량의 대부분
components:           # ⑦ 재사용 조각 창고  ← 두 번째로 큼
```

`paths`와 `components`가 전부라고 봐도 된다. 앞의 다섯은 한 번 쓰고 거의 안 건드린다.

### ① `openapi: 3.1.0`

스펙 버전. 3.1은 JSON Schema 2020-12와 정렬돼 있고, 3.0은 그 이전 문법이다. 차이가 실제로 드러나는 자리는 §6에서 다시 본다.

### ② `info`

`title`·`version`이 필수다. `version`은 **API 명세의 버전**이지 서버 소프트웨어 버전이 아니다. `api-spec/README.md`가 "호환 불가 변경은 major를 올린다"고 정한 그 숫자다.

### ③ `servers`

기본 URL 목록. 여러 개를 두면 생성된 클라이언트가 골라 쓴다.

### ④ `security`

```yaml
security:
  - customerAuth: []
```

**파일 전체의 기본값**이다. 지금은 모든 엔드포인트가 고객 토큰을 요구한다. Admin 엔드포인트를 추가할 때는 그 operation 안에서 다시 `security:`를 써서 덮어써야 한다. 안 덮어쓰면 Admin API가 고객 토큰을 받는 계약이 된다.

빈 배열 `[]`은 "이 방식에 별도 범위(scope)가 없다"는 뜻이다. OAuth가 아니면 대개 비어 있다.

### ⑤ `tags`

문서 화면에서 엔드포인트를 묶는 이름표다. 기능에는 영향이 없다.

---

## 2. `paths` — 세 겹 구조

```yaml
paths:              # 1겹: 최상위 키
  /holds:           # 2겹: 경로
    post:           # 3겹: HTTP 메서드
      tags: [hold]  # 4겹부터 operation 내용
      summary: ...
```

경로 → 메서드 → operation. 한 경로에 여러 메서드를 달 수 있다.

```yaml
  /holds/{holdId}:
    get:    ...
    delete: ...
```

중괄호 `{holdId}`가 경로 변수다. 이걸 쓰면 `parameters`에 `in: path`로 선언해야 한다. 선언을 빠뜨리는 게 초보자가 가장 자주 내는 lint 오류다.

### operation 안의 키

```yaml
    post:
      tags: [hold]                # 묶음
      summary: 재고 임시 확보 생성  # 한 줄 요약
      operationId: createHold      # 고유 ID
      description: |               # 긴 설명
        ...
      parameters: [...]            # 헤더·경로·쿼리 입력
      requestBody: {...}           # 본문 입력
      responses: {...}             # 출력
```

`operationId`가 중요하다. 코드 생성기가 이걸 **함수 이름으로** 쓴다. `createHold`라고 쓰면 TypeScript에 `createHold()`가 생긴다. 파일 전체에서 유일해야 하고, 나중에 바꾸면 프론트 호출부가 전부 깨진다.

`summary`는 한 줄, `description`은 여러 줄이다. 이 파일은 `description`에 **판단 근거**를 적는 방식을 쓴다. 일반적인 관행보다 훨씬 길게 쓴 것인데, 학습 목적상 의도된 것이다.

---

## 3. `parameters` — 본문이 아닌 입력

```yaml
      parameters:
        - $ref: '#/components/parameters/IdempotencyKey'
```

`-`로 시작하는 배열이다. 참조를 풀면 이렇게 생겼다.

```yaml
    IdempotencyKey:
      name: Idempotency-Key   # 실제 헤더 이름
      in: header              # 어디에 실리나
      required: true
      description: |
        ...
      schema:
        type: string
        format: uuid
```

`in`에 올 수 있는 값은 `header` · `path` · `query` · `cookie` 넷이다. `in: path`면 `required: true`가 강제된다.

`format: uuid`는 **주석에 가깝다.** 대부분의 검증기가 강제하지 않는다. 사람과 생성기에게 주는 힌트다.

---

## 4. `requestBody` — 본문 입력

```yaml
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateHoldRequest'
```

`content` 아래에 **미디어 타입**이 오고, 그 아래에 `schema`가 온다. 이 세 겹이 고정 형식이다. 파일 업로드를 다루면 `multipart/form-data`가 같은 자리에 들어간다.

`required: true`는 본문 자체의 필수 여부다. 본문 **안** 필드의 필수 여부는 스키마의 `required` 목록이 정한다. 이름이 같아서 헷갈리는 자리다.

---

## 5. `responses` — 출력

```yaml
      responses:
        '201':
          description: |
            확보 성공. ...
          headers:
            X-Trace-Id:
              $ref: '#/components/headers/TraceId'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Hold'
        '409': ...
        '401': { $ref: '#/components/responses/Unauthorized' }
```

### 따옴표가 왜 필요한가

`'201'`의 따옴표는 장식이 아니다. OpenAPI에서 응답 키는 **문자열**인데, YAML은 따옴표 없는 `201`을 정수로 읽는다. 씌우지 않으면 검증기가 걸고 넘어진다.

### `description`은 필수다

응답마다 `description`이 없으면 lint가 실패한다. 나머지는 다 선택이다. 본문이 없는 `204`는 `description`만 있으면 끝난다.

### 두 가지 표기가 섞여 있다

```yaml
        '401': { $ref: '#/components/responses/Unauthorized' }   # 한 줄
        '409':                                                    # 여러 줄
          description: |
            ...
```

`{ }`는 YAML의 인라인 매핑이다. 아래 형식과 완전히 같다.

```yaml
        '401':
          $ref: '#/components/responses/Unauthorized'
```

이 파일은 **엔드포인트마다 다르게 판단할 것**을 여러 줄로, **공통으로 재사용할 것**을 한 줄로 썼다. 규칙은 아니고 읽기 편하자는 관례다.

---

## 6. `$ref` — 재사용 문법

```yaml
$ref: '#/components/schemas/Hold'
```

`#`은 이 파일 자신, 그다음은 키를 `/`로 이어 내려간 경로다. 위 참조는 `components:` → `schemas:` → `Hold:` 를 가리킨다.

같은 스키마를 두 번 쓰지 않으려고 쓴다. `Error`는 다섯 군데에서 참조된다. 한 곳만 고치면 전부 반영된다.

### `allOf`로 감싼 자리

```yaml
        grossAmount:
          allOf: [{ $ref: '#/components/schemas/Money' }]
          description: 상품 총액 G
```

왜 그냥 `$ref` 옆에 `description`을 붙이지 않았나. **OpenAPI 3.0에서는 `$ref` 옆의 다른 키가 전부 무시됐다.** 그래서 설명을 붙이려면 `allOf`로 한 겹 감싸는 우회가 관행이 됐다.

3.1은 JSON Schema 2020-12를 따르므로 이 제약이 없다. 이렇게 써도 된다.

```yaml
        grossAmount:
          $ref: '#/components/schemas/Money'
          description: 상품 총액 G
```

다만 생성기마다 지원이 갈린다. `allOf` 쪽이 아직 안전하다. 이 파일이 3.1을 선언하고도 3.0 관용구를 쓴 이유다. `design-checklist.md`의 "3.1을 쓸 것인가 3.0으로 낮출 것인가" 항목이 이 지점과 이어진다.

---

## 7. `components` — 창고

다섯 종류가 들어 있다. 종류마다 자리가 정해져 있다.

| 키 | 담는 것 | 참조 경로 |
|---|---|---|
| `securitySchemes` | 인증 방식 | `security:`에서 이름으로 |
| `parameters` | 재사용 파라미터 | `#/components/parameters/...` |
| `headers` | 응답 헤더 | `#/components/headers/...` |
| `schemas` | 데이터 모양 | `#/components/schemas/...` |
| `responses` | 통째 재사용할 응답 | `#/components/responses/...` |

`components`에만 넣고 아무도 참조하지 않으면 그냥 안 쓰이는 정의로 남는다. `adminAuth`가 지금 그 상태다.

---

## 8. 스키마 문법

```yaml
    CreateHoldRequest:
      type: object
      required: [slotId, partySize]
      properties:
        slotId:
          type: string
        partySize:
          type: integer
          minimum: 1
          maximum: 6
        couponCode:
          type: string
```

- `type` — `object` · `string` · `integer` · `number` · `boolean` · `array` · `null`
- `required` — **필드 이름의 배열**이다. 각 필드 안에 `required: true`를 쓰는 게 아니다. 이 자리를 자주 틀린다
- `properties` — 필드 정의
- `minimum` / `maximum` — 숫자 범위
- `enum` — 허용값 목록. `status`가 `[ACTIVE, PAYMENT_PENDING, ...]`를 쓴다
- `format` — `date-time` · `uuid` 등. 힌트일 뿐 강제되지 않는다
- `additionalProperties: true` — 정의하지 않은 키를 허용한다. `Error.details`가 코드마다 모양이 달라서 열어뒀다

`required`에 없는 필드는 선택이다. `couponCode`가 그렇다.

### 3.1의 `examples`

```yaml
      examples: [50000]
```

3.1은 배열형 `examples`를, 3.0은 단수형 `example`을 쓴다. 섞어 쓰면 lint가 잡는다.

---

## 9. YAML 자체에서 걸리는 곳

**들여쓰기는 공백만.** 탭을 넣으면 파싱이 실패한다. 편집기에서 탭을 공백으로 바꾸는 설정을 먼저 켠다.

**`|` 와 `>`**

```yaml
description: |     # 줄바꿈을 그대로 보존
description: >     # 줄바꿈을 공백으로 접음
```

이 파일은 전부 `|`다. 마크다운 문단을 그대로 살리려는 것이다.

**배열 두 가지 표기**

```yaml
tags: [hold]        # 인라인
tags:               # 블록 — 위와 같다
  - hold
```

**따옴표가 필요한 값**: 숫자로 보이는 문자열(`'201'`), `yes`/`no`/`on`/`off`(YAML이 불리언으로 읽는다), 콜론이 들어간 문자열.

**주석은 `#`.** 이 파일이 미작성 엔드포인트를 주석으로 남겨둔 방식이 이것이다.

---

## 10. 새 엔드포인트 최소 뼈대

빈 화면에서 시작하지 말고 이걸 복사해 채운다.

```yaml
  /holds/{holdId}:
    get:
      tags: [hold]
      summary: 
      operationId: 
      description: |
        
      parameters:
        - name: holdId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Hold'
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }
```

`GET`에는 `requestBody`가 없다. 멱등 키도 없다 — 쓰기 요청에만 붙는다.

---

## 11. 확인

```bash
npx @redocly/cli@latest lint api-spec/openapi.yaml
```

자주 나오는 오류와 뜻이다.

| 메시지 | 원인 |
|---|---|
| `must have required property 'description'` | 응답에 `description`을 안 씀 |
| `Expected type string but got integer` | `'201'`에 따옴표를 안 씌움 |
| `can't resolve $ref` | 참조 경로 오타. `schemas` ↔ `schema` 혼동이 흔하다 |
| `path parameter ... is not defined` | 경로에 `{}`만 쓰고 `parameters`에 선언 안 함 |
| `Operation object should contain operationId` | `operationId` 누락 또는 중복 |

**문법이 통과해도 설계는 검증되지 않는다.** 검증기는 형식만 본다.
