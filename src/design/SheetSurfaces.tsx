/* ============================================================
   THE TABLE, FOR SOMEBODY WHO DOES NOT THINK IN TABLES.

   The "before" is rebuilt from docs/screens/x09-final-expanded.png
   at its real density — the eleven truncated band labels are
   copied character-for-character, including the ellipses, and the
   UID column leads because it does.
   ============================================================ */

import {
  Boat,
  CaretRight,
  CurrencyDollar,
  Image as ImageIcon,
  LinkSimple,
  Plus,
  Table as TableIcon,
  Warning,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

/* ---------- what shipped ------------------------------------ */

const BANDS_TRUNCATED = [
  'IDEN… 8',
  'DIMENS… 6',
  'CAPA… 5',
  'COST B… 6',
  'MAR… 1',
  'HULL ONLY P… 7',
  'PRE-DEL… 8',
  'REGISTRATION &… 6',
  'MOTOR FI… 4',
  'DEPOSIT SC… 3',
  'FACTORY LEA… 1',
]

const BUSY_COLS = ['UID SYSTEM', 'VARIANT', 'NAME *', 'MODEL CODE', 'MATERIAL', 'COLOURWAY']

const BUSY_ROWS: string[][] = [
  ['kb2JYb4GLH', 'PVC W-W-WB', 'Highfield - SP520 (PVC) W…', 'HBS097', 'PVC', 'W-W-WB'],
  ['F3aCVk0UiS', 'HYP W-W-WB', 'Highfield - SP520 (HYP) W…', 'HBS098', 'HYP', 'W-W-WB'],
  ['DgBwe-eh1X', 'PVC W-W-WB', 'Highfield - SP560 (PVC) W…', 'HBS113', 'PVC', 'W-W-WB'],
]

export function BusyTable() {
  return (
    <div className="busy">
      <div className="busy-top">
        <span className="busy-btn">✧ COLLAPSE ALL</span>
        <span className="busy-btn">▭ FIT COLUMNS</span>
        <div style={{ flex: 1 }} />
        <span className="busy-stat">
          ROWS <b>29</b>
        </span>
        <span className="busy-stat">
          COLUMNS <b>56</b>
        </span>
      </div>
      <div className="busy-bands">
        <span className="busy-stat" style={{ paddingRight: 4 }}>
          SECTIONS
        </span>
        {BANDS_TRUNCATED.map((b) => (
          <span className="busy-band" key={b}>
            {b}
          </span>
        ))}
      </div>
      <div className="busy-cols">
        {BUSY_COLS.map((c) => (
          <span
            className={`busy-col${c.startsWith('UID') ? ' busy-col--uid' : ''}`}
            key={c}
            style={{ width: c === 'NAME *' ? 150 : 96 }}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="busy-group">▾ BRAND HIGHFIELD INFLATABLES · 29 VARIANTS</div>
      <div className="busy-group">&nbsp;&nbsp;▾ SERIES Sport · 21 VARIANTS</div>
      <div className="busy-rows">
        {BUSY_ROWS.map((r) => (
          <div className="busy-row" key={r[0]}>
            {r.map((c, i) => (
              <span
                className={`busy-cell${i === 0 ? ' busy-cell--uid' : ''}`}
                key={i}
                style={{ width: i === 2 ? 150 : 96 }}
              >
                {c}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- jobs, not tools --------------------------------- */

interface Job {
  icon: Icon
  title: string
  sub: string
  count?: string
  state?: 'attention' | 'refused'
}

const JOBS: Job[] = [
  {
    icon: CurrencyDollar,
    title: 'Change prices',
    sub: 'Cash, trade and hull-only, side by side',
    count: '14',
  },
  {
    icon: Plus,
    title: 'Add a boat',
    sub: 'One row, filled in as a form',
  },
  {
    icon: LinkSimple,
    title: 'Set what goes with these',
    sub: 'Motors, trailers and parts that fit',
    count: '3',
  },
  {
    icon: Warning,
    title: 'Fix what’s missing',
    sub: '2 boats have no price, 2 have no picture',
    count: '4',
    state: 'attention',
  },
  {
    icon: ImageIcon,
    title: 'Add pictures',
    sub: 'Nothing on this table is set as the photo column yet',
    state: 'refused',
  },
]

export function JobsPanel() {
  return (
    <div
      className="jobs"
      style={{
        ['--jobs-ink' as string]: 'var(--kind-boat)',
        ['--jobs-wash' as string]: 'color-mix(in srgb, var(--kind-boat) 13%, transparent)',
      }}
    >
      <div className="jobs-head">
        <span className="jobs-mark">
          <Boat size={20} />
        </span>
        <div>
          <div className="jobs-name">Highfield Inflatables</div>
          {/* the dealer's nouns, not the app's */}
          <div className="jobs-sum">
            <b>40 boats</b> in 3 series. Pictures on 38 of them, and prices are set.
          </div>
        </div>
      </div>

      <div className="pv-caption jobs-label">What do you want to do?</div>

      <div className="jobs-list">
        {JOBS.map((j) => (
          <button
            className={`job${j.state === 'attention' ? ' job--attention' : ''}${
              j.state === 'refused' ? ' job--refused' : ''
            }`}
            key={j.title}
            disabled={j.state === 'refused'}
          >
            <span className="job-mark">
              <j.icon size={16} weight={j.state === 'attention' ? 'fill' : 'regular'} />
            </span>
            <span className="job-text">
              <span className="job-title">{j.title}</span>
              <span className="job-sub">{j.sub}</span>
            </span>
            {j.count ? <span className="job-count">{j.count}</span> : null}
            {j.state !== 'refused' ? (
              <CaretRight size={14} className="job-go" />
            ) : null}
          </button>
        ))}
      </div>

      <button className="jobs-sheet">
        <TableIcon size={18} />
        <span className="jobs-sheet-text">
          <b>Open the sheet</b>
          <span>Every column at once, spreadsheet style. Nothing is hidden from you.</span>
        </span>
        <CaretRight size={14} />
      </button>
    </div>
  )
}
