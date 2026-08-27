/* ============================================================
   WHAT IS NOT IN HERE — drawn, so it reads as a judgement.

   THE FAILURE THIS ANSWERS. Somebody who knows the price file opens
   this app, looks for the service schedule, and finds nothing. There
   is no way for them to tell a decision from a gap, so they guess —
   and either guess costs us: "the import is not finished" makes them
   wait for something that is never coming, and "the app lost it"
   makes them stop trusting what IS here.

   Both are wrong. Each of these was measured and decided, and the
   number that decided it is on the card. That is the difference
   between a judgement and an omission, and it only exists if a person
   can find it.

   SAME DISCIPLINE AS THE WORKBOOK RULE LIST ABOVE IT, one level down.
   That list says what the app does not CHECK. This says what the app
   does not HOLD. Neither is an apology — a system that cannot say
   what it left out is a system asking to be trusted on faith.
   ============================================================ */

import { useMemo } from 'react'
import type { ReactElement } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { CAME_IN, RATE_COMMITMENT, leftOutArtefacts, leftOutSubstantive } from './leftOut'
import { Provenance } from './Provenance'

const VERDICT_WORD: Record<'out' | 'later', string> = {
  out: 'Deliberately left out',
  later: 'Not yet — and here is what it is waiting for',
}

export function LeftOutList(): ReactElement | null {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  /* THE COUNTS ARE READ, NOT TYPED. A "18 labour rates" written into
     this file is right until somebody seeds a nineteenth, and then it
     is a number on screen that nothing will ever correct. */
  const cameIn = useMemo(
    () =>
      CAME_IN.map((r) => {
        const table = Object.values(entities).find(
          (e) => e.name.trim().toLowerCase() === r.tableName.toLowerCase(),
        )
        return { ...r, rows: table ? (rowsByEntity[table.id] ?? []).length : null }
      }),
    [entities, rowsByEntity],
  )

  const records = leftOutSubstantive()
  if (records.length === 0) return null
  const artefacts = leftOutArtefacts()

  return (
    <section className="cn-band" aria-label="What is not in here">
      <p className="cn-band-eyebrow mono-label">Not in here</p>
      <h3 className="cn-band-title">What your price file has that this does not</h3>
      <p className="cn-band-lede">
        Every one of these was read, measured and decided — not missed. Some were decided
        against; some are decided and waiting on somewhere to keep them. The number that
        settled each one is on its card, so you can disagree with the decision rather than
        wonder whether one was made.
      </p>

      {/* WHAT DID COME IN, first, because the ratio is the finding.
          The service module is 30 MB and 45 rows of it are here — the
          price of an hour, the price of a litre, and the price of a
          rego sticker. Everything below is what we left behind. */}
      <ul className="cn-lo-came">
        {cameIn.map((r) => (
          <li key={r.what} className="cn-lo-came-item">
            <span className="cn-lo-came-what">
              {r.what} — <b>{r.tableName}</b>
            </span>
            <span className="cn-lo-came-size">
              {r.rows === null ? 'not on this sheet' : `${r.rows} ${r.rowNoun}`}
            </span>
          </li>
        ))}
      </ul>

      {/* WHY THEY ARE TABLES AND NOT THREE NUMBERS IN OUR CODE. This
          is the one sentence that decided the shape of all three, and
          it earns its place here because the price file has already
          made the other choice 571 times in one column. */}
      <p className="cn-lo-commit">
        <b>{RATE_COMMITMENT.says}</b> Because {RATE_COMMITMENT.because}.
      </p>
      <p className="cn-lo-measured">{RATE_COMMITMENT.measured}</p>
      <Provenance text={RATE_COMMITMENT.source} label="Measured on" />

      <ul className="cn-lo-list">
        {records.map((r) => (
          <li key={r.what} className={`cn-lo-item is-${r.verdict}`}>
            <p className="cn-lo-verdict">
              {VERDICT_WORD[r.verdict]}
              <span className="cn-lo-size">{r.size}</span>
            </p>
            <p className="cn-lo-what">{r.what}</p>
            <p className="cn-lo-why">{r.why}</p>
            <p className="cn-lo-measured">{r.measured}</p>
            {r.reopensWhen ? (
              <p className="cn-lo-reopen">Comes back when {r.reopensWhen}.</p>
            ) : null}
            <Provenance text={r.source} label="Measured on" />
          </li>
        ))}
      </ul>

      {artefacts.length > 0 ? (
        <p className="cn-lo-foot">
          And {artefacts.length} sheets that hold no data of their own — two hidden mirrors
          Excel keeps to feed a dropdown, an emptied copy of a brand sheet, and a costing
          form over a table that is already here. Each one is recorded with its measurement
          in the same place as the rest.
        </p>
      ) : null}
    </section>
  )
}
