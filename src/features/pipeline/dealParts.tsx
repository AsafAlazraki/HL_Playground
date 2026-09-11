/* ============================================================
   THE DEAL, IN PIECES — drawn twice, written once.

   A deal is now looked at in two places: a POPUP over the board,
   which is a glance, and a PAGE, which is the file. They hold the
   same seven things — the subject and its photograph, the
   specification, the money, the stage, the customer, the thread,
   and what is attached — and they differ in exactly one respect:
   how much of each they show.

   So the pieces live here and take a `limit`. The alternative was
   two components drawing one deal, and that is the shape where a
   fact gets fixed in the popup and stays wrong on the page for six
   months. `DealOverview.tsx` and `DealPage.tsx` are containers:
   between them they contribute a header, a scrim and a layout, and
   not one sentence about a quote.

   NOTHING HERE OWNS A STORE. Every piece takes what it draws and a
   handful of callbacks, so the page and the popup can both be
   mounted at once — which they are not, but a piece that reads a
   store on its own would make that a bug rather than a choice.
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import {
  ArrowSquareOut,
  LinkSimple,
  Paperclip,
  Trash,
} from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { money } from '@/lib/money'
import { Button, Card, Field, Row, SectionHead } from '@/ui'
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'
import { whenSay } from '@/features/activity'
import { sizeSay } from '@/features/modules'
import { Picker, type PickerOption } from '@/features/picker'
import { quoteTotals } from '@/features/quote'
import type { QuoteDef } from '@/types/model'
import type { RoleDef } from '@/types/model'
import { handoverSay, roleWord, NOBODY, type Handover } from './owners'
import { notesFor, type NoteBag } from './dealNotes'
import { linksFor, type DealLink, type LinkBag } from './dealLinks'
import { isPicture, type DealFile } from './dealFiles'
import { lockDemand } from './stageTrigger'
import type { StageDef } from './stageStore'

/** A stamp, or nothing — never "Invalid Date". Every date drawn
 *  here is a stored ISO string and a document written by an older
 *  build can carry one this build cannot parse. */
export function stamp(iso: string | undefined): string {
  if (!iso) return ''
  const at = Date.parse(iso)
  return Number.isNaN(at) ? '' : whenSay(at)
}

/** HOW LONG SOMETHING HAS BEEN STANDING WHERE IT IS, in the
 *  shortest true form. Days, because a pipeline is read in days —
 *  "4 hours" on a board is noise and "0 days" is a lie about a deal
 *  that arrived this morning. */
export function waitedSay(from: number, now = Date.now()): string {
  const days = Math.floor((now - from) / 86_400_000)
  if (days <= 0) return 'since today'
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  const weeks = Math.floor(days / 7)
  if (weeks < 9) return weeks === 1 ? '1 week' : `${weeks} weeks`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month' : `${months} months`
}

/* ============================================================
   THE FACTS
   ============================================================ */

/** WHOSE DEAL IT IS, AND THE ONE ACT THAT CHANGES IT. Passed in
 *  whole rather than assembled here, because this file owns no
 *  store — `useDealDesk` reads the roles and the handovers and
 *  hands them down, so the popup and the page cannot disagree
 *  about who a deal is with. See `owners.ts` for why an owner
 *  names a JOB and why that is not `preparedBy`. */
export interface DealOwnerAsk {
  /** the role id it is with, or `NOBODY` */
  at: string
  /** every job the dealership has written down */
  roles: readonly RoleDef[]
  /** the last handover, for the line under the control. Undefined
   *  when nobody has ever been given this deal. */
  last: Handover | undefined
  /** why nobody can be given it, or null (rule 10) */
  why: string | null
  onAssign: (roleId: string) => void
}

/** The rows the picker offers: nobody first, then the dealership's
 *  jobs in the order they were handed in.
 *
 *  "NOBODY" IS A ROW AND NOT AN ABSENCE. Taking a deal back off
 *  somebody is a thing a sales manager does on purpose, and a
 *  dropdown that can only ever assign is a control you cannot
 *  reverse without inventing a spare job to park deals on. */
