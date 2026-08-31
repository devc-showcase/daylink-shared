// 시드 무결성 검사. CI와 로컬이 같은 검사를 돌린다.
//
// 왜 필요한가: 시드는 손으로 고치는 파일이라 참조가 쉽게 깨진다.
// 실제로 초안에서 confirmedSeats와 예약 행 합계가 4곳 어긋난 적이 있다.
// 좌석은 찼는데 참가자 명단이 비는 상태였고, 눈으로는 안 보였다.
import { readFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url)));
const accounts = read('./accounts.json');
const catalog  = read('./catalog.json');
const bookings = read('./bookings.json');

const fail = [];
const check = (cond, msg) => { if (!cond) fail.push(msg); };

const customerIds = new Set(accounts.customers.map((c) => c.id));
const partnerIds  = new Set(catalog.partners.map((p) => p.id));
const venueIds    = new Set(catalog.venues.map((v) => v.id));
const experiences = new Map(catalog.experiences.map((e) => [e.id, e]));
const slots       = new Map(catalog.slots.map((s) => [s.id, s]));
const bookingIds  = new Set(bookings.bookings.map((b) => b.id));
const couponCodes = new Set(bookings.coupons.map((c) => c.code));

// 참조 무결성
for (const v of catalog.venues) check(partnerIds.has(v.partnerId), `venue ${v.id} → 없는 partner`);
for (const e of catalog.experiences) {
  check(partnerIds.has(e.partnerId), `experience ${e.id} → 없는 partner`);
  check(e.venueId === null || venueIds.has(e.venueId), `experience ${e.id} → 없는 venue`);
}
for (const s of catalog.slots) check(experiences.has(s.experienceId), `slot ${s.id} → 없는 experience`);

// 좌석 수 — 예약 행이 권위다. confirmedSeats는 파생값이다.
const SEAT_HOLDING = new Set(['CONFIRMED', 'COMPLETED']);
const used = new Map();
for (const b of bookings.bookings) {
  if (SEAT_HOLDING.has(b.bookingStatus)) used.set(b.slotId, (used.get(b.slotId) ?? 0) + b.partySize);
}
for (const s of catalog.slots) {
  const actual = used.get(s.id) ?? 0;
  check(s.confirmedSeats === actual, `slot ${s.id} confirmedSeats ${s.confirmedSeats} ≠ 예약 합 ${actual}`);
  check(s.capacity >= s.confirmedSeats + s.heldSeats, `slot ${s.id} 정원 초과`);
}

// 금액 — 00 §6.3 공식. 손으로 적은 값을 신뢰하지 않는다.
for (const b of bookings.bookings) {
  check(customerIds.has(b.customerId), `${b.id} → 없는 customer`);
  check(slots.has(b.slotId), `${b.id} → 없는 slot`);
  check(slots.get(b.slotId)?.experienceId === b.experienceId, `${b.id} slot과 experience 불일치`);
  check(b.partySize >= 1 && b.partySize <= 6, `${b.id} 인원 범위 위반 (00 §6.2)`);
  if (b.couponCode) check(couponCodes.has(b.couponCode), `${b.id} → 없는 coupon`);

  const e = experiences.get(b.experienceId);
  const s = b.snapshot;
  const gross = e.unitPrice * b.partySize;
  check(s.grossAmount === gross, `${b.id} G ${s.grossAmount} ≠ ${gross}`);
  check(s.payableAmount === gross - s.discountAmount, `${b.id} C = G - D 위반`);
  check(s.platformFee === Math.floor(gross * 12 / 100), `${b.id} F = floor(G × 0.12) 위반`);
  check(s.partnerSettlementBase === gross - s.platformFee, `${b.id} 정산 기준액 = G - F 위반`);
}

for (const c of bookings.checkInEvents) check(bookingIds.has(c.bookingId), `${c.id} → 없는 booking`);

const allIds = [...catalog.slots.map((s) => s.id), ...bookings.bookings.map((b) => b.id)];
check(allIds.length === new Set(allIds).size, '중복 ID 있음');

if (fail.length) {
  console.error(`시드 검사 실패 — ${fail.length}건`);
  for (const m of fail) console.error(`  ✗ ${m}`);
  process.exit(1);
}
console.log(`시드 검사 통과 — 회차 ${catalog.slots.length} / 예약 ${bookings.bookings.length} / 계정 ${accounts.customers.length + accounts.staff.length}`);
