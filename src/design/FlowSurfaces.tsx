/* ============================================================
   THE FLOW JOURNEY, redrawn.

   The rule shown is the real one — 'Motor fitment — Highfield',
   src/demos/northside.ts:2390 — said as a sentence instead of
   drawn as a three-plate graph. Its two clauses and its five
   output columns are exactly what the seed declares.
   ============================================================ */

import { useState } from 'react'
import {
  ArrowRight,
  CaretDown,
  CaretRight,
  Check,
  Funnel,
  Star,
  Warning,
  X,
} from '@phosphor-icons/react'

/* ---------- one door -------------------------------------- */

export function OneDoor() {
  const [pick, setPick] = useState<'limit' | 'fit'>('fit')
  return (
    <div className="door">
      <button
        className={`dcard${pick === 'limit' ? ' dcard--on' : ''}`}
        onClick={() => setPick('limit')}
      >
        <div className="dcard-verb">
          <Funnel size={17} />A limit
        </div>
        <div className="dcard-eg">
          “A Highfield’s <b>Motor HP</b> must never be above its <b>Max HP</b>.”
        </div>
        <div className="dcard-makes">Checks every row and tells you which ones break it.</div>
      </button>

      <button
        className={`dcard${pick === 'fit' ? ' dcard--on' : ''}`}
        onClick={() => setPick('fit')}
      >
        <div className="dcard-verb">
          <ArrowRight size={17} />A fit
        </div>
        <div className="dcard-eg">
          “The <b>Yamahas</b> that fit a Highfield are the ones whose <b>HP</b> is between its{' '}
          <b>Min</b> and <b>Max HP</b>.”
        </div>
        <div className="dcard-makes">Works out the pairs, and shows them on the boat.</div>
      </button>
    </div>
  )
}

/* ---------- the sentence, and the live answer -------------- */

function Tok({
  children,
  kind,
}: {
  children: React.ReactNode
  kind?: 'source' | 'match' | 'op'
}) {
  return (
    <button className={`ftok${kind ? ` ftok--${kind}` : ''}`}>
      <span>{children}</span>
      <CaretDown size={11} />
    </button>
  )
}

const OUT_COLS: [string, string][] = [
  ['Boat', 'boat'],
  ['Min HP', 'boat'],
  ['Max HP', 'boat'],
  ['Motor', 'motor'],
  ['HP Rating', 'motor'],
]

const RESULT: [string, string, string][] = [
  ['Highfield SP560 (PVC) W-W-WB', 'Yamaha F90 LB', '90'],
  ['Highfield SP560 (PVC) W-W-WB', 'Yamaha F100 LB', '100'],
  ['Highfield SP560 (PVC) W-W-WB', 'Yamaha F115 LB', '115'],
  ['Highfield SP600 (HYP) B-B-DB', 'Yamaha F115 LB', '115'],
  ['Highfield SP600 (HYP) B-B-DB', 'Yamaha F150 LB', '150'],
]