function ownerRows(roles: readonly RoleDef[]): PickerOption<string>[] {
  return [
    { id: NOBODY, label: 'Nobody' },
    ...roles.map((r) => ({
      id: r.id,
      label: r.name,
      /* THE DEALER'S OWN LINE ABOUT THE JOB, where they wrote one.
         Never generated: `RoleDef.description` is "who this is, in
         the owner's words" and an invented one would be this app
         explaining a business to itself. */
      ...(r.description && r.description.trim() !== ''
        ? { under: r.description.trim() }
        : {}),
    })),
  ]
}

export interface DealFactsProps {
  quote: QuoteDef
  stage: StageDef | undefined
  /** epoch ms this deal arrived where it is, or null when nothing
   *  honest can be said — see `arrivedAt` in `stages.ts` */
  arrived: number | null
  /** how many specs to print. Undefined prints all of them. */
  specLimit?: number
  /** whose deal it is. Optional so a surface that draws these
   *  facts without the act — there is none today — cannot be made
   *  to grow one by accident. */
  owner?: DealOwnerAsk
}

export function DealFacts({
  quote,
  stage,
  arrived,
  specLimit,
  owner,
}: DealFactsProps): JSX.Element {
  const totals = quoteTotals(quote)
  const specs =
    specLimit === undefined ? quote.subjectSpecs : quote.subjectSpecs.slice(0, specLimit)
  const moreSpecs = quote.subjectSpecs.length - specs.length
  /* WHAT THE COLUMN THIS DEAL IS STANDING IN ASKS OF IT, or null
     when it asks nothing. Computed here rather than passed in
     because both containers would have to compute the same thing
     from the same two arguments — see `stageTrigger.ts`, which is
     pure and reads no store. */
  const demand = lockDemand(stage, quote)

  return (
    <>
      <dl className="dp-facts">
        {stage ? (
          <div className="dp-fact">
            <dt className="dp-fact-say">Stage</dt>
            <dd className="dp-fact-is">
              <span className="dp-stage" data-tone={stage.tone}>
                {stage.name}
              </span>
              {/* HOW LONG IT HAS BEEN THERE, beside the column it is
                  in rather than as a row of its own: the two are one
                  fact, and splitting them puts "Negotiating" three
                  lines above "11 days". */}
              {arrived === null ? null : (
                <span className="dp-stage-for">{waitedSay(arrived)}</span>
              )}
              {/* WHAT THE COLUMN ASKED FOR AND HAS NOT GOT — the
                  refusal, on the second line of the row it is about,
                  which is where CONFIGURATOR_PLAYBOOK §5 puts one:
                  never a tooltip, never a modal, never the top of
                  the page. It belongs to the STAGE row rather than
                  the Document row below it because it is the stage
                  that is asking; the document is the thing being
                  asked about, and it already says which it is.

                  IT OFFERS NO BUTTON. Both surfaces that draw these
                  facts already carry "Open the quote" in their own
                  foot, so the sentence names that door instead of
                  growing a second control for one act. */}
              {demand ? (
                <p className="dp-demand" role="status">
                  <span className="dp-demand-word">{demand.word}</span>
                  {` — ${demand.say} ${demand.next}`}
                  {demand.why.length > 0 ? (
                    <span className="dp-demand-whys">
                      {demand.why.map((w) => (
                        <span className="dp-demand-why" key={w}>
                          {w}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </dd>
          </div>
        ) : null}
        {/* THE DOCUMENT, WHICH IS NOT THE STAGE. `stages.ts` exists
            to keep the two apart and until this was drawn the
            distinction lived only in a comment: a person looking at
            a card in Won had no way to see that the document under
            it is still a draft. */}
        <div className="dp-fact">
          <dt className="dp-fact-say">Document</dt>
          <dd className="dp-fact-is">
            {quote.state === 'issued'
              ? `Issued${stamp(quote.issuedAt) ? ` ${stamp(quote.issuedAt)}` : ''}`
              : 'Draft'}
          </dd>
        </div>
        <div className="dp-fact">
          <dt className="dp-fact-say">Total</dt>
          <dd className="dp-fact-is ds-mono">
            {money(totals.total)}
            {/* A QUOTE WITH AN UNPRICED LINE DOES NOT PRINT A
                CONFIDENT TOTAL — the document says so out loud and so
                does the dashboard, so this does too. */}
            {totals.unpricedCount > 0 ? (
              <span className="dp-partial">
                {totals.unpricedCount === 1
                  ? '1 line unpriced'
                  : `${totals.unpricedCount} lines unpriced`}
              </span>
            ) : null}
          </dd>
        </div>
        {/* WHO IT IS FOR, and how to reach them. Drawn from the
            FROZEN customer block, never resolved through
            `customerRef` — see `types.ts`: every word on a document
            comes from a frozen field, and this pane must not be the
            one surface that quietly re-reads the register. */}
        {quote.customer.contact && quote.customer.contact.length > 0 ? (
          <div className="dp-fact">
            <dt className="dp-fact-say">Contact</dt>
            <dd className="dp-fact-is">{quote.customer.contact.join(' · ')}</dd>
          </div>
        ) : null}
        {/* WHOSE DEAL IT IS NOW — and it sits directly above "Prepared
            by" on purpose. The two are the app's only two rows about
            people and they are not the same fact: the one below is a
            name frozen onto the document the customer received and it
            never changes; this one is where the deal sits today.
            Drawn apart, in different halves of the pane, a person
            would read whichever they found first as "whose it is".

            THE ONLY CONTROL IN THIS GRID, and it earns the exception:
            the fact and the act are one thing here, and a "Reassign"
            button somewhere else on the pane would be a second place
            to look for an answer this row is already giving. */}
        {owner ? (
          <div className="dp-fact dp-own">
            <dt className="dp-fact-say">Owner</dt>
            <dd className="dp-fact-is">
              <Picker
                /* THE `dt` IS THE LABEL, so the picker draws none.
                   Passing "Owner" here put the word in the markup
                   TWICE — once in the `dt` and once in the control —
                   and hiding the second in CSS would leave a
                   duplicate that comes back the day the rule is
                   deleted. A rendering test found it; see
                   `owners.test.tsx`.

                   THE ACCESSIBLE NAME THEREFORE HAS TO CARRY BOTH
                   halves itself: with no label span to point at,
                   `aria-labelledby` would name the control by its
                   value alone — "Yard manager", with nothing saying
                   what that is the answer to. */
                label=""
                ariaLabel={`Owner — ${roleWord(owner.at, owner.roles)}`}
                value={owner.at}
                options={ownerRows(owner.roles)}
                onPick={owner.onAssign}
                /* INERT, NOT ABSENT — picker.css's own words for
                   this exact case. A business that has written down
                   no jobs keeps the row and the control, dimmed,
                   rather than having the Owner row appear out of
                   nowhere the day somebody adds a role. A control
                   that vanishes has to be re-found. */
                {...(owner.why ? { disabledWhy: owner.why } : {})}
              />
              {/* AND THE REASON IS VISIBLE, not only in the `title`
                  the picker puts it in. Rule 10 says a thing that
                  cannot be done says why WHERE it is, and this
                  file's own `.dp-demand` cites the playbook's
                  "never a tooltip" for the sentence four rows up.
                  The duplication is the picker's contract, not a
                  second opinion: both strings are this one. */}
              {owner.why ? <p className="dp-own-why">{owner.why}</p> : null}
              {/* WHO CHANGED IT AND WHEN — never WHAT it changed to,
                  which the control right above it is already saying.
                  "Last changed" rather than "given" because the same
                  line has to be true of a deal taken back off
                  somebody. */}
              {owner.last ? (
                <span className="dp-own-when">
                  {owner.last.who
                    ? `Last changed by ${owner.last.who}, ${whenSay(owner.last.at)}`
                    : `Last changed ${whenSay(owner.last.at)}`}
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {quote.preparedBy ? (
          <div className="dp-fact">
            <dt className="dp-fact-say">Prepared by</dt>
            <dd className="dp-fact-is">{quote.preparedBy}</dd>
          </div>
        ) : null}
        {stamp(quote.updatedAt) ? (
          <div className="dp-fact">
            <dt className="dp-fact-say">Last touched</dt>
            <dd className="dp-fact-is">{stamp(quote.updatedAt)}</dd>
          </div>
        ) : null}
        {/* THE UNIT IS NOT DECIDED HERE, AND MUST NOT BE. `s.value`
            is frozen text — `freezeSpecs` in quote/freeze.ts:236 has
            already split "Tube Dia. cm" with `splitUnit`
            (views/columns.ts:37) and printed "36 cm". Where a spec
            prints bare — measured on the seed: Highfield "OA Length
            2.3" and "Beam 1.37", Surtees "Hull Length 4.95",
            Stabicraft "Int. Beam 1.35", Jeanneau "Draft 1.03" — the
            SEEDED COLUMN NAME carries no unit (demos/northside.ts:21181),
            because tools/seed reads the unit out of the cell TEXT and
            Boat!G holds a bare number (tools/seed/gen_lib.py:110-112).
            The 'm' on TABLE_KINDS.boat (types/model.ts:299) belongs to a
            table `createTable` builds, not to this one. Appending it
            here would be a unit this app invented for a figure a
            customer is read out loud, and reaching back to the register
            for one is what the Contact row above refuses. The fix is in
            the generator. */}
        {specs.map((s) => (
          <div className="dp-fact" key={s.label}>
            <dt className="dp-fact-say">{s.label}</dt>
            <dd className="dp-fact-is">{s.value}</dd>
          </div>
        ))}
      </dl>
      {moreSpecs > 0 ? (
        <p className="dp-more">
          {moreSpecs === 1
            ? '1 more spec is on the quote.'
            : `${moreSpecs} more specs are on the quote.`}
        </p>
      ) : null}
    </>
  )
}

/* ============================================================
   THE PHOTOGRAPH

   NOTHING IS DRAWN WHERE THERE IS NO PICTURE — no placeholder, no
   frame, no hatched rectangle, no filename. `photo.tsx` argues
   this for the printed document and the rule is the same on a
   screen a customer can see over your shoulder: a broken glyph on
   a quotation is worse than no photograph.

   THE VERDICT IS NOT TAKEN HERE. Whether an address may be painted
   at all is decided once per HOST in `@/lib/imageSources` and
   shared with the table cell, the view page and the quote — so a
   picture that failed once is never asked for again, and this pane
   is not the surface that starts asking a second time.
   ============================================================ */

export function DealPhoto({ quote }: { quote: QuoteDef }): JSX.Element | null {
  const img = quote.subjectImage
  /* the hook must run on every render, so the early return for
     "there is no picture" happens after it, not before */
  const { paint, probe, at } = useImageDisplay(img?.src ?? '')
  if (!img || !paint) return null
  return (
    <div className="dp-photo">
      <img
        className="dp-photo-img"
        /* `at` is where the pixels come from — the repository's own
           copy when it holds one, the maker's address when it does
           not. The frozen value on the quote stays `img.src`. */
        src={at}
        alt={img.alt && img.alt.trim() !== '' ? img.alt.trim() : quote.subjectLabel}
        loading={probe ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => noteImageLoaded(img.src)}
        onError={() => noteImageFailed(img.src)}
      />
    </div>
  )
}

/* ============================================================
   THE CONVERSATION
   ============================================================ */

export interface DealThreadProps {
  quote: QuoteDef
  notes: NoteBag
  /** the newest N, with the rest counted. Undefined draws all. */
  limit?: number
  /** what was typed, held by the container so the popup and the
   *  page never argue about a half-written sentence */
  text: string
  onText: (v: string) => void
  /** the refusal for THIS box, or null. Rule 10: printed under the
   *  box rather than greying the button. */
  why: string | null
  /** a browser that refused to store the last note */
  unkept: boolean
  onAdd: () => void
}

export function DealThread({
  quote,
  notes,
  limit,
  text,
  onText,
  why,
  unkept,
  onAdd,
}: DealThreadProps): JSX.Element {
  const all = notesFor(notes, quote.id)
  const shown = limit === undefined ? all : all.slice(Math.max(0, all.length - limit))
  const older = all.length - shown.length

  return (
    <section className="dp-thread-part" aria-label={`Notes on ${quote.reference}`}>
      <SectionHead>Notes</SectionHead>
      {all.length === 0 ? (
        /* A FACT, NOT AN INSTRUCTION. The box below is the
           instruction and it is right there. */
        <p className="dp-none">Nothing said about this deal yet.</p>
      ) : (
        <>
          {older > 0 ? (
            <p className="dp-older">
              {older === 1
                ? '1 earlier note is on the whole record.'
                : `${older} earlier notes are on the whole record.`}
            </p>
          ) : null}
          <ol className="dp-thread">
            {shown.map((n) => (
              <li key={n.id}>
                {/* A NOTE IS A CARD INSIDE A CARD, so it is the flat
                    tone — card.css: "for a card inside another card,
                    where a second shadow is noise". */}
                <Card tone="flat" pad="sm">
                  <p className="dp-note-top">
                    {/* NO NAME IS DRAWN WHERE THERE IS NO NAME. A note
                        written with nobody signed in still has a time,
                        and "System" would be an invention. */}
                    {n.who ? <span className="dp-note-who">{n.who}</span> : null}
                    <span className="dp-note-when ds-mono">{whenSay(n.at)}</span>
                  </p>
                  <p className="dp-note-text">{n.text}</p>
                </Card>
              </li>
            ))}
          </ol>
        </>
      )}

      {unkept ? (
        /* THE ONE THING `stages.ts` SWALLOWS AND THIS MUST NOT. A
           lost stage override is a card back where the document says
           it goes; a lost note is a person's words gone with no
           trace. */
        <p className="dp-warn" role="status">
          This browser refused to store that note — it is here for now, and will not be here
          after a refresh.
        </p>
      ) : null}

      <form
        className="dp-say"
        onSubmit={(e) => {
          e.preventDefault()
          onAdd()
        }}
      >
        <textarea
          className="dp-say-in"
          value={text}
          rows={2}
          placeholder="What happened?"
          aria-label={`Add a note to ${quote.reference}`}
          onChange={(e) => onText(e.target.value)}
          /* ENTER MAKES A NEW LINE AND ⌘/CTRL-ENTER ADDS. A note is
             prose — "rang him Tuesday, he wants the T-top, ringing
             back Friday" wants a second line — and a box where Enter
             sends is a box that loses the second sentence. */
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              onAdd()
            }
          }}
        />
        {why ? (
          <p className="dp-why" role="alert">
            {why}
          </p>
        ) : null}
        <div className="dp-say-foot">
          <span className="dp-say-hint">Ctrl + Enter</span>
          {/* THE PANE'S ONE PRIMARY ACT. Never refused: pressing it
              with an empty box prints the reason under the box
              (rule 10), which is why there is no `refusedBecause`
              here. */}
          <Button tone="primary" type="submit">
            Add note
          </Button>
        </div>
      </form>
    </section>
  )
}

/* ============================================================
   THE HANDOVERS — who has had this deal, in order.

   THE OTHER HALF OF THE OWNER ROW. That row answers "whose is it";
   this answers "whose has it been", which is the question a sales
   manager asks when a deal has been sitting for a month. Both read
   the one store — `owners.ts` keeps the trail AS the state and
   derives the current owner from its last entry, so these two can
   never disagree.

   NOTHING IS DRAWN ON A DEAL NOBODY HAS HANDED ON. A section
   headed "Handovers" saying "none yet" on every card in the
   business is a heading that costs a line and reports nothing —
   and the Owner row above already says "Nobody". Same rule the
   note badge on the card keeps.
   ============================================================ */

export interface DealHandoversProps {
  quote: QuoteDef
  trail: readonly Handover[]
  roles: readonly RoleDef[]
  /** the newest N, with the rest counted. Undefined draws all —
   *  the popup is a glance and the record is the file, exactly as
   *  the thread above is limited. */
  limit?: number
}

export function DealHandovers({
  quote,
  trail,
  roles,
  limit,
}: DealHandoversProps): JSX.Element | null {
  if (trail.length === 0) return null
  const shown = limit === undefined ? trail : trail.slice(Math.max(0, trail.length - limit))
  const older = trail.length - shown.length

  return (
    <section className="dp-part" aria-label={`Handovers on ${quote.reference}`}>
      <SectionHead>Handovers</SectionHead>
      {older > 0 ? (
        <p className="dp-older">
          {older === 1
            ? '1 earlier handover is on the whole record.'
            : `${older} earlier handovers are on the whole record.`}
        </p>
      ) : null}
      {/* OLDEST FIRST, so the list ends where the Owner row starts.
          A trail read newest-first would put the current owner at
          the top and the control saying the same thing four rows
          above it, which reads as two answers to one question. */}
      <ol className="dp-hands">
        {shown.map((h) => (
          <li className="dp-hand" key={h.id}>
            {/* THE SENTENCE COMES FROM `owners.ts`, not from here.
                The toast that announced the act uses the same
                function, so a handover cannot be described one way
                as it happens and another way afterwards. */}
            <span className="dp-hand-said">{handoverSay(h, roles)}</span>
            <span className="dp-hand-top">
              {/* NO NAME WHERE THERE IS NO NAME — the rule the note
                  above keeps. A handover made with nobody signed in
                  still has a time. */}
              {h.who ? <span className="dp-hand-who">{h.who}</span> : null}
              <span className="dp-hand-when ds-mono">{whenSay(h.at)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ============================================================
   THE LINKS
   ============================================================ */

export interface DealLinksProps {
  quote: QuoteDef
  links: LinkBag
  /** TRUE WHEN IT WAS TAKEN, and that is what empties the two
   *  boxes. The container owns the refusal because it owns the
   *  store; the form only needs to know whether what it holds is
   *  still wanted, and wiping a rejected address would delete the
   *  thing somebody has to correct. */
  onAdd: (label: string, url: string) => boolean
  onDrop: (link: DealLink) => void
  /** the refusal from the last attempt, or null */
  why: string | null
  onTyping: () => void
}

export function DealLinks({
  quote,
  links,
  onAdd,
  onDrop,
  why,
  onTyping,
}: DealLinksProps): JSX.Element {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const list = linksFor(links, quote.id)

  return (
    <section className="dp-part" aria-label={`Links on ${quote.reference}`}>
      <SectionHead>Links</SectionHead>
      {list.length === 0 ? (
        <p className="dp-none">Nothing linked to this deal yet.</p>
      ) : (
        <ul className="dp-links">
          {/* A LINK IS A ROW WITH A CONTROL AT THE END — the still
              `Row`, whose trail is the one place a button may sit,
              because the row itself is not a target: the link is. */}
          {list.map((l) => (
            <li key={l.id}>
              <Row
                dense
                name={
                  /* `noreferrer noopener` AND A NEW TAB. The scheme was
                     already checked by `tidyUrl`; this is the other half
                     — a deal's link is somebody else's page and it must
                     not be handed a handle on this one. */
                  <a
                    className="dp-link-go"
                    href={l.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <LinkSimple size={ICON_SIZE.tiny} aria-hidden="true" />
                    <span className="dp-link-name">{l.label}</span>
                    <ArrowSquareOut size={ICON_SIZE.tiny} aria-hidden="true" />
                  </a>
                }
                trail={
                  <Button
                    tone="ghost"
                    size="sm"
                    aria-label={`Remove the link ${l.label}`}
                    onClick={() => onDrop(l)}
                  >
                    <Trash size={ICON_SIZE.tiny} aria-hidden="true" />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <form
        className="dp-add"
        onSubmit={(e) => {
          e.preventDefault()
          if (onAdd(label, url)) {
            setLabel('')
            setUrl('')
          }
        }}
      >
        <Field
          label="What it is"
          value={label}
          onChange={(v) => {
            setLabel(v)
            onTyping()
          }}
        />
        {/* `inputMode` AND NOT `type="url"`, and the difference is
            not cosmetic. `type="url"` turns on the browser's own
            constraint validation, which refuses to submit anything
            without a scheme — so a pasted `northsidemarine.com.au`
            was blocked by a native bubble before `tidyUrl` could
            complete it, and the bubble is the operating system's
            typeface and metrics in the middle of a design system.
            The same fault the native `<select>` was replaced for.
            `inputMode` keeps the phone keyboard and refuses
            nothing; the refusal below says why, in our words. An
            address is an identifier, so it is mono (§2). */}
        <Field
          label="Address"
          value={url}
          inputMode="url"
          mono
          onChange={(v) => {
            setUrl(v)
            onTyping()
          }}
        />
        <Button type="submit">Add</Button>
        {why ? (
          <p className="dp-why" role="alert">
            {why}
          </p>
        ) : null}
      </form>
    </section>
  )
}

/* ============================================================
   THE FILES
   ============================================================ */

export interface DealFilesProps {
  quote: QuoteDef
  files: DealFile[]
  ready: boolean
  onChoose: (files: FileList | null) => void
  onDrop: (file: DealFile) => void
  /** what the last attempt refused, or what it did — two different
   *  facts and drawn as two, because "kept exactly as it is" is not
   *  a warning */
  why: string | null
  did: string | null
}

export function DealFiles({
  quote,
  files,
  ready,
  onChoose,
  onDrop,
  why,
  did,
}: DealFilesProps): JSX.Element {
  const input = useRef<HTMLInputElement | null>(null)

  return (
    <section className="dp-part" aria-label={`Files on ${quote.reference}`}>
      <SectionHead>Files</SectionHead>
      {!ready ? (
        <p className="dp-none">Reading what is attached…</p>
      ) : files.length === 0 ? (
        <p className="dp-none">Nothing attached to this deal yet.</p>
      ) : (
        <ul className="dp-files">
          {/* A FILE IS A ROW: the mark leads, the name is what is
              scanned for, the size is metadata beside it, and the
              remove control is the trail. A size is a figure and
              stays mono inside the row's caption slot. */}
          {files.map((f) => (
            <li key={f.id}>
              <Row
                dense
                lead={<FileMark file={f} />}
                name={f.name}
                meta={<span className="ds-mono">{sizeSay(f.size)}</span>}
                trail={
                  <Button
                    tone="ghost"
                    size="sm"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => onDrop(f)}
                  >
                    <Trash size={ICON_SIZE.tiny} aria-hidden="true" />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {/* THE INPUT IS HIDDEN AND THE BUTTON IS REAL. A bare
          `<input type="file">` draws the operating system's own
          control — its typeface, its metrics, its focus ring — which
          is the same fault the native `<select>` was replaced for.
          The input keeps the keyboard: the button forwards to it. */}
      <input
        ref={input}
        className="dp-file-in"
        type="file"
        multiple
        aria-label={`Attach a file to ${quote.reference}`}
        onChange={(e) => {
          onChoose(e.target.files)
          /* THE SAME FILE TWICE. A file input fires nothing when the
             value has not changed, so attaching a photograph,
             removing it and attaching it again would do nothing the
             second time. */
          e.target.value = ''
        }}
      />
      <div className="dp-attach">
        <Button
          glyph={<Paperclip size={ICON_SIZE.tiny} aria-hidden="true" />}
          onClick={() => input.current?.click()}
        >
          Attach a file
        </Button>
      </div>

      {why ? (
        <p className="dp-why" role="alert">
          {why}
        </p>
      ) : null}
      {did ? (
        /* WHAT WAS DONE TO SOMEBODY'S FILE, said where it happened —
           `logo.ts`'s rule applied to a success rather than a
           refusal. */
        <p className="dp-did" role="status">
          {did}
        </p>
      ) : null}
    </section>
  )
}

/** A thumbnail for a picture, a paperclip for everything else.
 *
 *  THE OBJECT URL IS REVOKED WHEN THE ROW GOES, and that is the
 *  whole reason this is a component rather than an expression in
 *  the list. `URL.createObjectURL` pins the Blob it names until
 *  something revokes it: a pane that minted one per row and never
 *  gave them back would hold every photograph a person had ever
 *  opened alive for the life of the tab. */
function FileMark({ file }: { file: DealFile }): JSX.Element {
  const [src, setSrc] = useState<string | null>(null)
  /** A DECLARED TYPE IS NOT A DECODABLE PICTURE. `image/*` is what
   *  the operating system said when the file was picked; a truncated
   *  upload, a HEIC this browser will not decode, or anything simply
   *  mislabelled all satisfy it and then draw the browser's own
   *  broken-image glyph — which is the failure `DealPhoto` above
   *  rejects in as many words. The fallback is eight lines down and
   *  already written, so failing to decode just routes to it. */
  const [broke, setBroke] = useState(false)
  const picture = isPicture(file.type)

  useEffect(() => {
    setBroke(false)
    if (!picture) {
      setSrc(null)
      return
    }
    const url = URL.createObjectURL(file.blob)
    setSrc(url)
    return () => {
      URL.revokeObjectURL(url)
      setSrc(null)
    }
  }, [file.blob, picture])

  if (picture && src && !broke) {
    return (
      <img
        className="dp-file-thumb"
        src={src}
        alt=""
        width={36}
        height={36}
        onError={() => setBroke(true)}
      />
    )
  }
  return (
    <span className="dp-file-mark" aria-hidden="true">
      <Paperclip size={ICON_SIZE.tiny} />
    </span>
  )
}
