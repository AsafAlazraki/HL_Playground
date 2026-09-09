/* ============================================================
   THE TRAY — what is left to put on.

   IT OFFERS ONLY WHAT EXISTS. The cards are the ones this
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
   is offered.

   IT IS DRAWN BY THE PRIMITIVES. The tray is a raised <Card>;
   its caption is a <SectionHead> with the Close Button as its
   action; the filter is a <Field> with a real label rather than
   a placeholder standing in for one; every offer is an
   activating <Row> — the mark leads, the name is the thing
   scanned for, the one-line reason is its meta. The trailing
   plus the old rows carried is gone: a Row that activates takes
   no trail, and the caption above already says what pressing
   does. dashboard.css keeps only the spaces between these.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { X } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { Button, Card, Field, Row, SectionHead } from '@/ui'
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
  const title = kind === 'cards' ? 'Cards you can add' : 'Fast actions you can add'

  return (
    <div className="dsh-tray" role="group" aria-label={title}>
      <Card tone="raised" pad="md">
        <SectionHead
          level="h3"
          rule
          action={
            <Button tone="ghost" size="sm" aria-label="Close" onClick={onClose}>
              <X size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
            </Button>
          }
        >
          {title}
        </SectionHead>

        {showFilter ? (
          <div className="dsh-tray-find">
            <Field type="search" label="Narrow this list" value={q} onChange={setQ} />
          </div>
        ) : null}

        <div className="dsh-tray-body">
          {kind === 'cards' ? (
            cardOffers.length === 0 ? (
              <p className="dsh-tray-empty ds-small">
                Every card this build draws is already on your dashboard.
              </p>
            ) : (
              <div className="dsh-tray-items">
                {cardOffers.map((id) => (
                  <Row
                    key={id}
                    onActivate={() => onAddCard(id)}
                    lead={
                      <span aria-hidden="true">
                        <CardMark id={id} />
                      </span>
                    }
                    name={CARDS[id].name}
                    meta={CARDS[id].says}
                  />
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
                  <SectionHead level="h4">{BAND_NAME[b.band]}</SectionHead>
                  <div className="dsh-tray-items">
                    {b.items.map((o) => (
                      <Row
                        key={`${o.target.kind}:${o.label}`}
                        onActivate={() => onAddLink(o.target, o.label)}
                        lead={
                          <span aria-hidden="true">
                            <LinkMarkGlyph mark={o.mark} />
                          </span>
                        }
                        name={o.label}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
