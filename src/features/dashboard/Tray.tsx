/* ============================================================
   THE TRAY — what is left to put on.

   IT OFFERS ONLY WHAT EXISTS. The cards are the seven this
   build can draw; the fast actions are the seven doors the app
   really has, this dealer's own tables and this dealer's own
   modules. Nothing in here is a suggestion, a template or a
   sample: if a table is not in the project it is not in the
   tray.

   IT SAYS WHAT EACH ONE WOULD GIVE YOU. A tray of names is a
   guessing game — `CardMeta.says` is one line about what
   putting it on gets you, written beside the card itself in
   `cards.ts` so the two cannot drift.

   IT HAS A FILTER BECAUSE THE REAL FILE HAS FIFTY-ONE TABLES.
   A scroll of fifty-one names is the filing cabinet the rail
   already collapses; two letters is faster than reading. The
   filter narrows what is DRAWN and changes nothing about what
   is offered — the same distinction the view page draws
   between a rule and a filter.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { MagnifyingGlass, Plus, X } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import type { CardId, LinkTarget } from './arrangement'
import { CARDS } from './cards'
import { BAND_NAME, type LinkOffer } from './links'
import { LinkMarkGlyph } from './QuickLinks'
import { CardMark } from './CardBody'

const MARK_WEIGHT = weightFor(ICON_SIZE.tiny)

export type TrayKind = 'cards' | 'links'

export interface TrayProps {
  kind: TrayKind
  cardOffers: readonly CardId[]
  linkOffers: readonly LinkOffer[]
  onAddCard: (id: CardId) => void
  onAddLink: (target: LinkTarget, label: string) => void
  onClose: () => void
}

/** Past this many entries the tray draws its filter. Below it,
 *  a field to type into is one more thing to read past. */
const FILTER_AT = 10

export function Tray({
  kind,
  cardOffers,
  linkOffers,
  onAddCard,
  onAddLink,
  onClose,
}: TrayProps): JSX.Element {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()

  const bands = useMemo(() => {
    const kept = needle
      ? linkOffers.filter((o) => o.label.toLowerCase().includes(needle))
      : linkOffers
    const out: Array<{ band: LinkOffer['band']; items: LinkOffer[] }> = []
    for (const o of kept) {
      const last = out[out.length - 1]
      if (last && last.band === o.band) last.items.push(o)
      else out.push({ band: o.band, items: [o] })
    }
    return out
  }, [linkOffers, needle])

  const showFilter = kind === 'links' && linkOffers.length > FILTER_AT

  return (
    <div className="dsh-tray" role="group" aria-label={kind === 'cards' ? 'Cards you can add' : 'Fast actions you can add'}>
      <div className="dsh-tray-head">
        <p className="dsh-tray-name ds-heading">
          {kind === 'cards' ? 'Cards you can add' : 'Fast actions you can add'}
        </p>
        {showFilter ? (
          <label className="dsh-tray-find">
            <MagnifyingGlass size={ICON_SIZE.tiny} weight={MARK_WEIGHT} aria-hidden="true" />
            <input
              className="dsh-tray-input"
              value={q}
              placeholder="Narrow this list"
              aria-label="Narrow this list"
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        ) : null}
        <button type="button" className="dsh-drop" aria-label="Close" onClick={onClose}>
          <X size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
        </button>
      </div>

      {kind === 'cards' ? (
        cardOffers.length === 0 ? (
          <p className="dsh-tray-empty ds-small">
            Every card this build draws is already on your dashboard.
          </p>
        ) : (
          <div className="dsh-tray-items">
            {cardOffers.map((id) => (
              <button
                type="button"
                key={id}
                className="dsh-tray-item"
                onClick={() => onAddCard(id)}
              >
                <span className="dsh-tray-mark" aria-hidden="true">
                  <CardMark id={id} />
                </span>
                <span className="dsh-tray-say">
                  <span className="dsh-tray-item-name ds-small">{CARDS[id].name}</span>
                  <span className="dsh-tray-item-note ds-caption">{CARDS[id].says}</span>
                </span>
                <span className="dsh-tray-plus" aria-hidden="true">
                  <Plus size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                </span>
              </button>
            ))}
          </div>
        )
      ) : bands.length === 0 ? (
        <p className="dsh-tray-empty ds-small">
          {needle
            ? `Nothing here is called “${q.trim()}”.`
            : 'Everything there is to open is already a fast action.'}
        </p>
      ) : (
        <div className="dsh-tray-bands">
          {bands.map((b, i) => (
            <div className="dsh-tray-band" key={`${b.band}-${i}`}>
              <p className="ds-label dsh-tray-band-name">{BAND_NAME[b.band]}</p>
              <div className="dsh-tray-items">
                {b.items.map((o) => (
                  <button
                    type="button"
                    key={`${o.target.kind}:${o.label}`}
                    className="dsh-tray-item"
                    onClick={() => onAddLink(o.target, o.label)}
                  >
                    <span className="dsh-tray-mark" aria-hidden="true">
                      <LinkMarkGlyph mark={o.mark} />
                    </span>
                    <span className="dsh-tray-say">
                      <span className="dsh-tray-item-name ds-small">{o.label}</span>
                    </span>
                    <span className="dsh-tray-plus" aria-hidden="true">
                      <Plus size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