export function FlowSentence({ broken = false }: { broken?: boolean }) {
  return (
    <div className="flow">
      <div className="fsent">
        <div className="fline">
          For every <Tok kind="source">Highfield Inflatables</Tok> variant,
        </div>
        <div className="fline">
          find the <Tok kind="match">Yamaha Outboards</Tok> where
        </div>

        <div className="fclauses">
          <div className="fclause">
            <Tok kind="match">HP Rating</Tok>
            <Tok kind="op">is at least</Tok>
            <Tok kind="source">Min HP</Tok>
            <button className="fclause-x" aria-label="Remove comparison">
              <X size={13} />
            </button>
          </div>
          <div className="fclause">
            <Tok kind="match">HP Rating</Tok>
            <Tok kind="op">is at most</Tok>
            <Tok kind="source">Max HP</Tok>
            <button className="fclause-x" aria-label="Remove comparison">
              <X size={13} />
            </button>
          </div>
          <button className="fadd">+ add a comparison</button>
        </div>

        <div className="fline">Show</div>
        <div className="fcols">
          {(broken
            ? ([
                ['Series', 'boat'],
                ['Series', 'motor'],
              ] as [string, string][])
            : OUT_COLS
          ).map(([c, k], i) => (
            <span
              className="fcol"
              key={`${c}-${i}`}
              style={{ ['--fcol-ink' as string]: `var(--kind-${k})` }}
            >
              <i />
              {c}
            </span>
          ))}
          <button className="fadd">+ column</button>
        </div>

        <div className="fsent-foot">
          When nothing fits, <Tok>skip the boat</Tok>
        </div>
      </div>

      <div className="fres">
        <div className="fres-top">
          <span className="fres-count">{broken ? '193' : '134'}</span>
          <span className="fres-of">pairs from {broken ? '26 Stacers' : '40 boats'}</span>
          <span className="fres-live">
            <i /> live
          </span>
        </div>

        {broken ? (
          <div className="fwarn">
            <Warning size={15} weight="fill" />
            <div className="fwarn-text">
              <b>Both columns are called Series.</b> Nobody reading this can tell which boat
              or which motor it is about.
              <div className="fwarn-fix">
                <button className="ds-btn ds-btn--secondary ds-btn--sm">
                  Use Model and Motor instead
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <table className="fres-table">
          <thead>
            <tr>
              <th>{broken ? 'Series' : 'Boat'}</th>
              <th>{broken ? 'Series' : 'Motor'}</th>
              {broken ? null : <th>HP</th>}
            </tr>
          </thead>
          <tbody>
            {(broken
              ? ([
                  ['TERRITORY STRIKERS', 'Four Stroke Models', ''],
                  ['TERRITORY STRIKERS', 'Four Stroke Models', ''],
                  ['TERRITORY STRIKERS', 'Four Stroke Models', ''],
                  ['TERRITORY STRIKERS', 'Four Stroke Models', ''],
                  ['TERRITORY STRIKERS', 'Four Stroke Models', ''],
                ] as [string, string, string][])
              : RESULT
            ).map(([a, b, c], i) => (
              <tr key={i}>
                <td>{a}</td>
                <td>{b}</td>
                {broken ? null : <td className="num">{c}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="fres-foot">
          + {broken ? '188' : '129'} more · updates as you change the sentence
        </div>
      </div>
    </div>
  )
}

/* ---------- edited where its answer is shown --------------- */

export function InContextFit() {
  return (
    <div className="inctx">
      <div className="inctx-head">
        <span className="inctx-title">Motors that fit</span>
        <span className="inctx-n">4 of 43 Yamahas</span>
      </div>

      <button className="inctx-why">
        <span>
          Worked out by <b>Motor fitment — Highfield</b>: HP between Min HP and Max HP
        </span>
        <CaretRight size={13} />
      </button>

      <div className="inctx-rows">
        {[
          ['Yamaha F90 LB', '90', '25 in', '13,507', true],
          ['Yamaha F100 LB', '100', '25 in', '14,049', false],
          ['Yamaha F115 LB', '115', '25 in', '14,591', false],
          ['Yamaha F115 XB', '115', '30 in', '14,980', false],
        ].map(([name, hp, shaft, price, starred]) => (
          <div className="inctx-row" key={name as string}>
            <button
              className={`star${starred ? ' star--on' : ''}`}
              aria-label="Recommended"
              title={starred ? 'Recommended — goes on the quote first' : 'Mark as recommended'}
            >
              <Star size={14} weight={starred ? 'fill' : 'regular'} />
            </button>
            <span>{name}</span>
            <span className="num">
              {hp} hp · {shaft}
            </span>
            <span className="num">${price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- what the graph was, at true scale -------------- */

export function OldFlowCanvas() {
  return (
    <div className="oldflow">
      <div className="oldflow-canvas">
        {[
          ['RUN', 'Every Highfield row', 80],
          ['FIT', 'Match Yamaha', 400],
          ['OUT', 'Fitting motors', 720],
        ].map(([tag, label, x]) => (
          <div className="oldplate" key={tag as string} style={{ left: (x as number) * 0.68 }}>
            <div className="oldplate-tag">{tag}</div>
            <div className="oldplate-body">{label}</div>
            {tag === 'FIT' ? (
              <div className="oldplate-clause">
                HP RATING ≥ MIN HP
                <br />
                AND
                <br />
                HP RATING ≤ MAX HP
              </div>
            ) : null}
          </div>
        ))}
        <div className="oldflow-clip">canvas ends — 123 of 190px off-screen</div>
      </div>
    </div>
  )
}

export const FLOW_ICONS = { Check }
