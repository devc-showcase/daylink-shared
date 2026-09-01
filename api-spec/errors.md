# 오류 코드

모든 오류 응답은 `code` · `messageKey` · `traceId` · `retryable` 넷을 포함한다(06 §7).

`code`는 **클라이언트가 분기하는 근거**이므로 한 번 정하면 바꾸지 않는다. 바꿔야 하면 새 코드를 추가하고 옛 코드를 한동안 함께 내려준다.

## 왜 서버가 완성된 문장을 주지 않나

`messageKey`만 주고 문구는 클라이언트가 만든다. 네 프론트 구현이 각자의 문구 체계를 갖고, 같은 오류라도 화면 맥락에 따라 다르게 표현해야 하기 때문이다. 예를 들어 `SEAT_UNAVAILABLE`은 검색 목록에서는 "매진", 결제 직전에는 "방금 마감되었습니다. 다른 회차를 선택해 주세요"가 된다.

## `retryable` 판단 기준

같은 요청을 **그대로** 다시 보내도 되는가를 뜻한다.

- `true` — 일시적 경합·타임아웃. 클라이언트가 재시도해도 안전하다
- `false` — 입력을 바꾸거나 다른 흐름으로 가야 한다

멱등 키가 있으므로 `retryable: true`인 쓰기 요청을 재전송해도 중복이 생기지 않는다.

---

## 확정된 코드

### 재고·확보

| 코드 | HTTP | retryable | 설명 | 근거 |
|---|:---:|:---:|---|---|
| `SEAT_UNAVAILABLE` | 409 | false | 잔여 좌석 부족. `details.remainingSeats` 포함 | 06 §8.1 |
| `HOLD_EXPIRED` | 409 | false | 10분 만료. 새 확보를 만들어야 한다 | CORE-AC-06 |
| `SLOT_NOT_BOOKABLE` | 409 | false | 판매 중단·마감·미게시 회차 | 05 §6 |

### 멱등

| 코드 | HTTP | retryable | 설명 | 근거 |
|---|:---:|:---:|---|---|
| `IDEMPOTENCY_IN_PROGRESS` | 409 | **true** | 같은 키가 처리 중. 잠시 후 **같은 키로** 재시도 | 06 §8.2 |
| `IDEMPOTENCY_KEY_REUSED` | 422 | false | 같은 키에 다른 본문 | CORE-AC-05 |

### 입력·상태

| 코드 | HTTP | retryable | 설명 | 근거 |
|---|:---:|:---:|---|---|
| `VALIDATION_FAILED` | 422 | false | 값이 업무 규칙 위반. `details.fields` 포함 | 06 §7 |
| `INVALID_STATE_TRANSITION` | 409 | false | 정의되지 않은 상태 전이 요청 | CORE-AC-27 |
| `VERSION_CONFLICT` | 409 | false | 낙관적 동시성 충돌. 최신 서버본을 함께 반환 | CORE-AC-26 |

### 권한

| 코드 | HTTP | retryable | 설명 | 근거 |
|---|:---:|:---:|---|---|
| `UNAUTHENTICATED` | 401 | false | 토큰 없음·만료 | |
| `FORBIDDEN_SCOPE` | 403 | false | 역할·조직·장소 범위 밖 | CORE-AC-11 |
| `NOT_FOUND` | 404 | false | **존재 여부를 감춰야 할 때도 이 코드를 쓴다** | CORE-AC-10 |

---

### 프로토콜

업무 규칙이 아니라 **요청의 형식**이 잘못된 경우다. 위 코드들과 성격이 다르지만 여기 적는 이유는, 이것도 클라이언트가 분기하는 근거이고 네 구현이 통합 중에 반드시 만나기 때문이다.

이 코드가 없으면 서버는 형식 오류를 `500`으로 내보낸다. 그러면 프론트는 서버 장애로 읽고 재시도하며, 원인은 자기 요청에 있는데 그 사실이 어디에도 안 드러난다. **실제로 그렇게 나가는 것을 Swagger UI에서 확인하고 이 절을 추가했다.**

| 코드 | HTTP | retryable | 설명 | 근거 |
|---|:---:|:---:|---|---|
| `MALFORMED_REQUEST` | 400 | false | 본문을 읽을 수 없거나 필수 헤더·파라미터가 없다. `details.reason` 포함 | 06 §7 |
| `METHOD_NOT_ALLOWED` | 405 | false | 경로는 있으나 그 메서드를 지원하지 않는다 | |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | false | `Content-Type`이 `application/json`이 아니다 | 06 §7 |

