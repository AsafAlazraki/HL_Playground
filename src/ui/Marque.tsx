/* ============================================================
   A MARQUE THAT ARRIVES — reactbits Split Text, ported native.

   `docs/research/motion-libraries-remine-2026-09-12.md` §7.4 asks
   for the Showroom marque to take a per-word staggered entrance at
   §6's 30-80ms, and `DESIGN_SYSTEM.md` §2 requires Showroom to have
   a choreographed entrance at all. Until now every rebuilt Showroom
   screen simply painted its heading, which is the register's own
   requirement unmet on seven screens.

   THE WHOLE STRING STAYS ONE READABLE THING. The words are spans
   inside the heading, separated by real spaces, so a screen reader
   reads a sentence — not a column of letters, which is what a
   per-CHARACTER port would have cost. That is also why this splits
   on words and not on glyphs: §4 forbids a cut inside a word, and a
   per-glyph animation is that cut made visible forty times.

   IT ANIMATES ONCE, ON MOUNT, AND NEVER AGAIN. A heading that
   re-runs its entrance when something else on the page changes is
   the app talking about itself. The key is the text, so a NEW
   marque arrives and the same marque re-rendering does not.

   AND IT STOPS WHEN ASKED. `useStillness` is the app's own policy —
   it gates on `prefers-reduced-motion` AND on whether the caret is
   in a text input, which is the good idea `stillness.tsx` already
   had. Still, the words are painted with no animation at all.
   ============================================================ */

import { useMemo } from 'react'
import type { ElementType, ReactElement } from 'react'
import { useStillness } from '@/features/views/stillness'

export interface MarqueProps {
  /** the words. One string — it is a name, not a list. */
  children: string
  /** what element this is. A marque is usually the page's `h1`,
   *  but the configurator's is a `span` inside a lockup. */
  as?: ElementType
  className?: string
}

/** How many words may carry their own delay before the last one
 *  would land past `--d-scene`. At 40ms a word, ten words is 400ms
 *  of stagger on top of a 260ms word — past the 620ms a Showroom
 *  scene change is allowed — so the tail arrives together. */
const WORD_CAP = 8

export function Marque({ children, as, className }: MarqueProps): ReactElement {
  const { still } = useStillness()
  const Tag = (as ?? 'span') as ElementType

  /* SPLIT ONCE PER STRING, not once per render. */
  const words = useMemo(() => children.split(/(\s+)/), [children])

  if (still) {
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <Tag className={className}>
      {words.map((part, i) => {
        /* the separators are kept verbatim and never animated, so
           the spacing of the original string survives exactly */
        if (/^\s+$/.test(part)) return part
        /* WHICH WORD THIS IS, DERIVED rather than counted up in a
           closure. A variable reassigned while rendering is a value
           the renderer cannot see change, and the linter is right
           about it — the same rule that caught the ref in
           `ProductStage`. `split` on a captured separator alternates
           word, gap, word, so a word's own number is half its
           position. */
        const word = i >> 1
        return (
          <span
            key={`${part}-${i}`}
            className="m-split-word"
            style={{ '--i': Math.min(word, WORD_CAP) } as Record<string, number>}
          >
            {part}
          </span>
        )
      })}
    </Tag>
  )
}
