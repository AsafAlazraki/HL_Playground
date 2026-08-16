/* ============================================================
   QUIET PRECISION — the preview page.

   One route, no store, no persistence. It shows the new
   foundations and every component that carries the redesign,
   with the outgoing version beside the ones where the redesign
   is an argument rather than a repaint.

   IT IS ALIGNED TO docs/plan/MODULE_SYSTEM.md. The dashboard is
   the front door, a module is a place in the business, and the
   blueprint sheet is one built-in module rather than the app.
   The two surfaces that plan names as genuinely new work — the
   dashboard and the INDEX renderer — are designed here.

   All content is real: the tables, counts, column names, bands
   and figures are Northside Marine's, from src/demos.
   ============================================================ */

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowsLeftRight,
  Boat,
  CaretDown,
  Check,
  DotsSixVertical,
  Engine,
  FileText,
  Gear,
  House,
  ListChecks,
  MagnifyingGlass,
  Moon,
  Plus,
  Stack,
  Storefront,
  Sun,
  Table,
  Tag,
  TreeStructure,
  TruckTrailer,
  Warning,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import {
  BlastConfirm,
  CommandPalette,
  ImportMapping,
  NotUndoableToast,
  ProposeModules,
  UndoToast,
} from './UxSurfaces'

/* ---------- shared bits ------------------------------------- */

function Section({
  id,
  title,
  blurb,
  children,
}: {
  id: string
  title: string
  blurb: ReactNode
  children: ReactNode
}) {
  return (
    <section className="pv-section" id={id}>
      <header>
        <h2>{title}</h2>
        <p>{blurb}</p>
      </header>
      {children}
    </section>
  )
}

function Swatch({ name, value, ink }: { name: string; value: string; ink?: string }) {
  return (
    <div className="pv-swatch">
      <div className="pv-swatch-chip" style={{ background: `var(${value})` }} />
      <div className="pv-swatch-meta">
        <div className="pv-swatch-name">{name}</div>
        <div className="pv-swatch-val">{ink ?? value}</div>
      </div>
    </div>
  )
}

function Switch({ on, locked }: { on: boolean; locked?: boolean }) {
  const [v, setV] = useState(on)
  return (
    <button
      className={`sw${v ? ' sw--on' : ''}${locked ? ' sw--locked' : ''}`}
      aria-label="toggle"
      disabled={locked}
      onClick={() => !locked && setV((x) => !x)}
    />
  )
}

/* ---------- the table card ---------------------------------- */

type KindKey = 'boat' | 'motor' | 'trailer' | 'accessory' | 'package' | 'dealer' | 'custom'

const KIND_MARK: Record<KindKey, Icon> = {
  boat: Boat,
  motor: Engine,
  trailer: TruckTrailer,
  accessory: Tag,
  package: Stack,
  dealer: Storefront,
  custom: Table,
}

interface CardData {
  kind: KindKey
  kindLabel: string
  name: string
  bands: string[]
  more?: number
  rows: number
  cols: number
  rowNoun: string
}

function TableCard({ data, state }: { data: CardData; state?: 'selected' | 'dim' }) {
  const Mark = KIND_MARK[data.kind]
  return (
    <div
      className={`tcard${state === 'selected' ? ' tcard--selected' : ''}${
        state === 'dim' ? ' tcard--dim' : ''
      }`}
      style={{ ['--tcard-kind' as string]: `var(--kind-${data.kind})` }}
    >
      <div className="tcard-kind">
        <Mark size={15} />
        <span>{data.kindLabel}</span>
      </div>
      <h4 className="tcard-name">{data.name}</h4>
      <div className="tcard-bands">
        {data.bands.map((b) => (
          <span className="tcard-band" key={b}>
            {b}
          </span>
        ))}
        {data.more ? <span className="tcard-band tcard-band--more">+{data.more}</span> : null}
      </div>
      <div className="tcard-stats">
        <div className="tcard-stat">
          <b>{data.rows}</b>
          <span>{data.rowNoun}</span>
        </div>
        <div className="tcard-stat">
          <b>{data.cols}</b>
          <span>columns</span>
        </div>
      </div>
    </div>
  )
}

function JoinCard({ name, pair, rows }: { name: string; pair: string; rows: number }) {
  return (
    <div className="tcard tcard--join" style={{ ['--tcard-kind' as string]: 'var(--kind-join)' }}>
      <div className="tcard-kind" style={{ color: 'var(--kind-join)' }}>
        <ArrowsLeftRight size={15} />
        <span>Relationship</span>
      </div>
      <h4 className="tcard-name">{name}</h4>
      <div className="tcard-pair">{pair}</div>
      <div className="tcard-stats">
        <div className="tcard-stat">
          <b>{rows}</b>
          <span>pairs</span>
        </div>
      </div>
    </div>
  )
}

/* the outgoing card, rebuilt at true scale for the comparison */
function OldCard({ name }: { name: string }) {
  return (
    <div className="oldcard">
      <div className="oldcard-glyph">
        <Boat size={11} weight="light" />
      </div>
      <div className="oldcard-name">{name}</div>
      <div className="oldcard-bands">IDENTITY CAPACITY CONSTRUCTION COST BUILD +3</div>
      <div className="oldcard-stats">
        <span>
          40 <i>VARIANTS</i>
        </span>
        <span>
          30 <i>COLUMNS</i>
        </span>
      </div>
    </div>
  )
}

/* ============================================================
   THE SHELL UNDER MODULES
   ============================================================ */

interface ModuleRow {
  name: string
  count: string
  hue: string
  active?: boolean
}

const MODULES: ModuleRow[] = [
  { name: 'Boats', count: '159', hue: 'boat', active: true },
  { name: 'Trailers', count: '96', hue: 'trailer' },
  { name: 'Parts & Accessories', count: '26', hue: 'accessory' },
  { name: 'Quotes', count: '1', hue: 'package' },
]

const BUILTINS: { icon: Icon; name: string; count: string }[] = [
  { icon: TreeStructure, name: 'Data model', count: '22' },
  { icon: ListChecks, name: 'Business rules', count: '6' },
  { icon: ArrowsLeftRight, name: 'Fitment flows', count: '5' },
]