`VALIDATION_FAILED`(422)와의 경계: **읽을 수 있는 요청인데 값이 업무 규칙을 어긴 것**이 422이고, **요청 자체를 읽지 못한 것**이 400이다. 인원 99명은 422, 깨진 JSON은 400이다.

## 확정한 코드 — 2차

이 구역은 "직접 채울 코드"였다. 아래로 확정한다.

### 결제·예약

**결제 실패는 오류 응답이 아니다.** `00 §7.3`이 `PAYMENT_PENDING → PAYMENT_FAILED`를 **예약 상태 전이**로 정의했다. 결제가 거절돼도 예약 리소스는 만들어지고 그 상태가 `PAYMENT_FAILED`가 된다. HTTP 4xx로 잘라내면 예약이 생기지 않아 `B2C-RSV-04`의 "실패 사유 범주와 재시도 가능 여부를 표시한다"를 담을 곳이 사라진다.

같은 이유로 **"결과 불명"도 정상 응답이다.** `B2C-AC-06`이 "재결제 대신 서버 상태를 조회한다"를 요구하므로, 응답은 201 + `bookingStatus: PAYMENT_PENDING`이고 클라이언트는 `GET /bookings/{bookingId}`로 확인한다.

실패 사유는 오류 코드가 아니라 `Booking.paymentFailureReason` 열거값으로 담는다.

| 값 | 뜻 |
|---|---|
| `DECLINED` | 결제 수단 거절 |
| `AUTH_FAILED` | 인증 실패 |
| `TIMEOUT` | 시간 초과. **결과 불명과 다르다** — 이건 실패로 확정된 경우다 |
| `USER_CANCELED` | 사용자가 결제창에서 취소 |

`B2C-RSV-03`의 네 가지 모의 결제 시나리오와 1:1로 맞춘다.

### 환불

| 코드 | HTTP | retryable | 설명 | 근거 |
|---|:---:|:---:|---|---|
| `REFUND_EXCEEDS_PAID` | 409 | false | 누적 환불액이 실결제액 초과. `details.alreadyRefunded`·`details.paidAmount` 포함 | CORE-AC-19, 06 §8.5 |
| `REFUND_IN_PROGRESS` | 409 | **true** | 외부 환불이 처리 중이다. 상태 확인 전 재시도를 막는다 | ADM-AC-12 |
| `REFUND_QUOTE_STALE` | 409 | false | 취소 요청에 실은 예상 환불액이 서버 재계산 값과 다르다. `details.currentQuote` 포함 | 00 §6.4, 06 §6.2 |

`REFUND_IN_PROGRESS`만 `true`인 이유는 이 문서 상단의 기준 그대로다. 시간이 지나면 해소되는 일시적 상태이고 입력을 바꿀 것이 없다.

`REFUND_QUOTE_STALE`은 취소 화면을 열어둔 채 시간이 흘러 정책 구간 경계를 넘은 경우다. `B2C-CAN-01`이 "사용자가 명시적으로 동의한 뒤 취소 요청을 생성한다"고 했으므로, 동의한 금액과 실제가 다르면 그대로 진행하지 않고 다시 보여준다.

### 회차·정원

| 코드 | HTTP | retryable | 설명 | 근거 |
|---|:---:|:---:|---|---|
| `CAPACITY_BELOW_COMMITTED` | 409 | false | 정원을 확정 예약 인원 + 활성 임시 확보 인원보다 작게 줄이려 했다. `details.confirmedSeats`·`details.heldSeats` 포함 | CORE-AC-13, 06 §8.3 |

> **문서 불일치 해소됨(2026-08-31).** `02 §6 ADM-PTN-03`과 `ADM-AC-05`가 하한을 "확정 예약 수"로만 쓰고 있었다. `06 §8.3`에 맞춰 `02`를 v2.2로, `05 §5.2`를 함께 정정했다. 세 문서가 이제 같은 하한을 말한다.

### 체크인 — 06 §11.2의 **일곱** 가지 분기

> 이전 판본이 "여섯"이라고 쓰면서 **2시간 초과 스냅숏** 행을 빠뜨렸다. `06 §11.2` 표는 7행이다.

