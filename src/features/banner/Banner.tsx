/* ============================================================
   THE BANNER — decoration, drawn rather than photographed.

   WHY IT EXISTS. Every stage in this app opened on an eyebrow, a
   title, a paragraph and then a grid. That is why it reads as an
   admin panel however good the type is: there is nothing to look
   at, anywhere, and no surface that says "this is a place" before
   it says what is in it.

   WHY IT IS NOT A PHOTOGRAPH. Scattering product shots across
   every header is not decoration, it is wallpaper — the pictures
   stop meaning anything the moment they are everywhere, and a
   photograph belongs where it is the SUBJECT: the catalogue, the
   configurator's hull, a card for one boat. A banner is chrome,
   and chrome is drawn.

   WHAT IT IS INSTEAD. Three layers, all generated:

     1. A MESH — two soft radial fields in the kind's own hue,
        offset so the band has a light source rather than a
        direction. This is where the colour finally lives.
     2. A MOTIF — a geometric line field. Marine without being
        literal: no wheels, no rope, no portholes. The three
        available are `sound` (depth-sounding contours, which is
        what a chart of water actually looks like), `plate`
        (diagonal hull plating) and `grid` (a survey field).
        All are hairlines at 4-7% and read as texture, not
        drawing.
     3. GRAIN — the tile already in ds.css, because a 1600px
        gradient bands without it.

   THE KIND HUE DRIVES ALL THREE, so a Boats banner and a Trailers
   banner are recognisably different places, and two Boats banners
   anywhere in the app are the same place. That is the discipline
   the colour amendment asks for: the hue is identity, not
   decoration — and the decoration is how the identity is spent.
   ============================================================ */

import type { JSX, ReactNode } from 'react'

export type BannerMotif = 'sound' | 'plate' | 'grid' | 'none'

export interface BannerProps {
  /** the eyebrow — a label, so it takes the one uppercase style */
  eyebrow?: string
  /** the name. The display face, never below its 26px floor. */
  title: string
  /** ONE line. A banner carrying a paragraph is a brochure. */
  say?: string
  /** which kind this is. Drives the mesh, the motif and the rail. */
  kind?: string
  /** the geometric field. Defaults to the sounding contours. */
  motif?: BannerMotif
  /** the brand's own mark, where a module has one. Not a product
   *  photograph — a logo is identity and belongs on chrome. */
  logo?: { at: string; alt: string } | null
  /** counted facts. Figures only, never a sentence, never a hue. */
  facts?: { label: string; value: string }[]
  /** the acts that belong to this thing */
  children?: ReactNode
  /** shorter, for a screen that is mostly content beneath it */
  tight?: boolean
}

export function Banner({
  eyebrow,
  title,
  say,
  kind,
  motif = 'sound',
  logo,
  facts,
  children,
  tight,
}: BannerProps): JSX.Element {
  return (
    <header
      className={`bn${tight ? ' bn--tight' : ''}`}
      {...(kind ? { 'data-kind': kind } : {})}
    >
      {/* the three drawn layers, in order. All decorative, so all
          hidden from the accessibility tree. */}
      <span className="bn-mesh" aria-hidden="true" />
      {motif !== 'none' ? (
        <span className={`bn-motif bn-motif--${motif}`} aria-hidden="true" />
      ) : null}
      <span className="bn-grain ds-grain" aria-hidden="true" />

      <div className="bn-say">
        {logo ? (
          <span className="bn-logo">
            <img src={logo.at} alt={logo.alt} loading="eager" decoding="async" />
          </span>
        ) : null}

        <div className="bn-words">
          {eyebrow ? <span className="mono-label bn-eyebrow">{eyebrow}</span> : null}
          <h1 className="ds-display-lg bn-title">{title}</h1>
          {say ? <p className="bn-line">{say}</p> : null}
        </div>

        {facts && facts.length > 0 ? (
          <dl className="bn-facts">
            {facts.map((f) => (
              <div className="bn-fact" key={f.label}>
                {/* the figure leads and the word sits under it —
                    the order somebody scanning actually uses */}
                <dd className="bn-fact-fig">{f.value}</dd>
                <dt className="bn-fact-lab">{f.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}

        {children ? <div className="bn-acts">{children}</div> : null}
      </div>
    </header>
  )
}
