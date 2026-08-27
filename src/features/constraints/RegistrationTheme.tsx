/* ============================================================
   REGISTRATION, DRAWN ONCE — the theme the owner named first.

   > "also note commom themes - for example registration for boat and
   >  trailer"

   `registration.ts` holds the model; this draws it. Four things, in
   the order a person needs them:

     1. WHERE IT LIVES — one fee table, and the two columns that name
        a band on it. Counted from the live project, so a table that
        is missing shows as missing rather than as prose.
     2. WHAT MAY NOT BE DONE — §3.1's four hard requirements, each
        with its reason. Not a style guide: every one of the four is a
        defect the workbook is living with, and three of them are ways
        to overcharge a customer.
     3. WHAT DISAGREES TODAY — the trailers registered in a band their
        own weight contradicts. Shown, never corrected.
     4. WHAT IS NOT CHECKED — the boat half, and why nothing here
        derives it.

   THE DISAGREEMENT LIST IS THE POINT OF THE WHOLE SURFACE, and it is
   the shape SERVICE_AND_THEMES.md §3.1 asked for in one sentence:
   "Offer it as a check that shows the nine and changes none." There is
   no fix button and there will not be one — resolving a row changes a
   price the business is charging today, and seven of the nine are
   undercharging by $117 each.
   ============================================================ */

import { useMemo } from 'react'
import type { ReactElement } from 'react'
import { isRetired } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import {
  REGISTRATION_AS_AT,
  REGISTRATION_POLICY,
  REGISTRATION_TABLE_NAME,
  atmBandDisagreements,
  findFeeRegister,
  registrationKeys,
} from './registration'
import { Provenance } from './Provenance'

export function RegistrationTheme(): ReactElement | null {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  const register = useMemo(
    () => findFeeRegister(entities, rowsByEntity),
    [entities, rowsByEntity],
  )
  const keys = useMemo(() => registrationKeys(entities), [entities])
  const check = useMemo(
    () => atmBandDisagreements(entities, rowsByEntity),
    [entities, rowsByEntity],
  )

  /* LIVE AND HELD BACK, COUNTED SEPARATELY — because a count on this
     panel that disagrees with the count on the sheet is the defect,
     not the retired table. `sellable.ts` states the rule: a surface
     that held something back must SAY so rather than let the reader
     find the difference between two numbers. The obsolete trailer
     table keeps its Rego Type column so an old quote still resolves,
     and it is still TESTED below — this is the surface for the person
     whose job is fixing the data, and the sheet does not filter. */
  const boats = keys.filter((k) => k.subject === 'boat' && !isRetired(k.table))
  const trailers = keys.filter((k) => k.subject === 'trailer' && !isRetired(k.table))
  const heldBack = keys.filter((k) => isRetired(k.table)).length

  /* NOTHING TO SAY IS SAID BY SAYING NOTHING. A project with no fee
     table and no key columns is somebody else's data, not a broken
     import, and a panel about registration on a furniture dealer's
     sheet would be this app talking about itself. */
  if (!register && keys.length === 0) return null

  /* `cn-band` is the whole class list on purpose. A second,
     component-named marker class was here and styled nothing, and
     check-styles is right to call that an orphan: a class in the
     markup that no rule declares is a hook somebody will later assume
     is doing work. The parts that DO differ carry their own `cn-rg-`
     names. */
  return (
    <section className="cn-band" aria-label="Registration">
      <p className="cn-band-eyebrow mono-label">One concept, two subjects</p>
      <h3 className="cn-band-title">Registration is one fee table</h3>
      {/* The eyebrow above already says "One concept, two subjects".
          What differs between the two — length for a boat, weight for a
          trailer — is drawn on the two rows beneath, labelled. */}
      <p className="cn-band-lede">
        One charge, collected for someone else and never marked up.
      </p>

      {/* ---- where it lives, counted from the live project ---- */}
      <ul className="cn-rg-where">
        <li className="cn-rg-where-item">
          <b className="cn-rg-where-n">{register ? register.rows.length : 0}</b>
          <span className="cn-rg-where-what">
            {register ? (
              <>
                fees in <b>{register.table.name}</b> — the schedule dated{' '}
                <b>{REGISTRATION_AS_AT}</b>, which the fee sheet types into a label where
                nothing renews it.
              </>
            ) : (
              <>
                fees. <b>{REGISTRATION_TABLE_NAME}</b> is not on this sheet, so nothing
                below can be priced — only the columns that would name a band are here.
              </>
            )}
          </span>
        </li>
        <li className="cn-rg-where-item">
          <b className="cn-rg-where-n">{boats.length}</b>
          <span className="cn-rg-where-what">
            boat {boats.length === 1 ? 'table names' : 'tables name'} a band, in{' '}
            <b>Boat Registration</b>.
          </span>
        </li>
        <li className="cn-rg-where-item">
          <b className="cn-rg-where-n">{trailers.length}</b>
          <span className="cn-rg-where-what">
            trailer {trailers.length === 1 ? 'table names' : 'tables name'} a band, in{' '}
            <b>Rego Type</b> — the same section, spelled the same way.
            {heldBack > 0 ? (
              <>
                {' '}
                {heldBack === 1 ? 'One more does' : `${heldBack} more do`} too and{' '}
                {heldBack === 1 ? 'is' : 'are'} history rather than stock, so nothing offers{' '}
                {heldBack === 1 ? 'it' : 'them'} and an old quote naming{' '}
                {heldBack === 1 ? 'it' : 'them'} still opens.
              </>
            ) : null}
          </span>
        </li>
      </ul>

      {/* ---- what may not be done, and why ---- */}
      <ul className="cn-rg-policy">
        {REGISTRATION_POLICY.map((r) => (
          <li key={r.rule} className="cn-rg-rule">
            <p className="cn-rg-rule-says">{r.rule}</p>
            <p className="cn-rg-rule-why">Because {r.because}.</p>
            <Provenance text={r.source} />
          </li>
        ))}
      </ul>

      <BandCheckBlock check={check} />
    </section>
  )
}

