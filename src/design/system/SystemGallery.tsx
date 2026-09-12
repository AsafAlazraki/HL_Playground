/* THE SYSTEM GALLERY.

   Every surface `system.css` draws, in both registers and both
   themes, with every figure read back off the glass rather than
   typed in. See `measure.ts` for why the ruler is shaped the way
   it is.

   The page is deliberately Cockpit: it is a working reference a
   person reads all day, not a thing anybody is sold. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PriceBar } from '@/ui/PriceBar'
import { ProductStage } from '@/ui/ProductStage'
import { Stepper } from '@/ui/Stepper'
import { contrastOf, fmt, renderedPx } from './measure'

type Theme = 'light' | 'dark'
type Register = 'showroom' | 'cockpit'

/* `in` is which registers may REACH the step. Cockpit tops out at
   DISPLAY: a marque or a hero on a screen full of data is the
   billboard-over-fine-print failure the rebuild exists to remove.
   The ratio readout measures only the steps the current register
   can actually use — measuring all ten in Cockpit would report a
   contrast the register is not allowed to draw. */
const TYPE_STEPS = [
  { cls: 't-marque', name: 'marque', in: ['showroom'], use: 'Showroom only. The product name on a stage. One per screen.' },
  { cls: 't-hero', name: 'hero', in: ['showroom'], use: 'Showroom stage titles.' },
  { cls: 't-display', name: 'display', in: ['showroom', 'cockpit'], use: 'Section titles on a Showroom screen; the stage title in Cockpit.' },
  { cls: 't-title', name: 'title', in: ['showroom', 'cockpit'], use: 'Panel headers, dialog titles, Showroom card names.' },
  { cls: 't-subtitle', name: 'subtitle', in: ['showroom', 'cockpit'], use: 'The step that did not exist.' },
  { cls: 't-heading', name: 'heading', in: ['showroom', 'cockpit'], use: 'Row heads, Cockpit card names — the thing you scan for.' },
  { cls: 't-body', name: 'body', in: ['showroom', 'cockpit'], use: 'The default.' },
  { cls: 't-small', name: 'small', in: ['showroom', 'cockpit'], use: 'Secondary text, help.' },
  { cls: 't-caption', name: 'caption', in: ['showroom', 'cockpit'], use: 'Metadata beside what it describes.' },
  { cls: 't-label', name: 'label', in: ['showroom', 'cockpit'], use: 'The one uppercase style. The floor.' },
] as const

const INK = [
  { token: '--fg', name: 'fg', use: 'names, values, anything read' },
  { token: '--fg-secondary', name: 'fg-secondary', use: 'descriptions, help, sentences' },
  { token: '--fg-tertiary', name: 'fg-tertiary', use: 'metadata beside the thing it describes — the floor' },
  { token: '--fg-quaternary', name: 'fg-quaternary', use: 'rules, ticks, aria-hidden marks — may never carry meaning' },
] as const

const KINDS = ['boat', 'motor', 'trailer', 'accessory', 'package', 'dealer', 'custom', 'join'] as const

const SURFACES = ['--bg-sunken', '--bg', '--bg-canvas', '--surface-1', '--surface-2', '--surface-3', '--surface-4'] as const

const ELEVATION = ['--e1', '--e2', '--e3', '--e-card', '--e4', '--e-float', '--e-hero'] as const

export function SystemGallery() {
  const [theme, setTheme] = useState<Theme>('light')
  const [register, setRegister] = useState<Register>('showroom')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="gal" data-register="cockpit">
      <Masthead
        theme={theme}
        onTheme={setTheme}
        register={register}
        onRegister={setRegister}
      />
      <main className="gal-main">
        <TypeSection register={register} />
        <ColourSection />
        <MaterialSection />
        <MotionSection />
        <StepperSection />
        <ShowroomSection />
        <DensitySection />
      </main>
    </div>
  )
}

/* ---------------------------------------------------------- */

