/* ============================================================
   THE THREE PANELS A MODULE GREW — Dashboard, Quotes and Pricing.

   These are not new capabilities. Every figure and every sentence
   below was already computed by a reader in `read.ts`, `access.ts`
   or `moduleRules.ts`, and every one of them was drawn as part of
   a six-strip band stacked on top of the catalogue. The band is
   gone; the readers are the same ones; each answer now stands in
   the room it is about.

     DASHBOARD  what is in this place, counted, with its
                photography — plus the other places in its module,
                what goes with these, and what may be done here.
     QUOTES     every quote raised from here. The overview band
                named four and said "and N more are in Quotes";
                this is the N.
     PRICING    the columns that price it, the levels those columns
                are rungs of, and the rules that govern them.

   NOTHING IS INVENTED IN ANY OF THEM. A place that prices nothing
   says so; a place nobody has quoted from says so; a rule nobody
   wrote does not appear.
   ============================================================ */

import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { type EntityDef, type ModuleDef } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import { coverPhoto } from '@/features/table/coverPhoto'
import { localDay, priceLevelsFor, useQuotes } from '@/features/quote'
import {
  listedTables,
  moduleCensus,
  moduleTables,
  priceReadOf,
  relatedTables,
} from './read'
import { capabilityStates } from './designer'
import { useModuleConfiguresRules } from './ruleCapability'
import { ModuleRulesPanel } from './ModuleRulesPanel'
import './modules.css'

const grouped = (n: number): string => n.toLocaleString('en-AU')

/* ============================================================
   DASHBOARD — what is in this place
   ============================================================ */

export interface ModuleHomeProps {
  /** the module narrowed to the place being stood at */
  module: ModuleDef
  /** the module itself, for the places beside this one */
  owner: ModuleDef
  place: string | undefined
  onOpen: (tableId: string, rowId: string) => void
  onOpenQuote?: ((quoteId: string) => void) | undefined
  /** stand at another of the module's places, without leaving it */
  onPlace: (tableId: string) => void
  /** the door into the stock, which is where the photography leads */
  onStock: () => void
}