**핵심은 일곱 중 넷이 오류가 아니라는 점이다.** 오프라인 이벤트는 이미 현장에서 벌어진 사실이다. 서버가 4xx로 잘라내면 `06 §11.3`의 "원본 이벤트를 삭제하지 않는다"가 깨진다. 자동 반영할 수 없는 것은 **거부하는 대신 대기열로 접수**한다.

| 상황 | 판정 | HTTP | code / outcome |
|---|---|:---:|---|
| 같은 `clientEventId` 재전송 | 정상 | 200 | `outcome: REPLAYED` |
| 다른 기기가 같은 인원 이미 처리 | 정상 | 200 | `outcome: RECONCILED` |
| 누적 인원 초과 | **오류** | 409 | `CHECKIN_EXCEEDS_PARTY` |
| 취소된 예약의 늦은 이벤트 | 정상(보류) | 202 | `outcome: QUEUED_CONFLICT` |
| 다른 회차의 토큰 | **오류** | 409 | `CHECKIN_SLOT_MISMATCH` |
| 권한 회수된 행위자의 이벤트 | 정상(보류) | 202 | `outcome: QUEUED_QUARANTINE` |
| 2시간 초과 스냅숏 기반 | **오류** | 409 | `SNAPSHOT_STALE` |

| 코드 | HTTP | retryable | 설명 | 근거 |
|---|:---:|:---:|---|---|
| `CHECKIN_EXCEEDS_PARTY` | 409 | false | 누적 체크인이 예약 인원 초과. `details.officialCheckedIn`·`details.partySize` 포함 | CORE-AC-18, 06 §8.4 |
| `CHECKIN_SLOT_MISMATCH` | 409 | false | 토큰이 가리키는 회차가 요청 회차와 다르다 | 06 §11.2 |
| `SNAPSHOT_STALE` | 409 | false | 마지막 동기화 후 2시간 초과. 재동기화가 필요하다 | CORE-AC-16, ADM-AC-09, 06 §11.1 |

**왜 권한 회수 건이 403이 아닌가.** 403으로 거부하면 그 이벤트는 어디에도 남지 않는다. `06 §11.2`가 "격리 대기열로"라고 명시했으므로 접수는 하되 자동 반영을 막는다. 행위자의 권한이 사라진 것은 **판정 대상**이지 요청 형식의 문제가 아니다.

**왜 재전송·교정이 200인가.** `06 §11.2` 첫 행이 "저장된 결과 반환"이라고 정했다. 오류 코드를 붙이면 현장 담당자 화면에 붉은 실패가 뜨는데 실제로는 출석이 정상 기록된 상태다.

### 회차 일정·장소 변경

| 코드 | HTTP | retryable | 설명 | 근거 |
|---|:---:|:---:|---|---|
| `RESCHEDULE_IMPACT_STALE` | 409 | false | 영향 범위 토큰 발급 뒤 영향받는 예약이 바뀌었다. `details.currentImpact` 포함 | 02 §6 ADM-PTN-03 |
| `VENUE_UNAVAILABLE` | 409 | false | 그 시간대에 같은 장소를 쓰는 다른 회차가 있다 | 02 §6 ADM-PTN-03 |

`RESCHEDULE_IMPACT_STALE`은 `REFUND_QUOTE_STALE`과 같은 계열이다. **보여주고 승인받은 값이 실행 시점에도 같은지 서버가 대조한다.** "예약 3건에 영향"을 보고 승인했는데 실행할 때 11건이면 승인의 근거가 사라진다.

`VENUE_UNAVAILABLE`은 `reschedule-preview`의 `blockers`로 미리 알려 준다. 그럼에도 실행 시점에 다시 보는 이유는 그 사이 다른 회차가 생길 수 있어서다. 미리 보여 주는 것과 실행 시 판정하는 것은 다른 일이다.

### 상태 전이 거부

기존 `INVALID_STATE_TRANSITION`(409)을 그대로 쓴다. `06 §5` 표에 없는 전이를 요청한 경우다. 대표적으로 `CONSUMED` 확보에 해제를 요청하거나, 이미 `CANCELLED`인 예약을 **다른 멱등 키로** 다시 취소하려는 경우다.

같은 멱등 키의 재전송은 여기 해당하지 않는다. 그건 `06 §8.2`가 정한 대로 저장된 응답을 그대로 돌려준다.