function Masthead({
  theme,
  onTheme,
  register,
  onRegister,
}: {
  theme: Theme
  onTheme: (t: Theme) => void
  register: Register
  onRegister: (r: Register) => void
}) {
  return (
    <header className="gal-mast">
      <div className="gal-mast-id">
        <span className="t-heading">Showroom &amp; Cockpit</span>
        <span className="t-caption gal-dim">src/styles/system.css</span>
      </div>
      <div className="gal-mast-controls">
        <Toggle
          label="Register"
          value={register}
          options={[
            ['showroom', 'Showroom'],
            ['cockpit', 'Cockpit'],
          ]}
          onChange={onRegister}
        />
        <Toggle
          label="Theme"
          value={theme}
          options={[
            ['light', 'Light'],
            ['dark', 'Dark'],
          ]}
          onChange={onTheme}
        />
      </div>
    </header>
  )
}

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
}) {
  return (
    <div className="gal-toggle">
      <span className="t-label gal-dim">{label}</span>
      <div className="gal-seg">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            className="gal-seg-btn t-small"
            aria-pressed={v === value}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({
  title,
  says,
  children,
}: {
  title: string
  says: string
  children: React.ReactNode
}) {
  return (
    <section className="gal-sec">
      <div className="gal-sec-head">
        <h2 className="t-subtitle">{title}</h2>
        <p className="t-small gal-dim">{says}</p>
      </div>
      {children}
    </section>
  )
}

/* ---- TYPE -------------------------------------------------- */

function TypeSection({ register }: { register: Register }) {
  const scope = useRef<HTMLDivElement>(null)
  const [sizes, setSizes] = useState<Record<string, number>>({})

  useLayoutEffect(() => {
    const el = scope.current
    if (!el) return
    const read = () => {
      const next: Record<string, number> = {}
      for (const step of TYPE_STEPS) {
        const node = el.querySelector(`[data-step="${step.name}"] .gal-type-spec`)
        if (node) next[step.name] = renderedPx(node)
      }
      setSizes(next)
    }
    read()
    /* The observer is the whole dependency list. Type steps are not
       register-scoped, so a register change cannot move a size — only
       the window can, and that is what this watches. */
    const ro = new ResizeObserver(read)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [])

  const reachable = TYPE_STEPS.filter((s) => (s.in as readonly string[]).includes(register))
  const values = reachable.map((s) => sizes[s.name]).filter(Boolean)
  const largest = values.length ? Math.max(...values) : 0
  const smallest = values.length ? Math.min(...values) : 0
  const contrast = smallest ? largest / smallest : 0

  /* The ramp ratio the whole rebuild is judged on. Showroom wants
     >=6x. Cockpit wants 2.5-3.2x: it tops out at display, so 31/11
     is the ceiling the ramp can physically reach, and a band whose
     top is above that would be a requirement nothing can meet —
     which is exactly the bug this readout caught in its own spec. */
  const want = register === 'showroom' ? '>= 6x' : '2.5x - 3.2x'
  const ok =
    register === 'showroom' ? contrast >= 6 : contrast >= 2.5 && contrast <= 3.2

  return (
    <Section
      title="Type"
      says="Ten steps, and the middle carries the work. Every size below is read off the glass with getComputedStyle, not taken from the stylesheet."
    >
      <div className="gal-ratio" data-ok={ok || undefined}>
        <div>
          <div className="t-label gal-dim">Scale contrast, measured</div>
          <div className="t-figure-lg">{contrast ? `${fmt(contrast)}x` : '—'}</div>
        </div>
        <div>
          <div className="t-label gal-dim">This register wants</div>
          <div className="t-mono-lg">{want}</div>
        </div>
        <div>
          <div className="t-label gal-dim">Largest / smallest</div>
          <div className="t-mono">
            {largest ? `${fmt(largest, 1)}px / ${fmt(smallest, 1)}px` : '—'}
          </div>
        </div>
        <p className="t-small gal-dim gal-ratio-say">
          The old ramp ran 26.88px to 82.86px with nothing between — a 56px
          hole. Eleven of twelve screens measured 2.36x to 3.96x where the spec
          asked for about 7x.
        </p>
      </div>

      <div className="gal-type" ref={scope} data-register={register}>
        {TYPE_STEPS.map((step) => {
          const out = !(step.in as readonly string[]).includes(register)
          return (
          <div
            className="gal-type-row"
            key={step.name}
            data-step={step.name}
            data-out={out || undefined}
          >
            <div className="gal-type-meta">
              <span className="t-label gal-dim">{step.name}</span>
              <span className="t-mono-sm gal-dim">
                {sizes[step.name] ? `${fmt(sizes[step.name], 1)}px` : ''}
              </span>
              {out && <span className="t-mono-sm gal-out">not in {register}</span>}
            </div>
            <div className={`gal-type-spec ${step.cls}`}>Highfield ADV7</div>
            <p className="t-caption gal-dim gal-type-use">{step.use}</p>
          </div>
          )
        })}
      </div>

      <div className="gal-figs">
        <div>
          <span className="t-label gal-dim">figure-xl</span>
          <div className="t-figure-xl">$128,108</div>
        </div>
        <div>
          <span className="t-label gal-dim">figure-lg</span>
          <div className="t-figure-lg">$31,850</div>
        </div>
        <div>
          <span className="t-label gal-dim">figure</span>
          <div className="t-figure">$1,284.50</div>
        </div>
        <p className="t-small gal-dim">
          Mono, tabular. A column of money lines up on the decimal or it is
          wrong. The figure does not count up — a dealer reads it aloud.
        </p>
      </div>
    </Section>
  )
}

/* ---- COLOUR ------------------------------------------------ */

function ColourSection() {
  const scope = useRef<HTMLDivElement>(null)
  const [ratios, setRatios] = useState<Record<string, number | null>>({})

  useLayoutEffect(() => {
    const el = scope.current
    if (!el) return
    const read = () => {
      const next: Record<string, number | null> = {}
      el.querySelectorAll<HTMLElement>('[data-ink]').forEach((node) => {
        next[node.dataset.ink!] = contrastOf(node)
      })
      setRatios(next)
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  return (
    <Section
      title="Colour"
      says="The palette is carried from the old system unchanged — it was measured in a browser and it was right. The ratios below are re-measured live, over the full ancestor chain, with translucent ink composited first."
    >
      <div className="gal-ink" ref={scope}>
        {INK.map((ink) => {
          const r = ratios[ink.name]
          const fails = r !== null && r !== undefined && r < 4.5
          const allowed = ink.token === '--fg-quaternary'
          return (
            <div className="gal-ink-row" key={ink.token}>
              <span
                className="gal-ink-swatch t-heading"
                data-ink={ink.name}
                style={{ color: `var(${ink.token})` }}
              >
                Highfield ADV7 (HYP) B-G-B
              </span>
              <span className="t-mono-sm gal-dim">{ink.token}</span>
              <span
                className="t-mono-sm gal-ratio-chip"
                data-fail={fails && !allowed ? true : undefined}
                data-allowed={fails && allowed ? true : undefined}
              >
                {r ? `${fmt(r)}:1` : '—'}
              </span>
              <span className="t-caption gal-dim">{ink.use}</span>
            </div>
          )
        })}
      </div>

      <div className="gal-grid">
        <div>
          <div className="t-label gal-dim gal-cap">Surfaces</div>
          <div className="gal-swatches">
            {SURFACES.map((s) => (
              <div className="gal-swatch" key={s}>
                <div className="gal-swatch-chip" style={{ background: `var(${s})` }} />
                <span className="t-mono-sm gal-dim">{s.replace('--', '')}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="t-label gal-dim gal-cap">Accent — one primary action per screen</div>
          <div className="gal-swatches">
            {['--accent', '--accent-hover', '--accent-press', '--accent-wash', '--accent-line'].map((s) => (
              <div className="gal-swatch" key={s}>
                <div className="gal-swatch-chip" style={{ background: `var(${s})` }} />
                <span className="t-mono-sm gal-dim">{s.replace('--accent', '') || 'base'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="t-label gal-dim gal-cap">
          Kind is identity — a hue only ever appears on a thing that HAS that kind
        </div>
        <div className="gal-kinds">
          {KINDS.map((k) => (
            <div className="gal-kind k-wash" data-kind={k} key={k}>
              <span className="gal-kind-rail k-rail" />
              <span className="t-heading">{k}</span>
              <span className="k-chip t-label gal-kind-chip">{k}</span>
            </div>
          ))}
        </div>
        <p className="t-small gal-dim">
          A hue may carry a surface. It never sits behind reading text, it is
          never chrome, and a figure is never a hue — a price is not decorative.
        </p>
      </div>
    </Section>
  )
}

/* ---- MATERIAL ---------------------------------------------- */

function MaterialSection() {
  return (
    <Section
      title="Material"
      says="Back on. The old system shipped this vocabulary and then set every blur token to 0px, so components were rejected for being invisible against surfaces it had flattened."
    >
      <div>
        <div className="t-label gal-dim gal-cap">
          Elevation — on light the shadow lifts, on dark the surface step does
        </div>
        <div className="gal-elevs">
          {ELEVATION.map((e) => (
            <div className="gal-elev" key={e} style={{ boxShadow: `var(${e})` }}>
              <span className="t-mono-sm gal-dim">{e.replace('--', '')}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="t-label gal-dim gal-cap">
          Glass — bigger surfaces read as thicker. That is the only reason there
          is more than one rung.
        </div>
        <div className="gal-glass-stage">
          <div className="gal-glass-bed" />
          {(
            [
              ['chip', 'var(--mat-chip-blur)'],
              ['panel', 'var(--mat-panel-blur)'],
              ['sheet', 'var(--mat-sheet-blur)'],
            ] as const
          ).map(([name, blur]) => (
            <div
              className="gal-glass"
              key={name}
              style={{
                backdropFilter: `blur(${blur}) saturate(var(--glass-sat))`,
                WebkitBackdropFilter: `blur(${blur}) saturate(var(--glass-sat))`,
              }}
            >
              <span className="t-heading">{name}</span>
              <span className="t-mono-sm gal-dim">mat-{name}-blur</span>
            </div>
          ))}
        </div>
        <p className="t-small gal-dim">
          Never stack one translucent surface on another — legibility collapses.
          A popover over a sheet takes an opaque surface.
        </p>
      </div>
    </Section>
  )
}

/* ---- MOTION ------------------------------------------------ */

const CURVES = [
  ['--ease-out', 'cubic-bezier(0.23, 1, 0.32, 1)', 'UI arrivals. The default.'],
  ['--ease-in-out', 'cubic-bezier(0.77, 0, 0.175, 1)', 'On-screen movement, both ends.'],
  ['--ease-drawer', 'cubic-bezier(0.32, 0.72, 0, 1)', 'Drawers and sheets.'],
] as const

function MotionSection() {
  const [run, setRun] = useState(0)

  return (
    <Section
      title="Motion"
      says="Never invent a curve or a duration. Keyboard-initiated actions do not animate — that is a disqualifier, not a judgement call."
    >
      <button
        type="button"
        className="gal-btn t-small"
        onClick={() => setRun((n) => n + 1)}
      >
        Run them
      </button>

      <div className="gal-curves">
        {CURVES.map(([token, value, use]) => (
          <div className="gal-curve" key={token}>
            <div className="gal-curve-track">
              <span
                className="gal-curve-dot"
                key={run}
                style={{ animationTimingFunction: `var(${token})` }}
              />
            </div>
            <span className="t-mono-sm">{token.replace('--', '')}</span>
            <span className="t-mono-sm gal-dim">{value}</span>
            <span className="t-caption gal-dim">{use}</span>
          </div>
        ))}
      </div>

      <div className="gal-grid">
        <div>
          <div className="t-label gal-dim gal-cap">Durations</div>
          <table className="gal-table">
            <tbody>
              {(
                [
                  ['press feedback', '--d-press'],
                  ['tooltip, small popover', '--d-fast'],
                  ['dropdown, select', '--d-med'],
                  ['modal, drawer', '--d-slow'],
                  ['sheet', '--d-sheet'],
                  ['Showroom scene', '--d-scene'],
                  ['every exit', '--d-exit'],
                ] as const
              ).map(([what, token]) => (
                <tr key={token}>
                  <td className="t-small">{what}</td>
                  <td className="t-mono-sm gal-dim">{token.replace('--', '')}</td>
                  <td className="t-mono-sm gal-num">
                    <Computed token={token} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="t-label gal-dim gal-cap">
            Stagger — 40ms, one frame at 24fps
          </div>
          <div className="gal-stagger" key={run}>
            {Array.from({ length: 7 }, (_, i) => (
              <span
                className="gal-stagger-bar"
                key={i}
                style={{ animationDelay: `calc(var(--stagger) * ${i})` }}
              />
            ))}
          </div>
          <p className="t-small gal-dim">
            Everything entering at once is the failure this replaces. Exit is
            faster than enter, and nothing here runs on a keyboard action.
          </p>
        </div>
      </div>
    </Section>
  )
}

/* Reads a custom property off a REAL element, not off the root.
   `--row-h` is declared on `[data-register]` and resolving it
   against `document.documentElement` returns empty — which is the
   same class of mistake as a reference page that imports a
   different stylesheet than the app. */
function Computed({ token }: { token: string }) {
  const [value, setValue] = useState('')
  /* IT READS ITS OWN COMPUTED STYLE, and that is the whole trick.
     Custom properties inherit, so a span sitting inside
     `[data-register="cockpit"]` resolves `--row-h` to the Cockpit
     value without being handed a ref to the pane — and the same
     component inside the durations table resolves `--d-med` off the
     root. The first draft took a `RefObject` and reached for
     `.current` inside a `useCallback`, which React Compiler cannot
     preserve; the cascade already knew the answer.

     A callback ref rather than an effect: a layout effect that sets
     state synchronously is a cascading render. */
  return (
    <span
      ref={(node) => {
        if (node) setValue(getComputedStyle(node).getPropertyValue(token).trim())
      }}
    >
      {value || '—'}
    </span>
  )
}

/* ---- STEPPER ----------------------------------------------- */

/* The real seven stages, with the real answers from the SP560 walk
   in the production app's own evidence trail
   (`tasks/test-evidence/ffr33-sp560-proof/`). Plausible content
   rather than lorem: a rail full of "Step one" tells you nothing
   about whether two lines of a boat name fit. */
const BUILD_STEPS = [
  { id: 'hull', name: 'The hull', chose: 'Sport SP560 — Light Grey / White' },
  { id: 'options', name: 'Factory options', chose: 'Fabric T Top, Stern Shade' },
  { id: 'motor', name: 'Motor', chose: 'Yamaha F90XB' },
  { id: 'trailer', name: 'Trailer', chose: 'REDCO TA600-MOB' },
  { id: 'dealer', name: 'Dealer fit', chose: '3 items' },
  { id: 'admin', name: 'Administration' },
  {
    id: 'summary',
    name: 'Summary',
    refusedBecause: 'Nothing is addressed yet. Name a customer on Administration first.',
  },
] as const

function StepperSection() {
  const [at, setAt] = useState('motor')
  const done = ['hull', 'options']

  return (
    <Section
      title="Stepper"
      says="Where you are in a build, and how to get back. PHASE_TWO specified no step rail at all; DESIGN_SYSTEM §9.6 reverses that for this screen, because the evidence against progress indicators is about linear web forms a stranger fills in once."
    >
      <div className="gal-stage" data-register="showroom">
        <Stepper
          steps={BUILD_STEPS}
          currentId={at}
          doneIds={done}
          onGo={setAt}
          label="Build steps"
        />
      </div>
      <p className="t-small gal-dim gal-note">
        Press an answered step — the indicator travels rather than
        re-appearing, which is what says your press did that. The original's
        rail is display-only: to change the hull colour from the Summary you
        press Back six times. The last step refuses with a sentence rather
        than greying out, because dimming is what you do when you have given
        up on explaining.
      </p>
    </Section>
  )
}

/* ---- SHOWROOM: the stage and the bar ------------------------ */

/* REAL SEEDED PHOTOGRAPHY, not a grey box. `public/seed-images`
   holds 220 of them and the point of the stage is that a boat is
   on it — a placeholder would prove the layout and hide the thing
   the layout is for. */
const PICTURES = [
  {
    src: '/seed-images/formosa-grt-tiller-1-1024x539-05202db9.webp',
    alt: 'Formosa GRT tiller-steer, on the water',
    says: 'GRT 425 — Tiller',
  },
  {
    src: '/seed-images/formosa-srt-centre-console-2-12b25b52.webp',
    alt: 'Formosa SRT centre console, starboard quarter',
    says: 'SRT 495 — Side Console',
  },
  {
    src: '/seed-images/formosa-centre-cabin-1-4b56a989.webp',
    alt: 'Formosa centre cabin, bow on',
    says: 'SRT 635 — Territory',
  },
]

const LEVELS = [
  { key: 'cash', label: 'Cash' },
  { key: 'trade', label: 'Trade' },
]

function ShowroomSection() {
  const [pic, setPic] = useState(0)
  const [level, setLevel] = useState('cash')
  const [extras, setExtras] = useState(0)

  /* A real arithmetic rather than a random number, so the delta on
     the bar is a figure somebody could check: the SP560 walk in the
     production evidence trail totals $103,731 inc GST. */
  const base = level === 'cash' ? 103_731 : 97_420
  const total = base + extras * 2_720

  return (
    <Section
      title="Showroom — the stage and the bar"
      says="The two surfaces a customer actually looks at. The stage is a requirement of the register, not a nicety: §2 says the thing being sold is present, large and photographic — the build before the rebuild drew the hull at 264×176 in a white card."
    >
      <div className="gal-showroom" data-register="showroom">
        <ProductStage
          pictures={PICTURES}
          index={pic}
          onIndex={setPic}
          overlay={
            <span className="k-chip t-label gal-stage-chip" data-kind="boat">
              Boat
            </span>
          }
        />

        <div className="gal-showroom-side">
          <p className="t-label gal-dim">Highfield</p>
          <p className="t-marque gal-marque">ADV7</p>
          <p className="t-small gal-dim gal-note">
            Press the arrows — the render crossfades at 260ms, opacity only,
            and only when the picture actually changed. It is deliberately not
            the blur-and-scale materialize §5 asks of a glass surface: this is
            the same boat in another colour, seen dozens of times a minute.
          </p>
          <div className="gal-showroom-acts">
            <button
              type="button"
              className="gal-btn t-small"
              onClick={() => setExtras((n) => n + 1)}
            >
              Add an option
            </button>
            <button
              type="button"
              className="gal-btn t-small"
              data-quiet="true"
              onClick={() => setExtras((n) => Math.max(0, n - 1))}
            >
              Take one off
            </button>
          </div>
        </div>
      </div>

      <div className="gal-bar">
        <PriceBar
          total={total}
          caption="Package pricing"
          tax={{ rate: 0.1, label: 'GST', included: true }}
          notPriced={extras > 2 ? 1 : 0}
          levels={LEVELS}
          levelKey={level}
          onLevel={setLevel}
          action={
            <button type="button" className="gal-btn t-small">
              Give it to the customer
            </button>
          }
          actionNote="This quote is addressed to nobody."
        />
      </div>

      <p className="t-small gal-dim gal-note">
        The figure does not count up — a dealer reads it aloud to somebody
        standing beside them. The delta appears and fades. Add three options
        and the bar reports a line it cannot price: null is a real state, and
        a total that treats it as zero is wrong by exactly the amount nobody
        noticed.
      </p>
    </Section>
  )
}

/* ---- DENSITY ----------------------------------------------- */

const ROWS = [
  ['01', 'Formosa — GRT 425 (Tiller)', 'GRT 425 TIL', '4.25', '32,940'],
  ['02', 'Formosa — GRT 455 (Tiller)', 'GRT 455 TIL', '4.55', '35,120'],
  ['03', 'Formosa — SRT 495 (Side Console)', 'SRT 495 SC', '4.95', '41,880'],
  ['04', 'Formosa — SRT 525 (Side Console)', 'SRT 525 SC', '5.25', '46,300'],
  ['05', 'Formosa — SRT 565 (Side Console)', 'SRT 565 SC', '5.65', '52,740'],
  ['06', 'Formosa — SRT 595 (Side Console)', 'SRT 595 SC', '5.95', '58,190'],
  ['07', 'Formosa — SRT 635 (Territory)', 'SRT 635 TR', '6.35', '64,510'],
  ['08', 'Formosa — SRT 665 (Territory)', 'SRT 665 TR', '6.65', '71,240'],
] as const

function DensitySection() {
  return (
    <Section
      title="Density"
      says="The same eight rows in both registers. Cockpit must show at least 18 at 1280x800; the build before the rebuild showed twelve."
    >
      <div className="gal-grid">
        <DensityPane register="cockpit" />
        <DensityPane register="showroom" />
      </div>
    </Section>
  )
}

function DensityPane({ register }: { register: Register }) {
  const pane = useRef<HTMLDivElement>(null)
  const [fits, setFits] = useState<number | null>(null)

  /* HOW MANY ROWS FIT IN A 1280x800 STAGE, computed rather than
     asserted. DESIGN_SYSTEM.md §2 requires 18 for Cockpit, and the
     build before the rebuild showed twelve. A requirement nothing
     measures is a requirement nothing keeps. */
  useLayoutEffect(() => {
    const el = pane.current
    if (!el) return
    const row = el.querySelector('.gal-row')
    if (!row) return
    /* Observed rather than re-run on `register`, because the thing
       that actually moves is the row's height — and observing it
       catches a token change, a font swap and a window resize alike,
       where a dependency on `register` catches only the first. */
    const read = () => {
      const h = row.getBoundingClientRect().height
      const stage = 800 - 44 - 40 - 56 /* masthead, foot, table head */
      setFits(h ? Math.floor(stage / h) : null)
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(row)
    return () => ro.disconnect()
  }, [])

  const short = register === 'cockpit' && fits !== null && fits < 18

  return (
    <div ref={pane} data-register={register} className="gal-dens">
      <div className="t-label gal-dim gal-cap">{register}</div>
      <div className="gal-rows">
        {ROWS.map(([n, name, code, len, price]) => (
          <div className="gal-row" key={n} data-press="row">
            <span className="t-mono-sm gal-dim">{n}</span>
            <span className="t-body gal-row-name">{name}</span>
            <span className="t-mono-sm gal-dim">{code}</span>
            <span className="t-mono gal-num">{len}</span>
            <span className="t-mono gal-num">{price}</span>
          </div>
        ))}
      </div>
      <p className="t-caption gal-dim">
        row-h <Computed token="--row-h" /> ·{' '}
        <span className="gal-fits" data-short={short || undefined}>
          {fits ?? '—'} rows in a 1280&times;800 stage
          {register === 'cockpit' ? ' (needs 18)' : ''}
        </span>
      </p>
    </div>
  )
}