export function ModuleHome({
  module,
  owner,
  place,
  onPlace,
  onStock,
}: ModuleHomeProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const quotes = useQuotes()

  const listed = useMemo(() => listedTables(module, entities), [module, entities])
  const census = useMemo(
    () => moduleCensus(module, entities, rowsByEntity),
    [module, entities, rowsByEntity],
  )
  const master = listed[0]
  const cover = useMemo(
    () => (master ? coverPhoto(master, rowsByEntity[master.id]) : null),
    [master, rowsByEntity],
  )

  /* WHAT IS REACHABLE FROM HERE through a join somebody declared. */
  const related = useMemo(() => relatedTables(module, entities), [module, entities])

  /* THE VERBS THAT ARE ON, in the contract's own order — the same
     reader the designer strip uses, so the two cannot disagree. */
  const configures = useModuleConfiguresRules(owner.id)
  const verbs = useMemo(
    () =>
      capabilityStates(module, moduleTables(module, entities), configures)
        .filter((s) => s.on)
        .map((s) => s.label),
    [module, entities, configures],
  )

  /* HOW MANY QUOTES CAME OUT OF HERE. A set membership on the quote's
     own `rootTableId`, never a guess — and exactly zero on a freshly
     loaded sheet, which is the honest answer. */
  const mine = useMemo(() => new Set(listed.map((t) => t.id)), [listed])
  const raised = useMemo(
    () => quotes.filter((q) => mine.has(q.rootTableId)).length,
    [quotes, mine],
  )

  /* THE PLACES BESIDE THIS ONE. Only where the module holds more than
     one table, because a module that is one place has none. */
  const siblings = useMemo(
    () =>
      owner.tableIds.length > 1
        ? owner.tableIds
            .map((id) => entities[id])
            .filter((e): e is EntityDef => e !== undefined)
        : [],
    [owner, entities],
  )

  /* THE FIGURES THIS PLACE CAN STATE ABOUT ITSELF, and each one only
     where it is true of something. A zero is a cell of chrome. */
  const cells: { term: string; figure: number }[] = []
  if (census.pictured > 0) cells.push({ term: 'photographed', figure: census.pictured })
  if (census.priced > 0) cells.push({ term: 'priced', figure: census.priced })
  if (census.held > 0) cells.push({ term: 'held back', figure: census.held })
  if (raised > 0) cells.push({ term: raised === 1 ? 'quote raised' : 'quotes raised', figure: raised })
  for (const b of census.branches) cells.push({ term: b.noun, figure: b.count })

  return (
    <div className="md-home">
      {/* THE PHOTOGRAPHY. 220 real photographs ship with this app and
          the largest any of them had ever been drawn was a card
          header. This is one of this place's own, at the size the
          seed was shot at, and it is a DOOR — into the stock, which
          is what it is a photograph of.

          NOTHING IS SUBSTITUTED. `coverPhoto` refuses every address
          the repository does not ship a copy of, so a place without
          one gets its kind's own mark on its own wash and never a
          stand-in for a boat nobody photographed. */}
      <button
        type="button"
        /* A PLACE WITH NO PHOTOGRAPH GETS A SHORTER PLATE. 534 of
           Highfield's 588 rows carry a picture and not one of them is
           an address this repository ships a copy of, so `coverPhoto`
           refuses them all — correctly. A 320px empty box would be a
           broken screen; a 120px band with the kind's own mark is the
           honest drawing of "we hold no picture of this". */
        className={`md-home-plate${cover ? '' : ' md-home-plate--none'}`}
        onClick={onStock}
      >
        {cover ? (
          <img
            className="md-home-shot"
            src={cover.at}
            alt={cover.alt}
            width={cover.w}
            height={cover.h}
            loading="eager"
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="md-home-plate-mark">
            <TableKindSymbol kind={kindOf(master?.kind)} size={ICON_SIZE.large} />
          </span>
        )}
        {/* THE DOOR NAMES ITS DESTINATION. The count is in the
            header, once — printing it again here would be one fact
            twice on one screen. */}
        <span className="md-home-plate-say">
          <span className="md-home-plate-word">Catalog</span>
          <CaretRight size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
        </span>
      </button>

      {cells.length > 0 ? (
        <dl className="md-home-figs">
          {cells.map((c) => (
            <div className="md-home-fig" key={c.term}>
              <dd>{grouped(c.figure)}</dd>
              <dt>{c.term}</dt>
            </div>
          ))}
        </dl>
      ) : null}

      {siblings.length > 1 ? (
        <section className="md-home-strip">
          <h3 className="mono-label md-home-cap">Also in {owner.name}</h3>
          <ul className="md-home-chips">
            {siblings.map((t) => {
              const here = t.id === (place ?? master?.id)
              return (
                <li key={t.id}>
                  {/* EVERY SIBLING IS A DOOR, including the one you
                      are standing in — pressing it changes nothing,
                      which is honest, and a chip that stopped being
                      pressable at the moment it became current would
                      be a control that moves under the pointer. */}
                  <button
                    type="button"
                    className={`md-home-chip${here ? ' is-here' : ''}`}
                    data-kind={kindOf(t.kind)}
                    aria-current={here ? 'true' : undefined}
                    onClick={() => onPlace(t.id)}
                  >
                    <TableKindSymbol kind={kindOf(t.kind)} size={ICON_SIZE.tiny} />
                    {t.name}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="md-home-strip">
          <h3 className="mono-label md-home-cap">What goes with these</h3>
          <ul className="md-home-links">
            {related.map((r) => (
              <li className="md-home-link" key={r.tableId}>
                <TableKindSymbol kind={kindOf(r.kind)} size={ICON_SIZE.tiny} />
                <span className="md-home-link-name">{r.name}</span>
                {/* THE SHARE, NOT A TICK. "on 3 of 7" is the fact a
                    person can act on. */}
                <span className="md-home-link-share">
                  on {r.on} of {r.of}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {verbs.length > 0 ? (
        <section className="md-home-strip">
          <h3 className="mono-label md-home-cap">What you can do here</h3>
          <p className="md-home-verbs">{verbs.join(' · ')}</p>
        </section>
      ) : null}
    </div>
  )
}

/* ============================================================
   QUOTES — every one raised from here
   ============================================================ */

export interface ModuleQuotesProps {
  module: ModuleDef
  owner: ModuleDef
  onOpenQuote?: ((quoteId: string) => void) | undefined
}

export function ModuleQuotes({ module, owner, onOpenQuote }: ModuleQuotesProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const quotes = useQuotes()

  /* EVERY member table counts, including a retired one: its rows are
     withheld from the catalogue because they are history rather than
     stock, but a quote raised against one still happened and still
     opens. */
  const mine = useMemo(
    () => new Set(moduleTables(module, entities).map((t) => t.id)),
    [module, entities],
  )

  /* NEWEST FIRST, BY WHEN IT WAS RAISED. `createdAt`, which is the
     column the quotes list already prints — sorting by one date and
     printing another puts an old day at the top of a list that
     claims to be recent. */
  const raised = useMemo(
    () =>
      quotes
        .filter((q) => mine.has(q.rootTableId))
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [quotes, mine],
  )

  if (raised.length === 0) {
    /* AN EMPTY STATE KEEPS ITS SENTENCE. Nothing has been raised
       here, which is a true and useful answer on a freshly loaded
       sheet — and it arrives the moment somebody quotes a boat. */
    return (
      <p className="md-none">
        No quote has been raised from {module.name} yet. One appears here the moment a
        quote is started from an item in it.
      </p>
    )
  }

  return (
    <ul className="md-qs">
      {raised.map((q) => {
        const body = (
          <>
            {/* THE SUBJECT AS THE QUOTE FROZE IT. Never re-read from
                the sheet: a quote prints what it froze, and a boat
                renamed since is still the boat this was written for. */}
            <span className="md-q-what">{q.subjectLabel}</span>
            <span className="md-q-state mono-label">
              {q.state === 'issued' ? 'Given' : 'Draft'}
            </span>
            {/* MONO BECAUSE THEY ARE FIGURES, and not `mono-label`,
                because a reference and a date are values a person
                reads back to somebody on the phone. */}
            <span className="md-q-ref">{q.reference}</span>
            <span className="md-q-when">{localDay(q.createdAt)}</span>
          </>
        )
        return (
          <li key={q.id}>
            {onOpenQuote ? (
              <button
                type="button"
                className="md-q"
                aria-label={`Open the quote for ${q.subjectLabel}, ${q.reference}`}
                onClick={() => onOpenQuote(q.id)}
              >
                {body}
              </button>
            ) : (
              /* A FACT THAT CANNOT BE OPENED IS BETTER THAN A CONTROL
                 THAT DOES NOTHING — the same shape the item rows take
                 when this place cannot open one. */
              <div className="md-q is-flat">{body}</div>
            )}
          </li>
        )
      })}
      <li className="md-qs-owner">
        <span className="mono-label">
          {raised.length} raised from {owner.name}
        </span>
      </li>
    </ul>
  )
}

/* ============================================================
   PRICING — the columns, the levels, the rules
   ============================================================ */

export interface ModulePricingProps {
  module: ModuleDef
  tables: EntityDef[]
}

export function ModulePricing({ module, tables }: ModulePricingProps): ReactElement {
  /* WHAT PRICES EACH TABLE, read through the two resolvers that own
     the question — `priceLevelsFor` for the ladder the table
     declares, `priceReadOf` for the one rung a catalogue face may
     print. Both refuse a cost column by construction; neither is
     re-implemented here, because a second opinion about which
     column is a price is how a dealer's buy price reaches a screen
     a customer can read over a shoulder. */
  const read = useMemo(
    () =>
      tables.map((t) => ({
        table: t,
        levels: priceLevelsFor(t),
        face: priceReadOf(t),
      })),
    [tables],
  )

  return (
    <div className="md-price">
      {read.map(({ table, levels, face }) => (
        <section className="md-price-one" key={table.id} data-kind={kindOf(table.kind)}>
          <h3 className="md-price-name">
            <TableKindSymbol kind={kindOf(table.kind)} size={ICON_SIZE.tiny} />
            {table.name}
          </h3>

          {levels.length === 0 ? (
            /* A THING THAT CANNOT BE DONE SAYS WHY, WHERE IT IS. */
            <p className="md-price-none">
              No column on {table.name} is marked as a price, so nothing here can be
              quoted. Mark one in Settings.
            </p>
          ) : (
            <ul className="md-price-levels">
              {levels.map((l) => {
                const column = table.fields.find((f) => f.id === l.fieldId)
                return (
                  <li className="md-price-level" key={l.key}>
                    <span className="md-price-level-name">{l.label}</span>
                    {/* THE COLUMN IT IS, in the business's own words,
                        so a number can always be traced back. */}
                    <span className="md-price-col">{column?.name ?? l.fieldId}</span>
                    <span className="md-price-scope mono-label">
                      {l.scope === 'quote' ? 'whole quote' : 'per line'}
                    </span>
                    {face && face.field.id === l.fieldId ? (
                      <span className="k-chip md-price-shown">On the face</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ))}

      {/* THE RULES THAT GOVERN IT — the same panel the designer
          mounts, so there is one drawing of a module's rules and not
          two that can drift. */}
      <ModuleRulesPanel module={module} tables={tables} />
    </div>
  )
}
