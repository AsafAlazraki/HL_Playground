/* ============================================================
   THE UX PASS — the surfaces, drawn.

   Companion to docs/plan/UX_PASS.md. Each component here answers
   a numbered finding in docs/audit/UX_AUDIT.md, and the content
   is the real seed's: 21 tables, 651 rows, Northside Marine.
   ============================================================ */

import type { ReactNode } from 'react'
import {
  ArrowRight,
  ArrowUUpLeft,
  Boat,
  Check,
  Engine,
  FileText,
  MagnifyingGlass,
  Plus,
  Tag,
  Table as TableIcon,
  TruckTrailer,
  Warning,
  X,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

/* ---------- ⌘K — finding 2 ----------------------------------- */

interface Hit {
  label: string
  where?: string
  amount?: string
  on?: boolean
}

const GROUPS: { group: string; hits: Hit[]; more?: string }[] = [
  { group: 'Modules', hits: [{ label: 'Boats', where: '159 rows · 7 brands' }] },
  {
    group: 'Rows',
    hits: [
      {
        label: 'Highfield SP560 (PVC) W-W-WB',
        where: 'Boats › Highfield ▸ Sport',
        on: true,
      },
      { label: 'Highfield SP560 (HYP) LG-W-DB', where: 'Boats › Highfield ▸ Sport' },
      { label: 'Highfield SP560 (PVC) B-W-C', where: 'Boats › Highfield ▸ Sport' },
    ],
    more: '+ 13 more in Highfield Inflatables',
  },
  {
    group: 'Quotes',
    hits: [
      {
        label: '20260811-01 · Alex Morgan',
        where: 'SP560 (PVC) B-W-B',
        amount: '$54,847',
      },
    ],
  },
  {
    group: 'Tables',
    hits: [{ label: 'Highfield Inflatables', where: '30 columns · 40 rows' }],
  },
  {
    group: 'Columns',
    hits: [{ label: 'Motor Envelope › Min HP', where: 'on 7 boat tables' }],
  },
]

export function CommandPalette() {
  return (
    <div className="cmdk-scrim">
      <div className="cmdk">
        <div className="cmdk-field">
          <MagnifyingGlass size={18} />
          <input defaultValue="sp560" aria-label="Search everything" />
          <span className="kbd">esc</span>
        </div>

        <div className="cmdk-results">
          {GROUPS.map((g) => (
            <div key={g.group}>
              <div className="cmdk-group">{g.group}</div>
              {g.hits.map((h) => (
                <button
                  className={`cmdk-row${h.on ? ' cmdk-row--on' : ''}`}
                  key={h.label}
                >
                  <span className="cmdk-label">{h.label}</span>
                  {h.amount ? <span className="cmdk-amt">{h.amount}</span> : null}
                  <span className="cmdk-where">{h.where}</span>
                </button>
              ))}
              {g.more ? <div className="cmdk-more">{g.more}</div> : null}
            </div>
          ))}
        </div>

        <div className="cmdk-foot">
          <span>
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> move
          </span>
          <span>
            <span className="kbd">↵</span> open
          </span>
          <span>
            <span className="kbd">⌘K</span> from anywhere
          </span>
        </div>
      </div>
    </div>
  )
}

/* ---------- undo, and the dialog it deletes — finding 7 ------- */

export function UndoToast() {
  return (
    <div className="toast">
      <span className="toast-text">
        Removed <b>3 columns</b> from Highfield Inflatables
      </span>
      <button className="ds-btn ds-btn--ghost ds-btn--sm">
        <ArrowUUpLeft size={14} /> Undo
      </button>
      <button className="ds-btn ds-btn--ghost ds-btn--sm" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  )
}

export function NotUndoableToast() {
  return (
    <div className="toast toast--warn">
      <span className="toast-text">
        Issued quote <b>20260811-01</b>
        <br />
        <span className="toast-note">
          <Warning size={11} weight="fill" style={{ verticalAlign: -1 }} /> An issued
          quote is frozen. This one cannot be undone.
        </span>
      </span>
      <button className="ds-btn ds-btn--ghost ds-btn--sm" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  )
}

export function BlastConfirm() {
  return (
    <div className="blast">
      <div className="blast-head">
        <span className="blast-mark">
          <Warning size={17} weight="fill" />
        </span>
        <div>
          <div className="blast-title">Delete the column Min HP?</div>
          <div className="blast-sub">Highfield Inflatables · this cannot be undone</div>
        </div>
      </div>
      <div className="blast-list">
        {[
          ['3', 'business rules name this column'],
          ['1', 'formula reads it — Dealer list'],
          ['38', 'of 40 rows hold a value in it'],
        ].map(([n, what]) => (
          <div className="blast-item" key={what}>
            <b>{n}</b>
            <span>{what}</span>
          </div>
        ))}
      </div>
      <div className="blast-actions">
        <button className="ds-btn ds-btn--ghost">Cancel</button>
        <button className="ds-btn ds-btn--danger-solid">Delete the column</button>
      </div>
    </div>
  )
}

/* ---------- propose the modules — UX_PASS §8 ------------------ */

interface Proposal {
  icon: Icon
  hue: string
  name: string
  meta: string
  evidence: string[]
}

const PROPOSALS: Proposal[] = [
  {
    icon: Boat,
    hue: 'boat',
    name: 'Boats',
    meta: '7 tables · 159 rows',
    evidence: ['pictures', 'cash prices', '3-level hierarchy'],
  },
  {
    icon: TruckTrailer,
    hue: 'trailer',
    name: 'Trailers',
    meta: '7 tables · 96 rows',
    evidence: ['prices'],
  },
  {
    icon: Engine,
    hue: 'motor',
    name: 'Motors',
    meta: '2 tables · 57 rows',
    evidence: ['pictures', 'prices'],
  },
  {
    icon: Tag,
    hue: 'accessory',
    name: 'Parts',
    meta: '1 table · 26 rows',
    evidence: ['prices'],
  },
]

export function ProposeModules() {
  return (
    <>
      <div className="propose-lead">
        <h4>From your 21 tables, these look like places in your business</h4>
        <p>
          Grouped by what each table holds. Create one, create all four, or pick a table
          yourself — nothing here is decided for you.
        </p>
      </div>
      <div className="propose-grid">
        {PROPOSALS.map((p) => (
          <div
            className="pcard"
            key={p.name}
            style={{ ['--pcard-ink' as string]: `var(--kind-${p.hue})` }}
          >
            <div className="pcard-top">
              <p.icon size={16} />
              <span className="pcard-name">{p.name}</span>
            </div>
            <div className="pcard-meta">{p.meta}</div>
            <div className="pcard-evidence">
              {p.evidence.map((e) => (
                <span className="ds-chip" key={e}>
                  {e}
                </span>
              ))}
            </div>
            <div className="pcard-actions">
              <button className="ds-btn ds-btn--secondary ds-btn--sm">Create</button>
            </div>
          </div>
        ))}
      </div>
      <div className="pv-row">
        <button className="ds-btn ds-btn--primary">
          <Plus size={14} /> Create all four
        </button>
        <button className="ds-btn ds-btn--ghost">Pick a table myself</button>
      </div>
    </>
  )
}

/* ---------- import with header mapping — finding 25 ---------- */

type MapState = 'ok' | 'new' | 'skip'

const MAPPING: [string, string, string, MapState][] = [
  ['Variant', 'Variant', 'txt', 'ok'],
  ['Model Code', 'Model code', 'txt', 'ok'],
  ['Material: PVC/HYP', 'Material', 'lst', 'ok'],
  ['Tube Dia. cm', 'new column', 'num', 'new'],
  ['Cash', 'Cash price', 'num', 'ok'],
  ['Internal notes', 'skip', '', 'skip'],
]

const STATUS: Record<MapState, ReactNode> = {
  ok: (
    <span className="imap-status imap-status--ok">
      <Check size={11} /> matched
    </span>
  ),
  new: <span className="imap-status imap-status--new">will be created</span>,
  skip: <span className="imap-status imap-status--skip">not imported</span>,
}

export function ImportMapping() {
  return (
    <div className="imap">
      <div className="imap-steps">
        {[
          ['1', 'Paste', 'done'],
          ['2', 'Header row', 'done'],
          ['3', 'Match columns', 'on'],
          ['4', 'Preview', ''],
        ].map(([n, label, state], i) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {i > 0 ? <span className="istep-sep">›</span> : null}
            <span
              className={`istep${state === 'done' ? ' istep--done' : ''}${
                state === 'on' ? ' istep--on' : ''
              }`}
            >
              <b>{state === 'done' ? <Check size={10} /> : n}</b>
              {label}
            </span>
          </span>
        ))}
        <div className="pv-top-spacer" />
        <span className="ds-mono-sm" style={{ color: 'var(--fg-tertiary)' }}>
          12 columns · 40 rows
        </span>
      </div>

      <div className="imap-rows">
        {MAPPING.map(([from, to, type, state]) => (
          <div className="imap-row" key={from}>
            <span className="imap-from">{from}</span>
            <span className="imap-arrow">
              <ArrowRight size={13} />
            </span>
            <button
              className={`imap-to${state === 'new' ? ' imap-to--new' : ''}${
                state === 'skip' ? ' imap-to--skip' : ''
              }`}
            >
              <span>{to}</span>
            </button>
            {type ? <span className="ds-chip">{type}</span> : <span />}
            {STATUS[state]}
          </div>
        ))}
      </div>

      <div className="imap-preview">
        <div className="pv-caption imap-preview-label">
          The first rows, as they will actually appear
        </div>
        {[
          ['Highfield SP560 (PVC) W-W-WB', 'HBS113 · PVC · 52 cm · $47,905'],
          ['Highfield SP560 (PVC) LG-W-WB', 'HBS115 · PVC · 52 cm · $47,905'],
        ].map(([label, rest]) => (
          <div className="imap-chip-row" key={label}>
            <TableIcon size={13} style={{ color: 'var(--fg-quaternary)' }} />
            <b>{label}</b>
            <span>{rest}</span>
          </div>
        ))}
      </div>

      <div className="imap-foot">
        <span className="imap-foot-note">
          1 column will be created, 1 will not be imported. The whole import is a single
          undo.
        </span>
        <button className="ds-btn ds-btn--ghost">Back</button>
        <button className="ds-btn ds-btn--primary">
          <FileText size={14} /> Add 40 rows
        </button>
      </div>
    </div>
  )
}