/* ---------------------------------------------------------- */
/* The check                                                   */
/* ---------------------------------------------------------- */

function BandCheckBlock({
  check,
}: {
  check: ReturnType<typeof atmBandDisagreements>
}): ReactElement {
  const n = check.disagreements.length

  return (
    <div className="cn-rg-check">
      <p className="cn-rg-check-head">
        {check.tested === 0 ? (
          <>
            {/* A CHECK THAT HAS NOT RUN MUST NEVER READ AS ONE THAT
                PASSED — a refusal keeps its sentence. */}
            Nothing here carries both a band and a rated weight. This check has not run.
          </>
        ) : n === 0 ? (
          <>
            All {check.tested} trailers checked sit inside the weight their own band states.
          </>
        ) : (
          <>
            {n} of {check.tested} trailers checked are registered in a band their own rated
            weight contradicts.
          </>
        )}
      </p>

      {n > 0 && (
        <ul className="cn-rg-list">
          {check.disagreements.map((d) => (
            /* A ROW WHOSE OWN BAND CONTRADICTS ITS WEIGHT IS A WARNING,
               and it was drawn in the same grey as everything else on
               the page. `.s-warned` — a --warning rail from ds.css —
               and `.s-held` for one already withheld from anything a
               customer sees, which is a different fact and had the same
               appearance. Nothing is corrected either way. */
            <li
              key={`${d.tableName}:${d.rowLabel}`}
              className={`cn-rg-row ${d.heldBack ? 's-held' : 's-warned'}`}
            >
              <p className="cn-rg-row-name">
                {d.rowLabel}
                <span className="cn-rg-row-table">{d.tableName}</span>
              </p>
              <p className="cn-rg-row-fact">
                Registered <b>{d.band}</b>, {d.says} — rated{' '}
                {d.atmKg.toLocaleString('en-AU')} kg.
                {/* "already held back" is the rail on this row now, and
                    the rail says it on every one of them at once */}
              </p>
              <p className="cn-wb-src">
                {d.source} · read from {d.readFrom}
              </p>
            </li>
          ))}
        </ul>
      )}

      {n > 0 && (
        <p className="cn-rg-note">
          {/* THE BLAST RADIUS, WHICH THE BUDGET KEEPS: this names what
              would happen if the app corrected one, which is why it
              does not. The audit's own tally moved to the rows. */}
          <b>Shown, not corrected.</b> Changing one changes a price the business is charging
          today.
        </p>
      )}

      {/* THE HALF THAT IS NOT CHECKED, said out loud. A check that
          quietly covers one of two subjects reads as a check that
          covers both. */}
      <p className="cn-rg-note cn-rg-note--quiet">
        {/* A REFUSAL, KEPT. A check that quietly covers one of two
            subjects reads as a check that covers both. */}
        The boat half is not checked — nothing has measured a band against a hull length.
        {check.untestableTables.length > 0 && (
          <>
            {' '}
            {check.untestableTables.join(', ')} {check.untestableTables.length === 1 ? 'names' : 'name'}{' '}
            a band but carries no rated weight, so {check.untestableTables.length === 1 ? 'it was' : 'they were'}{' '}
            not tested either.
          </>
        )}
        {check.unrecognisedBands.length > 0 && (
          <>
            {' '}
            And {check.unrecognisedBands.length} band
            {check.unrecognisedBands.length === 1 ? '' : 's'} in use here state no weight
            this app can read — {check.unrecognisedBands.join(', ')} — so rows carrying{' '}
            {check.unrecognisedBands.length === 1 ? 'it' : 'them'} were skipped rather than
            passed.
          </>
        )}
      </p>
    </div>
  )
}
