#!/usr/bin/env node
// 문서 정합성 검사기.
//
// validate.yml이 보는 것(명세 문법·타입 생성·시드 무결성·버전 네 곳)은 여기서 다시 보지 않는다.
// 이 스크립트는 문서끼리 어긋나는 것만 본다 — 사람이 눈으로 훑어서는 놓치는 종류다.
//
//   node scripts/verify-docs.mjs
//
// 종료 코드: 어긋난 것이 있으면 1, 없으면 0.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const DOCS = join(ROOT, 'docs')

// 화면 수 정본. docs/prd/README.md와 01 §4.2 + 02 §4.1~4.4 실측이 기준이다.
const SCREENS = { define: 84, build: 168 }
// 화면 수를 말하면서 등장하면 낡은 값인 것들. 79·83은 옛 정의 수, 158·166은 옛 구현벌 수다.
const STALE_SCREEN_NUMBERS = [79, 83, 158, 166]

const problems = []
const report = (kind, file, line, msg) =>
  problems.push({ kind, file: relative(ROOT, file), line, msg })

/** archive와 node_modules를 뺀 마크다운 전부 */
function markdownFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'archive' || name === 'dist') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...markdownFiles(path))
    else if (name.endsWith('.md')) out.push(path)
  }
  return out
}

const files = [
  ...markdownFiles(DOCS),
  ...['README.md', 'CLAUDE.md']
    .map((n) => join(ROOT, n))
    .filter(existsSync),
  ...markdownFiles(join(ROOT, 'api-spec')),
  ...markdownFiles(join(ROOT, 'fixtures')),
]

const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]))
const lines = (f) => text.get(f).split('\n')

// ── 1. 문서 버전 수집 ────────────────────────────────────────────
// `| 문서 버전 | 2.2 |` 형태. 파이프 정렬은 문서마다 다르다.
const versionOf = new Map() // '00' -> '2.2'
const numberOf = new Map() // '00' -> 파일 경로
for (const f of files) {
  const b = basename(f)
  const m = b.match(/^(\d{2})-/)
  if (!m) continue
  numberOf.set(m[1], f)
  const v = text.get(f).match(/^\|\s*문서 버전\s*\|\s*([\d.]+)\s*\|/m)
  if (v) versionOf.set(m[1], v[1])
}

// ADR은 결정 시점의 기록이다. "이미 쓴 ADR은 고치지 않는다"(docs/adr/README.md)가
// 규칙이므로, 옛 이름과 옛 수치가 남아 있는 것이 정상이다. 내용 검사에서 뺀다.
const isAdr = (f) => f.includes(`${DOCS}/adr/`)

// ── 2. 상위 문서 버전 참조가 실제 버전과 맞는지 ──────────────────
// "상위 문서" 행만 본다. 다른 줄의 `NN`과 v가 우연히 만나면 짝이 틀어진다.
// 한 행에 여러 쌍이 있으므로(`00` v2.2, `01`·`02` v2.1, …) 쉼표로 끊어 쌍 단위로 본다.
//
// "기준 문서"는 검사하지 않는다. 그 행은 문서를 쓸 당시 무엇을 근거로 삼았는지를
// 적은 것이라, 상위 문서가 나중에 올라가도 그대로 두는 것이 맞다.
for (const f of files) {
  lines(f).forEach((line, i) => {
    if (!/상위 문서/.test(line)) return
    for (const chunk of line.split(/[,，]/)) {
      const ver = chunk.match(/\bv(\d+\.\d+)/)
      if (!ver) continue
      const refs = [...chunk.matchAll(/`(\d{2})(?:-[^`]*\.md)?`/g)].map((m) => m[1])
      for (const num of refs) {
        const actual = versionOf.get(num)
        if (actual && actual !== ver[1]) {
          report(
            '상위 문서 버전',
            f,
            i + 1,
            `\`${num}\`을 v${ver[1]}로 참조하는데 실제는 v${actual}이다`,
          )
        }
      }
    }
  })
}

// ── 3. 패키지 스코프 잔재 ────────────────────────────────────────
// ADR-0015가 @devc-showcase로 확정했다. @daylink는 옛 이름이다.
for (const f of files) {
  if (isAdr(f)) continue
  lines(f).forEach((line, i) => {
    if (line.includes('@daylink/')) {
      report('패키지 스코프', f, i + 1, '`@daylink/`는 옛 이름이다 (ADR-0015 → `@devc-showcase/`)')
    }
  })
}

// ── 4. 화면 수 표기 ──────────────────────────────────────────────
// 옛 값이 나오는 게 맞는 자리가 있다. 셋을 넘긴다.
//   - `79 → 84`처럼 화살표로 변화를 적은 줄
//   - 옛 값과 현행 값이 한 줄에 같이 있는 줄 (`| 화면 정의 | 79 | 84 |` 같은 이전/이후 표)
//   - 다른 판본을 명시한 줄 (`v2.2에서 … 반영 (화면 83, 구현 166)`)
// 그래도 남는 자리는 아래에 근거와 함께 적는다.
const SCREEN_EXCEPTIONS = [
  {
    file: 'docs/journal/DayLink-Advisor-커리큘럼-v2.3.md',
    contains: '94 (47 정의 × 2벌)',
    why: '§0.2 v2.0↔v2.1 비교 표. 두 열 다 그 시점 값이라 현행으로 고치면 비교가 깨진다',
  },
]
const isException = (f, line) =>
  SCREEN_EXCEPTIONS.some((e) => f.endsWith(e.file) && line.includes(e.contains))

