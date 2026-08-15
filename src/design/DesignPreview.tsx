/* ============================================================
   QUIET PRECISION — the preview page.

   One route, no store, no persistence. It shows the new
   foundations and every component that carries the redesign,
   with the outgoing version beside the three that change most.

   All content is real: the tables, counts, column names and
   figures are Northside Marine's, taken from src/demos.
   ============================================================ */

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowsLeftRight,
  Boat,
  CaretDown,
  Check,
  Engine,
  FileText,
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
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

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

function TableCard({
  data,
  state,
}: {
  data: CardData
  state?: 'selected' | 'dim'
}) {
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
      <div className="oldcard-bands">
        IDENTITY CAPACITY CONSTRUCTION COST BUILD +3
      </div>
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

/* ---------- the panel --------------------------------------- */

const NAV_PRIMARY: { icon: Icon; label: string; count?: string; active?: boolean }[] = [
  { icon: TreeStructure, label: 'Sheet', count: '22', active: true },
  { icon: ListChecks, label: 'Rules', count: '6' },
  { icon: ArrowsLeftRight, label: 'Fitment', count: '5' },
  { icon: FileText, label: 'Quotes', count: '1' },
]

const NAV_TABLES: { group: string; count: string; kind: KindKey | 'join'; items: [string, number][] }[] = [
  {
    group: 'Boats',
    count: '07',
    kind: 'boat',
    items: [
      ['Formosa', 26],
      ['Haines Signature', 9],
      ['Highfield Inflatables', 40],
      ['Jeanneau', 24],
    ],
  },
  {
    group: 'Motors',
    count: '02',
    kind: 'motor',
    items: [
      ['ePropulsion Outboards', 14],
      ['Yamaha Outboards', 43],
    ],
  },
  {
    group: 'Trailers',
    count: '07',
    kind: 'trailer',
    items: [
      ['Dunbier Trailers', 16],
      ['NSM Custom Trailers', 18],
    ],
  },
]

function NewPanel() {
  const [q, setQ] = useState('')
  return (
    <div className="nav">
      <div className="nav-head">
        <div className="nav-head-text">
          <div className="nav-org">Northside Marine</div>
          <div className="nav-industry">Marine · 22 tables · 651 rows</div>
        </div>
        <button className="ds-btn ds-btn--ghost ds-btn--sm" aria-label="Switch project">
          <CaretDown size={14} />
        </button>
      </div>

      <div className="nav-search">
        <div className="nav-search-box">
          <MagnifyingGlass size={14} />
          <input
            className="ds-input"
            placeholder="Search tables and columns"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="nav-group">
        {NAV_PRIMARY.map(({ icon: I, label, count, active }) => (
          <button className={`nav-item${active ? ' nav-item--active' : ''}`} key={label}>
            <I size={16} />
            <span className="nav-item-label">{label}</span>
            <span className="nav-count">{count}</span>
          </button>
        ))}
      </div>

      <div className="nav-scroll">
        {NAV_TABLES.map((g) => (
          <div className="nav-group" key={g.group}>
            <div className="nav-group-label">
              <span>{g.group}</span>
              <span>{g.count}</span>
            </div>
            {g.items.map(([name, n]) => (
              <button className="nav-item" key={name}>
                <span
                  className="nav-dot"
                  style={{ ['--nav-dot' as string]: `var(--kind-${g.kind})` }}
                />
                <span className="nav-item-label">{name}</span>
                <span className="nav-count">{n}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="nav-foot">
        <button className="ds-btn ds-btn--secondary">
          <Plus size={14} /> New table
        </button>
      </div>
    </div>
  )
}

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

function RuleCard({
  on,
  incomplete,
}: {
  on: boolean
  incomplete?: boolean
}) {
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

const TOC = [
  ['color', 'Colour'],
  ['type', 'Type'],
  ['depth', 'Depth'],
  ['controls', 'Controls'],
  ['card', 'The card'],
  ['panel', 'The panel'],
  ['grid', 'The grid'],
  ['rules', 'Rules'],
  ['quote', 'The quote'],
  ['empty', 'Empty'],
]

export function DesignPreview() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
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
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
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
            enough to hold in your head and strict enough to stay consistent.
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
              <dt>Contrast floor</dt>
              <dd>4.5 : 1, measured</dd>
            </div>
          </div>
        </div>

        {/* ---------------- colour ---------------- */}
        <Section
          id="color"
          title="Colour"
          blurb="A near-black cool-neutral ground in four steps, one accent, and eight kind hues cut to roughly equal luminance so a sheet of mixed tables reads as one drawing. Field-type colour is gone: eight coloured chips became grey, accent and one cool hue."
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
            Text, measured on surface-1
          </div>
          <div className="pv-textramp">
            {[
              ['Primary — names, values, anything read', '--fg', '15.9 : 1'],
              ['Secondary — descriptions, help, sentences', '--fg-secondary', '7.5 : 1'],
              ['Tertiary — metadata. The floor.', '--fg-tertiary', '4.8 : 1'],
              ['Quaternary — rules and ticks. No meaning.', '--fg-quaternary', '3.0 : 1'],
            ].map(([label, token, ratio]) => (
              <div className="pv-textramp-row" key={token}>
                <span style={{ color: `var(${token})` }}>{label}</span>
                <span className="pv-textramp-token">{token}</span>
                <span className="pv-textramp-ratio">{ratio}</span>
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

        {/* ---------------- depth ---------------- */}
        <Section
          id="depth"
          title="Depth and geometry"
          blurb="On dark, elevation is lightness first and shadow second. Three levels, four radii, and a 4px space grid."
        >
          <div className="pv-elev">
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
          <div className="pv-row" style={{ marginTop: 'var(--s-5)' }}>
            {[
              ['4px', 'chip'],
              ['6px', 'control'],
              ['10px', 'card'],
              ['14px', 'panel'],
            ].map(([r, use]) => (
              <div
                key={r}
                style={{
                  width: 108,
                  height: 76,
                  borderRadius: r,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  display: 'grid',
                  placeItems: 'center',
                  gap: 2,
                  fontSize: 12,
                }}
              >
                <span className="ds-mono-sm" style={{ color: 'var(--fg-tertiary)' }}>
                  {r}
                </span>
                <span style={{ color: 'var(--fg-secondary)', fontSize: 12 }}>{use}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------------- controls ---------------- */}
        <Section
          id="controls"
          title="Controls"
          blurb="Four button roles, three sizes, one input. Every interactive surface has a hover, a press and a focus ring — the outgoing build had one press rule serving the whole design system."
        >
          <div className="pv-stage">
            <div className="pv-row" style={{ marginBottom: 'var(--s-5)' }}>
              <button className="ds-btn ds-btn--primary">
                <Plus size={14} /> New table
              </button>
              <button className="ds-btn ds-btn--secondary">Import</button>
              <button className="ds-btn ds-btn--ghost">Cancel</button>
              <button className="ds-btn ds-btn--danger">Delete table</button>
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
        </Section>

        {/* ---------------- the card ---------------- */}
        <Section
          id="card"
          title="The card on the sheet"
          blurb="This is the biggest single change. The canvas is the app's primary navigation surface and it conveyed almost nothing: a 140×80 plate with its name in a display serif at 9px and its column bands rendered as an illegible grey smear."
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
              <JoinCard
                name="Highfield × Yamaha"
                pair="Boats ↔ Motors"
                rows={134}
              />
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
            on the card is the neutral ramp, so 22 cards on a sheet read as one drawing rather
            than a colour chart. Relationships are drawn as they behave — dashed, unfilled, and
            named by the two things they join.
          </div>
        </Section>

        {/* ---------------- the panel ---------------- */}
        <Section
          id="panel"
          title="The panel"
          blurb="The outgoing panel did four unrelated jobs in one 240px column on one scrollbar: a primary button, a drag-and-drop palette, three door-cards written as ad copy, and the real table inventory. This one does two — where you are, and what you have."
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
                <span className="pv-ab-note">nav, then inventory, palette in a popover</span>
              </div>
              <div className="pv-stage pv-stage--flush">
                <NewPanel />
              </div>
            </div>
          </div>
          <div className="pv-note">
            <strong>The palette moves behind “New table”.</strong> A table-kind palette is used
            on the day the model is set up and effectively never again; it does not deserve a
            permanent third of the panel. The three door-cards become real nav rows with counts,
            so their state is visible without reading a caption.
          </div>
        </Section>

        {/* ---------------- the grid ---------------- */}
        <Section
          id="grid"
          title="The grid"
          blurb="The strongest screen in the outgoing build, and mostly kept. What changes: section bands become pills that are never truncated, field-type chips lose their eight colours, computed columns are the one thing tinted with the accent, and the row height goes to 40px."
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
          blurb="The idea was already right — every underlined word is a dropdown built from the columns actually on the sheet. What it lacked was a state anyone could see. Tokens now look pressable, values are mono and accented, and a rule that cannot run says so in red rather than sitting blank."
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
          blurb="The only thing in this product a customer ever sees, and the least designed screen in the outgoing build. It is a document, and it prints — so it is rendered as paper in both themes, the way a PDF preview behaves."
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
                <div className="quote-empty">Nothing from NSM Custom Trailers on this quote yet.</div>
              </div>

              <div className="quote-total">
                <span className="quote-total-label">Total</span>
                <span className="quote-total-amt">$54,847</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------- empty ---------------- */}
        <Section
          id="empty"
          title="Empty states"
          blurb="A fresh clone opens on nothing, which is correct and needs to look deliberate."
        >
          <div className="pv-stage pv-stage--dots">
            <div className="empty">
              <div className="empty-mark">
                <TreeStructure size={26} />
              </div>
              <h3>Nothing on the sheet yet</h3>
              <p>
                Draw the tables behind your business — one per brand — or load a worked example
                to see how a finished model is put together.
              </p>
              <div className="empty-actions">
                <button className="ds-btn ds-btn--primary ds-btn--lg">
                  <Plus size={16} /> New table
                </button>
                <button className="ds-btn ds-btn--secondary ds-btn--lg">
                  Load a worked example
                </button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