function ModuleNav({ active = 'Boats' }: { active?: string }) {
  return (
    <div className="nav">
      <div className="nav-head">
        <div className="nav-head-text">
          <div className="nav-org">Northside Marine</div>
          <div className="nav-industry">Marine · 4 modules</div>
        </div>
        <button className="ds-btn ds-btn--ghost ds-btn--sm" aria-label="Switch project">
          <CaretDown size={14} />
        </button>
      </div>

      <div className="nav-search">
        <div className="nav-search-box">
          <MagnifyingGlass size={14} />
          <input className="ds-input" placeholder="Search everything" readOnly />
        </div>
      </div>

      <div className="nav-group">
        <button className={`nav-item${active === 'Dashboard' ? ' nav-item--active' : ''}`}>
          <House size={16} />
          <span className="nav-item-label">Dashboard</span>
        </button>
      </div>

      <div className="nav-scroll">
        <div className="nav-group">
          <div className="nav-group-label">
            <span>Modules</span>
            <span>04</span>
          </div>
          {MODULES.map((m) => (
            <button
              className={`nav-item${m.name === active ? ' nav-item--active' : ''}`}
              key={m.name}
            >
              <span
                className="nav-dot"
                style={{ ['--nav-dot' as string]: `var(--kind-${m.hue})` }}
              />
              <span className="nav-item-label">{m.name}</span>
              <span className="nav-count">{m.count}</span>
            </button>
          ))}
          <button className="nav-item" style={{ color: 'var(--fg-tertiary)' }}>
            <Plus size={16} />
            <span className="nav-item-label">New module</span>
          </button>
        </div>

        <div className="nav-group">
          <div className="nav-group-label">
            <span>Set up</span>
            <span />
          </div>
          {BUILTINS.map(({ icon: I, name, count }) => (
            <button className="nav-item" key={name}>
              <I size={16} />
              <span className="nav-item-label">{name}</span>
              <span className="nav-count">{count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* the outgoing panel, rebuilt for the comparison */
function OldPanel() {
  return (
    <div className="oldnav">
      <div className="oldnav-btn">+ Create table</div>
      <div className="oldnav-lbl">Table types</div>
      <div className="oldnav-hint">Drag one onto the sheet, or click to place it.</div>
      {(
        [
          ['Boats', Boat],
          ['Motors', Engine],
          ['Trailers', TruckTrailer],
          ['Accessories', Tag],
          ['Packages', Stack],
          ['Dealers', Storefront],
          ['Custom table', Table],
        ] as [string, Icon][]
      ).map(([label, I]) => (
        <div className="oldnav-type" key={label}>
          <I size={18} weight="light" />
          {label}
        </div>
      ))}
      <div style={{ height: 14 }} />
      {[
        ['Quotes we have made', '1 MADE SO FAR'],
        ['Work out what fits what', 'WALK EVERY ROW, COLLECT THE MATCHES'],
        ['Business rules', 'LIMITS EVERY ROW MUST KEEP'],
      ].map(([a, b]) => (
        <div className="oldnav-door" key={a}>
          <b>{a}</b>
          <i>{b}</i>
        </div>
      ))}
      <div style={{ height: 14 }} />
      <div className="oldnav-lbl">Tables 22</div>
      <div className="oldnav-lbl">Boats 07</div>
      {['Formosa', 'Haines Signature', 'Highfield Inflatabl…'].map((n) => (
        <div className="oldnav-row" key={n}>
          <Boat size={18} weight="light" />
          <span>{n}</span>
          <span>26</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- the dashboard ------------------------------------ */

interface ModCard {
  icon: Icon
  hue: string
  name: string
  desc: string
  master: string
  count: string
  countNoun: string
  read: string[]
  write: string[]
}

const DASH: ModCard[] = [
  {
    icon: Boat,
    hue: 'boat',
    name: 'Boats',
    desc: 'Every hull we sell, across seven brands, with what fits each one.',
    master: 'Highfield Inflatables + 6',
    count: '159',
    countNoun: 'rows',
    read: ['browse', 'search', 'open'],
    write: ['relate', 'quote'],
  },
  {
    icon: TruckTrailer,
    hue: 'trailer',
    name: 'Trailers',
    desc: 'Seven trailer brands with their ATM, tare and rego costs.',
    master: 'NSM Custom Trailers + 6',
    count: '96',
    countNoun: 'rows',
    read: ['browse', 'search', 'open'],
    write: [],
  },
  {
    icon: Tag,
    hue: 'accessory',
    name: 'Parts & Accessories',
    desc: 'The parts counter. Priced, categorised, editable in place.',
    master: 'Parts & Accessories',
    count: '26',
    countNoun: 'rows',
    read: ['browse', 'search', 'open'],
    write: ['add', 'edit'],
  },
  {
    icon: FileText,
    hue: 'package',
    name: 'Quotes',
    desc: 'Every quote written, draft and issued, searchable by customer.',
    master: 'Documents',
    count: '1',
    countNoun: 'document',
    read: ['browse', 'search', 'open', 'export'],
    write: ['edit', 'delete'],
  },
]

function Dashboard() {
  return (
    <>
      <div className="dash-head">
        <h3>Northside Marine</h3>
        <p>Four modules · 22 tables · 651 rows</p>
      </div>
      <div className="dash-grid">
        {DASH.map((m) => (
          <button
            className="mcard"
            key={m.name}
            style={{
              ['--mcard-ink' as string]: `var(--kind-${m.hue})`,
              ['--mcard-wash' as string]: `color-mix(in srgb, var(--kind-${m.hue}) 13%, transparent)`,
            }}
          >
            <div className="mcard-top">
              <span className="mcard-mark">
                <m.icon size={17} />
              </span>
              <span className="mcard-name">{m.name}</span>
            </div>
            <div className="mcard-desc">{m.desc}</div>
            <div className="mcard-meta">
              <b>{m.count}</b>
              <span>
                {m.countNoun} in {m.master}
              </span>
            </div>
            <div className="mcard-verbs">
              {m.read.map((v) => (
                <span className="verb" key={v}>
                  {v}
                </span>
              ))}
              {m.write.map((v) => (
                <span className="verb verb--write" key={v}>
                  {v}
                </span>
              ))}
            </div>
          </button>
        ))}

        <button
          className="mcard mcard--builtin"
          style={{
            ['--mcard-ink' as string]: 'var(--fg-tertiary)',
            ['--mcard-wash' as string]: 'var(--chip-bg)',
          }}
        >
          <div className="mcard-top">
            <span className="mcard-mark">
              <TreeStructure size={17} />
            </span>
            <span className="mcard-name">Data model</span>
          </div>
          <div className="mcard-desc">
            The sheet the whole business is drawn on. Built in — you did not make it and cannot
            delete it.
          </div>
          <div className="mcard-meta">
            <b>22</b>
            <span>tables · 651 rows</span>
          </div>
          <div className="mcard-verbs">
            <span className="verb">built in</span>
          </div>
        </button>

        <button className="mcard mcard--new">
          <Plus size={20} />
          New module
        </button>
      </div>
    </>
  )
}

/* ---------- the INDEX surface — the one new renderer --------- */

interface TileData {
  name: string
  price?: string
  pic: boolean
}

const HIGHFIELD_SPORT: TileData[] = [
  { name: 'SP520 (PVC) W-W-WB', price: '41,340', pic: true },
  { name: 'SP560 (PVC) LG-W-WB', price: '47,905', pic: true },
  { name: 'SP560 (PVC) B-W-C', price: '47,905', pic: true },
  { name: 'SP560 (HYP) W-W-WB', price: '51,190', pic: true },
  { name: 'SP600 (PVC) B-B-DB', price: '58,420', pic: false },
]

const STACER_OPEN: TileData[] = [
  { name: '429 Seaway', price: '18,990', pic: true },
  { name: '449 Seaway', price: '21,450', pic: true },
  { name: '481 Fishabout', price: '26,880', pic: true },
]

function Tile({ t }: { t: TileData }) {
  return (
    <button className="tile">
      {t.pic ? (
        <span className="tile-pic">
          <Boat size={26} weight="thin" />
        </span>
      ) : (
        <span className="tile-pic tile-pic--none">{t.name}</span>
      )}
      <span className="tile-body">
        <span className="tile-name">{t.name}</span>
        <span className="tile-price">${t.price}</span>
        <span className="tile-rung">cash</span>
      </span>
    </button>
  )
}

function IndexSurface() {
  return (
    <>
      <div className="idx-bar">
        <label className="idx-search">
          <MagnifyingGlass size={16} />
          <input className="ds-input" placeholder="Search 159 boats by name" readOnly />
        </label>
        <div className="pv-top-spacer" />
        <button className="ds-btn ds-btn--ghost ds-btn--sm">Tiles</button>
        <button className="ds-btn ds-btn--ghost ds-btn--sm">Rows</button>
      </div>

      <div className="idx-group">
        <div className="idx-group-head">
          <span className="idx-brand">Highfield Inflatables</span>
          <span className="idx-path">▸ Sport</span>
          <span className="idx-count">21 variants</span>
        </div>
        <div className="idx-tiles">
          {HIGHFIELD_SPORT.map((t) => (
            <Tile t={t} key={t.name} />
          ))}
        </div>
      </div>

      <div className="idx-group">
        <div className="idx-group-head">
          <span className="idx-brand">Stacer</span>
          <span className="idx-path">▸ Open Boats</span>
          <span className="idx-count">26 models</span>
        </div>
        <div className="idx-tiles">
          {STACER_OPEN.map((t) => (
            <Tile t={t} key={t.name} />
          ))}
        </div>
      </div>
    </>
  )
}

/* ---------- capabilities ------------------------------------- */

const CAPS: { verb: string; note: string; on: boolean; refused?: string }[] = [
  { verb: 'browse', note: 'The index surface exists at all.', on: true },
  { verb: 'search', note: 'A field over the index. Every result opens.', on: true },
  { verb: 'open', note: 'A row opens its detail surface.', on: true },
  { verb: 'add', note: 'A NEW button on the index; a blank row.', on: false },
  { verb: 'edit', note: 'Detail cells accept typing.', on: false },
  { verb: 'delete', note: 'A row can be removed, with a confirm.', on: false },
  { verb: 'relate', note: 'Pin and unpin rows inside related blocks.', on: true },
  {
    verb: 'quote',
    note: 'Quote this one, on the detail surface.',
    on: false,
    refused:
      'Nothing on this table is marked as a price. Set price columns on Stacer Trailers first.',
  },
  { verb: 'export', note: 'The index’s rows leave as a file.', on: false },
  { verb: 'import', note: 'Rows arrive from a file into the master table.', on: false },
]

/* ---------- the grid ---------------------------------------- */

const BANDS: [string, number, boolean][] = [
  ['Identity', 8, true],
  ['Dimensions', 6, false],
  ['Capacity', 5, false],
  ['Cost ladder', 6, false],
  ['Retail pricing', 7, false],
  ['Registration & fees', 6, false],
  ['Motor fitment', 4, false],
]

const ROWS: [string, string, string, string, string, string][] = [
  ['01', 'PVC W-W-WB', 'Highfield SP520 (PVC) W-W-WB', 'HBS097', 'PVC', '41,340'],
  ['02', 'HYP W-W-WB', 'Highfield SP520 (HYP) W-W-WB', 'HBS098', 'HYP', '44,180'],
  ['03', 'PVC LG-W-WB', 'Highfield SP560 (PVC) LG-W-WB', 'HBS115', 'PVC', '47,905'],
  ['04', 'PVC B-W-C', 'Highfield SP560 (PVC) B-W-C', 'HBS119', 'PVC', '47,905'],
]

function NewGrid() {
  return (
    <div className="grid">
      <div className="grid-top">
        <div className="grid-title">
          <Boat size={17} style={{ color: 'var(--kind-boat)' }} />
          Highfield Inflatables
        </div>
        <span className="ds-mono-sm" style={{ color: 'var(--fg-tertiary)' }}>
          40 variants · 30 columns
        </span>
        <div className="grid-top-spacer" />
        <button className="ds-btn ds-btn--ghost ds-btn--sm">Collapse all</button>
        <button className="ds-btn ds-btn--secondary ds-btn--sm">
          <Plus size={13} /> Variant
        </button>
      </div>

      <div className="grid-bands">
        {BANDS.map(([name, n, on]) => (
          <button className={`grid-band${on ? ' grid-band--on' : ''}`} key={name}>
            {name} <b>{n}</b>
          </button>
        ))}
      </div>

      <div className="grid-scroll">
        <table className="grid-table">
          <thead>
            <tr>
              <th className="grid-gutter" />
              <th>
                <div className="grid-th">
                  <span className="grid-th-name">Variant</span>
                  <span className="ds-chip">txt</span>
                </div>
              </th>
              <th>
                <div className="grid-th">
                  <span className="grid-th-name">
                    Name <span className="grid-th-req">*</span>
                  </span>
                  <span className="ds-chip">txt</span>
                </div>
              </th>
              <th>
                <div className="grid-th">
                  <span className="grid-th-name">Model code</span>
                  <span className="ds-chip">txt</span>
                </div>
              </th>
              <th>
                <div className="grid-th">
                  <span className="grid-th-name">Material</span>
                  <span className="ds-chip">lst</span>
                </div>
              </th>
              <th>
                <div className="grid-th">
                  <span className="grid-th-name">Dealer list</span>
                  <span className="ds-chip ds-chip--computed">fx</span>
                </div>
              </th>
              <th style={{ width: 72 }}>
                <div className="grid-th">
                  <span className="grid-th-name">Photo</span>
                  <span className="ds-chip ds-chip--linked">img</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="grid-group">
              <td />
              <td colSpan={6}>
                <div className="grid-group-inner">
                  <span className="grid-group-kind">Series</span>
                  <span className="grid-group-name">Sport</span>
                  <span className="grid-group-count">21 variants</span>
                </div>
              </td>
            </tr>
            {ROWS.map(([n, variant, name, code, mat, price], i) => (
              <tr key={n}>
                <td className="grid-gutter">{n}</td>
                <td className={i === 0 ? 'grid-cell--sel' : undefined}>{variant}</td>
                <td>{name}</td>
                <td className="grid-code">{code}</td>
                <td>{mat}</td>
                <td className="grid-num grid-cell--computed">{price}</td>
                <td>
                  <span className="grid-thumb" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- rule sentence ------------------------------------ */

function RuleCard({ on, incomplete }: { on: boolean; incomplete?: boolean }) {
  const [enabled, setEnabled] = useState(on)
  return (
    <div className="rule">
      <button
        className={`sw${enabled ? ' sw--on' : ''}`}
        aria-label="Rule enabled"
        onClick={() => setEnabled((v) => !v)}
      />
      <div className="rule-body">
        <div className="rule-sentence">
          When{' '}
          <button className="rule-tok">
            Hull length (mtr) <CaretDown size={11} />
          </button>{' '}
          is at least <button className="rule-tok rule-tok--value">5.6</button>, the{' '}
          <button className="rule-tok">
            Motor HP rating <CaretDown size={11} />
          </button>{' '}
          must be at least{' '}
          {incomplete ? (
            <button className="rule-tok rule-tok--empty">pick a value</button>
          ) : (
            <button className="rule-tok rule-tok--value">90</button>
          )}
          .
        </div>
        <div className="rule-meta">
          {incomplete ? (
            <span className="rule-status rule-status--off">Not yet runnable</span>
          ) : (
            <span className="rule-status">
              <Check size={13} /> Holds on all 651 rows
            </span>
          )}
          <span>·</span>
          <span>Highfield Inflatables → Yamaha Outboards</span>
        </div>
      </div>
    </div>
  )
}

/* ---------- the page ---------------------------------------- */

const TYPE_STEPS: [string, string, string][] = [
  ['display', '28 / 620 / 1.15 / −0.021em', 'ds-display'],
  ['title', '20 / 600 / 1.25 / −0.014em', 'ds-title'],
  ['heading', '15 / 570 / 1.35 / −0.009em', 'ds-heading'],
  ['body', '14 / 400 / 1.50 / −0.002em', 'ds-body'],
  ['small', '13 / 400 / 1.45 / 0', 'ds-small'],
  ['caption', '12 / 500 / 1.35 / +0.002em', 'ds-caption'],
  ['label', '11 / 600 / 1.30 / +0.07em', 'ds-label'],
]

/* Contrast is a property of a PAIR, so it changes with the theme.
   These are measured in-browser against --surface-1, not
   estimated — an earlier pass asserted four figures by hand and
   three of them were wrong. */
const TEXT_RAMP: [string, string, string, string][] = [
  ['Primary — names, values, anything read', '--fg', '18.9 : 1', '15.7 : 1'],
  ['Secondary — descriptions, help, sentences', '--fg-secondary', '7.7 : 1', '7.5 : 1'],
  ['Tertiary — metadata. The floor.', '--fg-tertiary', '4.7 : 1', '4.7 : 1'],
  ['Quaternary — decoration only, never a word', '--fg-quaternary', '2.8 : 1', '2.8 : 1'],
]

const TOC = [
  ['dashboard', 'Dashboard'],
  ['index', 'Index'],
  ['search', 'Search'],
  ['undo', 'Undo'],
  ['import', 'Import'],
  ['propose', 'First run'],
  ['nav', 'Navigation'],
  ['caps', 'Capabilities'],
  ['card', 'Cards'],
  ['grid', 'Grid'],
  ['rules', 'Rules'],
  ['quote', 'Quote'],
  ['color', 'Colour'],
  ['type', 'Type'],
  ['controls', 'Controls'],
]

export function DesignPreview() {
  /* LIGHT IS THE DEFAULT. Dark is the alternate, and the toggle
     writes the attribute the token file keys off. */
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [design, setDesign] = useState(false)

  const flip = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <div className="ds-root pv">
      <div className="pv-top">
        <div className="pv-brand">
          <strong>Quiet Precision</strong>
          <span>HelmLogic · redesign</span>
        </div>
        <div className="pv-top-spacer" />
        <nav className="pv-toc">
          {TOC.map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </nav>
        <button className="ds-btn ds-btn--secondary ds-btn--sm" onClick={flip}>
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>

      <div className="pv-wrap">
        <div className="pv-hero">
          <h1>
            Quiet Precision
            <br />
            for a tool people use all day.
          </h1>
          <p>
            The outgoing system, “The Chart Room”, was a costume: a navy blueprint field, a
            display serif set at 9px, and 8–11px uppercase letterspaced mono carrying labels
            that were never data. It measured 35 font sizes, 26 tracking values and 24
            line-heights — 8 of them coexisting at 13px. This replaces it with a system small
            enough to hold in your head, and lays it over the module system in{' '}
            <code className="ds-mono-sm">docs/plan/MODULE_SYSTEM.md</code> rather than over the
            five hardcoded stages it retires.
          </p>
          <div className="pv-hero-meta">
            <div>
              <dt>Type steps</dt>
              <dd>6 + 1 label, down from 35</dd>
            </div>
            <div>
              <dt>Faces</dt>
              <dd>Inter + IBM Plex Mono</dd>
            </div>
            <div>
              <dt>Hues</dt>
              <dd>1 accent + 8 kinds, down from 22</dd>
            </div>
            <div>
              <dt>Default</dt>
              <dd>Light, with dark measured</dd>
            </div>
          </div>
        </div>

        {/* ---------------- dashboard ---------------- */}
        <Section
          id="dashboard"
          title="The dashboard"
          blurb="The new front door. Not a stage over the canvas — the thing you see when nothing is open. Each card names a place in the business, what it is about, how much is in it, and what can be done there, as words. The blueprint sheet is one built-in card among the rest."
        >
          <div className="pv-stage pv-stage--flush">
            <div className="shell">
              <ModuleNav active="Dashboard" />
              <div className="shell-main">
                <div className="shell-top">
                  <div className="crumb">
                    <b>Dashboard</b>
                  </div>
                  <div className="shell-spacer" />
                  <button className="ds-btn ds-btn--ghost ds-btn--sm">Import / export</button>
                  <button
                    className={`gear${design ? ' gear--on' : ''}`}
                    onClick={() => setDesign((v) => !v)}
                  >
                    <Gear size={14} weight={design ? 'fill' : 'regular'} />
                    {design ? 'Designing' : 'Design'}
                  </button>
                </div>
                <div className="shell-body">
                  <Dashboard />
                </div>
              </div>
            </div>
          </div>
          <div className="pv-note">
            <strong>Writing verbs are tinted, reading verbs are not.</strong> Everything that
            writes is off by default in the plan, so turning one on should be visible from the
            dashboard without opening the module. The description comes from a field the admin
            typed — never derived by substring-matching the name, which is how HelmLogic tells
            every trailer and service user they are configuring boat packages.
          </div>
        </Section>

        {/* ---------------- index ---------------- */}
        <Section
          id="index"
          title="The index surface"
          blurb="The one genuinely new renderer in Phase 1. A catalogue is an index and the app has none — the closest thing today is a 120-row capped rail. Tiles group by source table, then by that table's own hierarchy, so seven brands read as one catalogue while each keeps its own columns."
        >
          <div className="pv-stage pv-stage--flush">
            <div className="shell">
              <ModuleNav active="Boats" />
              <div className="shell-main">
                <div className="shell-top">
                  <div className="crumb">
                    <b>Boats</b>
                    <span>· 159 rows across 7 brands</span>
                  </div>
                  <div className="shell-spacer" />
                  <button className="gear">
                    <Gear size={14} /> Design
                  </button>
                </div>
                <div className="shell-body">
                  <IndexSurface />
                </div>
              </div>
            </div>
          </div>
          <div className="pv-note">
            <strong>Search is the point.</strong> The UX audit's second-worst finding is that
            with 21 tables and 651 rows loaded you cannot ask the app for a boat by name. The
            field is the first control on the surface, at 40px, and it is not a filter icon in a
            toolbar. <strong>A tile with no picture says nothing about a picture</strong> — it
            shows the row label and stops. A broken-image glyph in front of a customer is worse
            than a plain name.
          </div>
        </Section>

        {/* ---------------- search ---------------- */}
        <Section
          id="search"
          title="One search over everything"
          blurb="There is no search in this app of any kind — verified, against 21 tables and 651 rows. Per-module search is necessary and not sufficient, because the whole problem is that you do not know which module the thing is in."
        >
          <div className="pv-stage pv-stage--flush">
            <CommandPalette />
          </div>
          <div className="pv-note">
            <strong>Every result says where it lives.</strong> “Where am I, and how did I
            get here” is the wayfinding question this app fails worst, so the path is part
            of the result rather than something you find out after opening it. Row labels
            only — never a UID, never a raw cell value; the audit's own note on this change
            is that a search returning <code className="ds-mono-sm">kb2JYb4GLH</code> would
            be worse than no search at all. Enter opens the thing, which also fixes the view
            page always reopening on row 1 of 40.
          </div>
        </Section>

        {/* ---------------- undo ---------------- */}
        <Section
          id="undo"
          title="Undo, and the nine dialogs it deletes"
          blurb="The app mentions undo nineteen times across src/ and implements it zero times — every mention is an apology. This stops being optional the moment a module hands a salesperson the edit and delete verbs over a dealership's real price file."
        >
          <div className="pv-stage" style={{ display: 'grid', gap: 'var(--s-5)', justifyItems: 'start' }}>
            <UndoToast />
            <NotUndoableToast />
            <BlastConfirm />
          </div>
          <div className="pv-note">
            <strong>If an act is undoable, it does not get a dialog — it gets a toast with
            UNDO in it.</strong> The four confirm sheets exist <em>because</em> there is no
            undo; <code className="ds-mono-sm">ConfirmSheet.tsx:5</code> says so itself. That
            turns the common destructive acts from stop-read-decide-confirm into act-glance-
            carry-on, which is quicker <em>and</em> less frightening. What survives is the
            genuinely irreversible — and it states its blast radius, computed from
            <code className="ds-mono-sm"> dependents.ts</code>, instead of a fixed sentence.
            Anything not undoable says so at the moment it happens, never in a spec.
          </div>
        </Section>

        {/* ---------------- import ---------------- */}
        <Section
          id="import"
          title="Getting data in"
          blurb="Every one of these dealers keeps their business in a spreadsheet, so import is not a feature of this product — it is the front door. Today the empty-table card advertises “paste a block straight from Excel”, mounts no grid, and on the path that does work is positional with no header row: a pasted header line became a boat named Variant."
        >
          <div className="pv-stage pv-stage--flush">
            <ImportMapping />
          </div>
          <div className="pv-note">
            <strong>Nothing is silently dropped and nothing is silently assumed.</strong>{' '}
            Types are inferred and shown so they can be refused; “new column” is a
            first-class outcome rather than a failure, because a dealer's spreadsheet has
            columns we have never heard of and that is normal; skipping is explicit; and the
            preview resolves the row label so “a boat named Variant” is visible before it
            exists rather than after.
          </div>
        </Section>

        {/* ---------------- propose ---------------- */}
        <Section
          id="propose"
          title="The first run — propose, don't interrogate"
          blurb="The module plan is proud of three clicks to a working module, and it should be. For the first one it can be one click, because the store already holds everything those three clicks ask: every table, its kind, its hierarchy, its row count, whether it has pictures and whether it has resolvable prices."
        >
          <div className="pv-stage">
            <ProposeModules />
          </div>
          <div className="pv-note">
            <strong>The proposal shows its evidence.</strong> Pictures, prices, a
            three-level hierarchy — so accepting it is an informed click and not a leap, and
            a wrong proposal is arguable rather than mysterious. The escape hatch stays one
            click away, so nothing is taken from the person who wants to choose. This is the
            difference between an empty app that asks you to understand a new concept and
            one that shows you it already understands your business.
          </div>
        </Section>

        {/* ---------------- nav ---------------- */}
        <Section
          id="nav"
          title="Navigation"
          blurb="The outgoing panel did four unrelated jobs in one 240px column on one scrollbar: a primary button, a drag-and-drop palette, three door-cards written as ad copy, and the table inventory. Under modules it does two — where you can stand, and how you set it up."
        >
          <div className="pv-ab">
            <div className="pv-ab-cell">
              <div className="pv-ab-head">
                <span className="pv-tag pv-tag--old">Now</span>
                <span className="pv-ab-note">4 jobs, 1 scrollbar, doors as ad copy</span>
              </div>
              <div className="pv-stage pv-stage--flush">
                <OldPanel />
              </div>
            </div>
            <div className="pv-ab-cell">
              <div className="pv-ab-head">
                <span className="pv-tag pv-tag--new">Redesign</span>
                <span className="pv-ab-note">modules above, set-up below</span>
              </div>
              <div className="pv-stage pv-stage--flush">
                <ModuleNav active="Boats" />
              </div>
            </div>
          </div>
          <div className="pv-note">
            <strong>The table inventory is gone from the top level.</strong> Tables do not live
            inside modules and are not owned by them, but they are also not where a salesperson
            stands — they are what the data model is made of, so they live one click inside it.
            The three door-cards become modules or set-up rows, and the kind palette moves into
            the data model where it is used.
          </div>
        </Section>

        {/* ---------------- capabilities ---------------- */}
        <Section
          id="caps"
          title="Capabilities, and refusal"
          blurb="Ten switches on a module, grown in place by the gear. They are verbs about rows, never nouns about boats, so the same strip reads correctly in a pharmacy. Everything that writes is off by default."
        >
          <div className="pv-stage">
            <div className="caps">
              {CAPS.map((c) => (
                <div className={`cap${c.refused ? ' cap--refused' : ''}`} key={c.verb}>
                  <Switch on={c.on} locked={!!c.refused} />
                  <div className="cap-text">
                    <div className="cap-verb">{c.verb}</div>
                    <div className="cap-note">
                      {c.refused ? (
                        <>
                          <Warning size={12} weight="fill" style={{ verticalAlign: -1 }}/>{' '}
                          {c.refused}
                        </>
                      ) : (
                        c.note
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pv-caption" style={{ marginTop: 'var(--s-8)' }}>
            Bound and unmapped, on the page where the block stands
          </div>
          <div className="pv-stage" style={{ display: 'grid', gap: 'var(--s-3)' }}>
            <div className="blk">
              <div className="blk-head">
                <span className="blk-handle">
                  <DotsSixVertical size={13} />
                </span>
                <span className="blk-kind">Detail</span>
                <span className="blk-name">Capacity</span>
                <span className="badge badge--bound">
                  <Check size={11} /> 5 columns bound
                </span>
              </div>
              <div className="blk-cols">
                {['Max HP', 'Min HP', 'Persons', 'Fuel (L)', 'Max load (kg)'].map((c) => (
                  <span className="ds-chip" key={c}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="blk blk--broken">
              <div className="blk-head">
                <span className="blk-handle">
                  <DotsSixVertical size={13} />
                </span>
                <span className="blk-kind">Price</span>
                <span className="blk-name">Retail</span>
                <span className="badge badge--unmapped">
                  <Warning size={11} weight="fill" /> unmapped
                </span>
              </div>
              <div className="blk-unmapped">{'{Cash Price}'}</div>
              <div className="blk-note">
                This block points at a column that is no longer on Highfield Inflatables. Pick
                another, or remove the block.
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------- the card ---------------- */}
        <Section
          id="card"
          title="Cards on the data-model sheet"
          blurb="The sheet is now one module rather than the app, but it is still where the model is drawn — and its cards conveyed almost nothing: a 140×80 plate with its name in a display serif at 9px and its column bands rendered as an illegible grey smear."
        >
          <div className="pv-ab">
            <div className="pv-ab-cell">
              <div className="pv-ab-head">
                <span className="pv-tag pv-tag--old">Now</span>
                <span className="pv-ab-note">name at 9.5px serif, bands at ~4px</span>
              </div>
              <div
                className="pv-stage"
                style={{ background: '#123252', borderColor: 'transparent' }}
              >
                <div className="pv-row">
                  <OldCard name="Highfield Inflatables" />
                  <OldCard name="Yamaha Outboards" />
                </div>
              </div>
            </div>

            <div className="pv-ab-cell">
              <div className="pv-ab-head">
                <span className="pv-tag pv-tag--new">Redesign</span>
                <span className="pv-ab-note">name at 15px, bands legible, kind rail</span>
              </div>
              <div className="pv-stage pv-stage--dots">
                <div className="pv-row">
                  <TableCard
                    data={{
                      kind: 'boat',
                      kindLabel: 'Boats',
                      name: 'Highfield Inflatables',
                      bands: ['Identity', 'Capacity'],
                      more: 4,
                      rows: 40,
                      cols: 30,
                      rowNoun: 'variants',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pv-caption" style={{ marginTop: 'var(--s-8)' }}>
            States, and the sheet at rest
          </div>
          <div className="pv-stage pv-stage--dots">
            <div className="pv-row">
              <TableCard
                data={{
                  kind: 'boat',
                  kindLabel: 'Boats',
                  name: 'Highfield Inflatables',
                  bands: ['Identity', 'Capacity'],
                  more: 4,
                  rows: 40,
                  cols: 30,
                  rowNoun: 'variants',
                }}
                state="selected"
              />
              <TableCard
                data={{
                  kind: 'motor',
                  kindLabel: 'Motors',
                  name: 'Yamaha Outboards',
                  bands: ['Identity', 'Cost ladder'],
                  more: 3,
                  rows: 43,
                  cols: 27,
                  rowNoun: 'motors',
                }}
              />
              <TableCard
                data={{
                  kind: 'trailer',
                  kindLabel: 'Trailers',
                  name: 'NSM Custom Trailers',
                  bands: ['Identity', 'Pricing'],
                  more: 3,
                  rows: 18,
                  cols: 26,
                  rowNoun: 'trailers',
                }}
              />
              <JoinCard name="Highfield × Yamaha" pair="Boats ↔ Motors" rows={134} />
              <TableCard
                data={{
                  kind: 'accessory',
                  kindLabel: 'Accessories',
                  name: 'Parts & Accessories',
                  bands: ['Identity', 'Pricing'],
                  rows: 26,
                  cols: 16,
                  rowNoun: 'parts',
                }}
                state="dim"
              />
            </div>
          </div>
          <div className="pv-note">
            <strong>The kind rail is the only loud use of kind colour.</strong> Everything else
            on the card is the neutral ramp, so 22 cards read as one drawing rather than a colour
            chart. Relationships are drawn as they behave — dashed, unfilled, named by the two
            things they join, and never offered as a module of their own.
          </div>
        </Section>

        {/* ---------------- the grid ---------------- */}
        <Section
          id="grid"
          title="The grid"
          blurb="The strongest screen in the outgoing build, and mostly kept — it is where data changes, inside the data-model module. Section bands become pills that are never truncated, field-type chips lose their eight colours, and computed columns are the one thing tinted with the accent."
        >
          <div className="pv-stage pv-stage--flush">
            <NewGrid />
          </div>
          <div className="pv-note">
            <strong>Truncation is a bug, not a density strategy.</strong> The outgoing build
            shipped <code className="ds-mono-sm">IDEN… 8</code>,{' '}
            <code className="ds-mono-sm">DIMENS… 6</code> and{' '}
            <code className="ds-mono-sm">CAPA… 5</code> as final. Bands scroll horizontally
            instead.
          </div>
        </Section>

        {/* ---------------- rules ---------------- */}
        <Section
          id="rules"
          title="Rules read as sentences"
          blurb="Rules sit beside modules rather than inside them — they are about the whole organisation's data, not about one place a person stands. The idea was already right; what it lacked was a state anyone could see."
        >
          <div className="pv-stage" style={{ display: 'grid', gap: 'var(--s-4)' }}>
            <RuleCard on />
            <RuleCard on={false} incomplete />
          </div>
        </Section>

        {/* ---------------- the quote ---------------- */}
        <Section
          id="quote"
          title="The quote"
          blurb="The only thing in this product a customer ever sees, and the least designed screen in the outgoing build. It is a document and it prints, so it renders as paper in both themes — which is also why light is now the app's default."
        >
          <div className="pv-stage" style={{ display: 'grid', placeItems: 'center' }}>
            <div className="quote">
              <div className="quote-head">
                <div className="quote-head-main">
                  <div className="quote-org">Northside Marine</div>
                  <h3 className="quote-title">Highfield SP560 (PVC) B-W-B</h3>
                  <div className="quote-sub">Sport · SP560 · prepared for Alex Morgan</div>
                </div>
                <span className="quote-hero" />
                <dl className="quote-ref">
                  <dt>Quote</dt>
                  <dd>20260811-01</dd>
                  <dt>Priced at</dt>
                  <dd>Cash</dd>
                </dl>
              </div>

              <div className="quote-group">
                <div className="quote-group-label">Highfield Inflatables</div>
                <div className="quote-line">
                  <span className="quote-line-name">
                    Highfield SP560 (PVC) B-W-B
                    <small>HBS119 · 5.66 m · PVC</small>
                  </span>
                  <span className="quote-qty">1</span>
                  <span className="quote-amt">41,340</span>
                </div>
              </div>

              <div className="quote-group">
                <div className="quote-group-label">Yamaha Outboards</div>
                <div className="quote-line">
                  <span className="quote-line-name">
                    Yamaha F90 LB
                    <small>90 hp · 25 in shaft</small>
                  </span>
                  <span className="quote-qty">1</span>
                  <span className="quote-amt">13,507</span>
                </div>
              </div>

              <div className="quote-group">
                <div className="quote-group-label">NSM Custom Trailers</div>
                <div className="quote-empty">
                  Nothing from NSM Custom Trailers on this quote yet.
                </div>
              </div>

              <div className="quote-total">
                <span className="quote-total-label">Total</span>
                <span className="quote-total-amt">$54,847</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------- colour ---------------- */}
        <Section
          id="color"
          title="Colour"
          blurb="Light leads. Four ground steps, one accent, and eight kind hues cut to roughly equal luminance so a sheet of mixed tables reads as one drawing. Field-type colour is gone: eight coloured chips became grey, accent and one cool hue."
        >
          <div className="pv-caption">Ground</div>
          <div className="pv-swatches">
            <Swatch name="bg" value="--bg" />
            <Swatch name="bg-canvas" value="--bg-canvas" />
            <Swatch name="surface-1" value="--surface-1" />
            <Swatch name="surface-2" value="--surface-2" />
            <Swatch name="surface-3" value="--surface-3" />
            <Swatch name="surface-4" value="--surface-4" />
          </div>

          <div className="pv-caption" style={{ marginTop: 'var(--s-6)' }}>
            Text, measured on surface-1 — {theme}
          </div>
          <div className="pv-textramp">
            {TEXT_RAMP.map(([label, token, lightRatio, darkRatio]) => (
              <div className="pv-textramp-row" key={token}>
                <span style={{ color: `var(${token})` }}>{label}</span>
                <span className="pv-textramp-token">{token}</span>
                <span className="pv-textramp-ratio">
                  {theme === 'light' ? lightRatio : darkRatio}
                </span>
              </div>
            ))}
          </div>

          <div className="pv-caption" style={{ marginTop: 'var(--s-6)' }}>
            Accent and semantic
          </div>
          <div className="pv-swatches">
            <Swatch name="accent" value="--accent" />
            <Swatch name="success" value="--success" />
            <Swatch name="warning" value="--warning" />
            <Swatch name="danger" value="--danger" />
          </div>

          <div className="pv-caption" style={{ marginTop: 'var(--s-6)' }}>
            Kinds
          </div>
          <div className="pv-swatches">
            {[
              ['Boat', 'boat'],
              ['Motor', 'motor'],
              ['Trailer', 'trailer'],
              ['Accessory', 'accessory'],
              ['Package', 'package'],
              ['Dealer', 'dealer'],
              ['Custom', 'custom'],
              ['Relationship', 'join'],
            ].map(([name, k]) => (
              <Swatch key={k} name={name} value={`--kind-${k}`} ink={`--kind-${k}`} />
            ))}
          </div>
        </Section>

        {/* ---------------- type ---------------- */}
        <Section
          id="type"
          title="Type"
          blurb="Inter for everything a person reads, IBM Plex Mono for every figure. Six steps plus one uppercase label style. Each step is a set — size, weight, leading and tracking travel together, and a rule never takes one without the others."
        >
          <div className="pv-stage">
            {TYPE_STEPS.map(([name, spec, cls]) => (
              <div className="pv-type-row" key={name}>
                <span className="pv-type-name">{name}</span>
                <span className={cls}>
                  {name === 'label' ? 'Cost ladder' : 'Highfield SP560 (PVC) B-W-C'}
                </span>
                <span className="pv-type-spec">{spec}</span>
              </div>
            ))}
            <div className="pv-type-row">
              <span className="pv-type-name">mono</span>
              <span className="ds-mono-lg">41,340.00 · HBS097 · 5.66 m</span>
              <span className="pv-type-spec">15 / 450 / tabular</span>
            </div>
          </div>
          <div className="pv-note">
            <strong>Uppercase appears once.</strong> The outgoing build used 8–11px letterspaced
            uppercase mono for roughly 300 labels, none of which were data. Here it is a single
            style used on section dividers, and figures get the mono face instead.
          </div>
        </Section>

        {/* ---------------- controls ---------------- */}
        <Section
          id="controls"
          title="Controls, depth and geometry"
          blurb="Four button roles, three sizes, one input. On light, elevation is shadow first; on dark it is lightness first, then shadow. Three levels, four radii, a 4px space grid."
        >
          <div className="pv-stage">
            <div className="pv-row" style={{ marginBottom: 'var(--s-5)' }}>
              <button className="ds-btn ds-btn--primary">
                <Plus size={14} /> New module
              </button>
              <button className="ds-btn ds-btn--secondary">Import</button>
              <button className="ds-btn ds-btn--ghost">Cancel</button>
              <button className="ds-btn ds-btn--danger">Delete module</button>
            </div>
            <div className="pv-row" style={{ marginBottom: 'var(--s-5)' }}>
              <button className="ds-btn ds-btn--primary ds-btn--sm">Small</button>
              <button className="ds-btn ds-btn--primary">Medium</button>
              <button className="ds-btn ds-btn--primary ds-btn--lg">Large</button>
            </div>
            <div className="pv-row" style={{ alignItems: 'center' }}>
              <input className="ds-input" style={{ width: 260 }} placeholder="Search rows" />
              <span className="ds-chip">txt</span>
              <span className="ds-chip">num</span>
              <span className="ds-chip">lst</span>
              <span className="ds-chip ds-chip--computed">fx</span>
              <span className="ds-chip ds-chip--linked">ref</span>
              <span className="ds-chip ds-chip--linked">img</span>
            </div>
          </div>

          <div className="pv-elev" style={{ marginTop: 'var(--s-5)' }}>
            {[
              ['surface-1', '--surface-1', 'var(--e1)', 'e1 · resting'],
              ['surface-2', '--surface-2', 'var(--e2)', 'e2 · popover'],
              ['surface-3', '--surface-3', 'var(--e3)', 'e3 · dialog'],
            ].map(([label, bg, shadow, note]) => (
              <div
                className="pv-elev-box"
                key={label}
                style={{ background: `var(${bg})`, boxShadow: shadow }}
              >
                <span>{label}</span>
                <code>{note}</code>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------------- empty ---------------- */}
        <Section
          id="empty"
          title="The empty dashboard"
          blurb="A fresh clone opens on nothing, which is correct and needs to look deliberate. The count is read from the store, and the second action is the way to the data model."
        >
          <div className="pv-stage">
            <div className="empty">
              <div className="empty-mark">
                <Stack size={26} />
              </div>
              <h3>No modules yet</h3>
              <p>
                A module is a place in your business — Boats, Trailers, Quotes. You have{' '}
                <strong style={{ color: 'var(--fg)' }}>21 tables</strong> and no modules.
              </p>
              <div className="empty-actions">
                <button className="ds-btn ds-btn--primary ds-btn--lg">
                  <Plus size={16} /> New module
                </button>
                <button className="ds-btn ds-btn--ghost ds-btn--lg">Open the data model</button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