for (const f of files) {
  if (isAdr(f)) continue
  lines(f).forEach((line, i) => {
    if (!/화면|정의|구현벌/.test(line)) return
    if (/→|->/.test(line)) return
    if (/\bv\d+\.\d+/.test(line)) return
    if (new RegExp(`(?<![\\d.])(${SCREENS.define}|${SCREENS.build})(?![\\d.%])`).test(line)) return
    if (isException(f, line)) return
    for (const stale of STALE_SCREEN_NUMBERS) {
      if (new RegExp(`(?<![\\d.])${stale}(?![\\d.%])`).test(line)) {
        report(
          '화면 수',
          f,
          i + 1,
          `낡은 값 ${stale}이 화면 문맥에 있다 (현행 ${SCREENS.define} 정의 / ${SCREENS.build} 구현벌)`,
        )
      }
    }
  })
}

// ── 4.5 회차 엔터티 이름 ─────────────────────────────────────────
// ADR-0014가 회차의 영어 식별자를 `Slot`으로 확정했다. `Session`은 인증 세션을
// 가리킬 때만 쓴다. 개명 이력을 적은 줄(`Session`에서 바꿨다는 서술)은 넘긴다.
for (const f of files) {
  if (isAdr(f)) continue
  lines(f).forEach((line, i) => {
    if (!/`Session`/.test(line)) return
    if (/인증 세션|HttpSession|개명|바꿨|였는데|원래/.test(line)) return
    report('회차 엔터티 이름', f, i + 1, '`Session`은 ADR-0014가 `Slot`으로 개명했다')
  })
}

// ── 5. ADR 상태표와 파일 머리말이 같은지 ─────────────────────────
const adrDir = join(DOCS, 'adr')
const adrReadme = join(adrDir, 'README.md')
if (existsSync(adrReadme)) {
  const statusInTable = new Map()
  for (const line of readFileSync(adrReadme, 'utf8').split('\n')) {
    const m = line.match(/^\|\s*\[(\d{4})\]\([^)]+\)\s*\|[^|]*\|\s*([^|]+?)\s*\|/)
    if (m) statusInTable.set(m[1], m[2])
  }
  for (const name of readdirSync(adrDir)) {
    const m = name.match(/^(\d{4})-.*\.md$/)
    if (!m) continue
    const body = readFileSync(join(adrDir, name), 'utf8')
    const head = body.match(/^\|\s*상태\s*\|\s*([^|]+?)\s*\|/m)
    const table = statusInTable.get(m[1])
    if (!head) {
      report('ADR 상태', join(adrDir, name), 1, '머리말에 상태 행이 없다')
      continue
    }
    if (table === undefined) {
      report('ADR 상태', adrReadme, 1, `ADR-${m[1]}이 목록 표에 없다`)
      continue
    }
    // "**유효** — 폴더 이름만 ADR-0011로 대체됨"은 유효다. 대시·괄호 앞의 판정어만 본다.
    const norm = (s) =>
      s.replace(/\*\*/g, '').split(/[—(]/)[0].includes('대체됨') ? '대체됨' : '유효'
    if (norm(head[1]) !== norm(table)) {
      report(
        'ADR 상태',
        join(adrDir, name),
        1,
        `파일은 "${norm(head[1])}"인데 목록 표는 "${norm(table)}"이다`,
      )
    }
  }
}

// ── 6. 공통 규칙이 저장소 CLAUDE.md에 복사돼 있지 않은지 ─────────
// 공통 규칙 정본은 작업 공간 루트의 CLAUDE.md다. 두 곳에 두면 한쪽만 고쳐진다.
const repoClaude = join(ROOT, 'CLAUDE.md')
if (existsSync(repoClaude)) {
  const markers = ['국립국어원', '무생물을 주어로', '관형절을 두 개 이상']
  const body = readFileSync(repoClaude, 'utf8')
  for (const marker of markers) {
    if (body.includes(marker)) {
      report(
        'CLAUDE.md 중복',
        repoClaude,
        1,
        `공통 규칙("${marker}")이 저장소 파일에 복사돼 있다. 정본은 작업 공간 루트다`,
      )
    }
  }
}

// ── 보고 ─────────────────────────────────────────────────────────
if (problems.length === 0) {
  console.log(`문서 정합성 검사 통과 — 파일 ${files.length}개`)
  process.exit(0)
}

const byKind = new Map()
for (const p of problems) {
  if (!byKind.has(p.kind)) byKind.set(p.kind, [])
  byKind.get(p.kind).push(p)
}
for (const [kind, list] of byKind) {
  console.log(`\n[${kind}] ${list.length}건`)
  for (const p of list) console.log(`  ${p.file}:${p.line}  ${p.msg}`)
}
console.log(`\n어긋난 곳 ${problems.length}건 — 파일 ${files.length}개를 검사했다.`)
process.exit(1)
