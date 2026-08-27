/* ============================================================
   ONE ENTRY IN THE LEDGER — drawn once, used by both screens.

   The diary and one customer's own page are two questions about the
   same records, so a row is the same row on both: the picture, who
   it went to, what it was for, its reference, its day, where it
   stands and its total. Two copies of this markup would be two
   screens that slowly stopped agreeing about what a quote looks
   like — and the fault that never gets noticed is the one where two
   surfaces sum one deal differently.

   EVERY FIGURE HERE IS THE QUOTE'S OWN. `quoteTotals` is the same
   function the document and the print call; nothing on a row is
   read from the sheet.
   ============================================================ */

import { Fragment } from 'react'
import type { ReactElement } from 'react'
import { CaretDown, CaretRight, MagnifyingGlass } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'
import { localDay, money, quoteTotals, type QuoteDef } from '@/features/quote'
import { STANDING_TITLE, standingOf, versionMark, versionsOf, type HistoryIndex, type Standing } from './history'

/* THE WHOLE CLASS, WRITTEN OUT, rather than `hy-state is-${standing}`.
   `tools/check-styles.mjs` reads only the literal segments of a
   className, so an interpolated suffix is invisible to it — and the
   one failure that guard exists to catch is an element that renders
   unstyled. Three strings cost nothing and stay checkable. */
export const STATE_CLASS: Record<Standing, string> = {
  draft: 'hy-state is-draft',
  given: 'hy-state is-given',
  replaced: 'hy-state is-replaced',
}

/* ============================================================
   THE PICTURE, OR AN EMPTY SLOT

   `aria-hidden`, because the row's own button already announces the
   customer and the rig: a picture of the boat beside its name is not
   a second fact.
   ============================================================ */

export function Shot({ quote }: { quote: QuoteDef }): ReactElement {
  const img = quote.subjectImage
  /* the hook runs on every render — it may not be conditional, and
     an empty address is a legitimate thing to ask it about */
  const { paint, probe, at } = useImageDisplay(img?.src ?? '')
  if (!img || !paint) return <span className="hy-shot is-bare" aria-hidden="true" />
  return (
    <span className="hy-shot" aria-hidden="true">
      <img
        className="hy-img"
        /* the frozen value is `img.src` and stays `img.src`; `at` is
           only where the pixels are fetched from — the repository's
           own copy when it holds one, the maker's address when it
           does not */
        src={at}
        alt=""
        width={64}
        height={44}
        loading={probe ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => noteImageLoaded(img.src)}
        onError={() => noteImageFailed(img.src)}
      />
    </span>
  )
}

export interface LedgerRowProps {
  quote: QuoteDef
  index: HistoryIndex
  /** stagger position for `.ds-rise` */
  i: number
  /** the stage already has this one open */
  isOpen?: boolean
  onOpenQuote: (quoteId: string) => void
  /** offered only when the caller has somewhere to send it */
  onOpenCustomer?: (rowId: string) => void
  /** draw the version mark, and let it open the other versions in
   *  place. Off on a customer's own page, where every version of
   *  every quote is already on the screen under its own heading. */
  versions?: boolean
  showingVersions?: boolean
  onToggleVersions?: () => void
}

export function LedgerRow({
  quote,
  index,
  i,
  isOpen = false,
  onOpenQuote,
  onOpenCustomer,
  versions = false,
  showingVersions = false,
  onToggleVersions,
}: LedgerRowProps): ReactElement {
  const totals = quoteTotals(quote)
  const standing = standingOf(index, quote.id)
  const [at, of] = versionMark(index, quote.id)
  const who = quote.customer.name.trim()
  const customerRow = quote.customerRef?.rowId
  const line = versions && of > 1 ? versionsOf(index, quote.id) : []

  return (
    <Fragment>
      <li
        className={`hy-row ds-rise${isOpen ? ' is-open' : ''}`}
        style={{ ['--i' as string]: i }}
      >
        <button
          type="button"
          className="hy-open"
          onClick={() => onOpenQuote(quote.id)}
          aria-label={`${quote.reference}, ${quote.subjectLabel}, ${STANDING_TITLE[standing]}, ${money(totals.total)}`}
        >
          <Shot quote={quote} />
          <span className="hy-said">
            <span className="hy-who">
              {who === '' ? <span className="hy-blank">no customer yet</span> : who}
            </span>
            <span className="hy-what">{quote.subjectLabel}</span>
          </span>
          <span className="hy-ref">{quote.reference}</span>
          <span className="hy-when">{localDay(quote.createdAt)}</span>
          <span className={STATE_CLASS[standing]}>{STANDING_TITLE[standing]}</span>
          <span className="hy-total">{money(totals.total)}</span>
        </button>

        <span className="hy-acts">
          {/* A QUOTE THAT HAS BEEN REISSUED SAYS SO, and the mark
              opens the others in place. Drawn only when there IS more
              than one — "v1/1" on every row is furniture. */}
          {versions && of > 1 && onToggleVersions ? (
            <button
              type="button"
              className="hy-mark"
              aria-expanded={showingVersions}
              onClick={onToggleVersions}
              title={`This conversation has ${of} versions`}
            >
              {showingVersions ? (
                <CaretDown size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              ) : (
                <CaretRight size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              )}
              v{at}/{of}
            </button>
          ) : null}

          {customerRow && onOpenCustomer ? (
            <button
              type="button"
              className="hy-linkbtn"
              onClick={() => onOpenCustomer(customerRow)}
              title="Everything quoted to this customer"
            >
              <MagnifyingGlass size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              Their history
            </button>
          ) : null}
        </span>
      </li>

      {showingVersions && line.length > 1 ? (
        <li className="hy-vers">
          <p className="hy-vers-say">
            {line.length} versions of this quote. Each one is its own document and none of
            them was edited to make another — a new version is a fresh copy, so both still
            print what they printed.
          </p>
          {line.map((v, n) => {
            const vStanding = standingOf(index, v.id)
            return (
              <span className="hy-vers-row" key={v.id}>
                <button
                  type="button"
                  className={`hy-vers-open${v.id === quote.id ? ' is-here' : ''}`}
                  onClick={() => onOpenQuote(v.id)}
                  aria-label={`Version ${n + 1}, ${v.reference}, ${STANDING_TITLE[vStanding]}`}
                >
                  <span className="hy-vers-n">
                    v{n + 1} · {v.reference}
                  </span>
                  <span className="hy-vers-what">{v.subjectLabel}</span>
                  <span className="hy-when">{localDay(v.createdAt)}</span>
                  <span className={STATE_CLASS[vStanding]}>{STANDING_TITLE[vStanding]}</span>
                  <span className="hy-total">{money(quoteTotals(v).total)}</span>
                </button>
              </span>
            )
          })}
        </li>
      ) : null}
    </Fragment>
  )
}
