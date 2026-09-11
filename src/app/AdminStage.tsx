/* ============================================================
   ADMIN — the workshop behind the shop, and it is not a
   graveyard.

   THE RISK THIS FILE EXISTS TO NOT TAKE. PHASE_TWO §8.1 names it
   first: "Admin becomes a graveyard. The schema work is genuinely
   good and burying it badly is the biggest risk here." Eight
   doors came off the rail into this stage. Every one of them
   opens a finished feature, and one of them — the fitment
   builder — had no door anywhere in the application before this
   file was written.

   SO IT IS BUILT LIKE A SELLING SCREEN, NOT LIKE A SETTINGS PAGE.

     ONE THING DOMINATES. The business's name, in the display
     face, clamped 34→64px. Everything else on this screen is
     15px or 11px, which is the scale contrast §3 asks for and
     the thing the dashboard measured at 34px flat did not have.

     EVERY DOOR CARRIES A FIGURE, and the figure is real: tables
     counted off the store, rows summed off the rows, rules off
     `useConstraints`, roles off the roles slice. A door with no
     honest number carries no number — "Configure" says which
     three levels it writes at, because that is a fact about the
     door and not a sentence about the app.

     NO PARAGRAPHS. The stage gets its name and one line. A door
     gets a name and one fact. That is the whole prose budget
     (§1a) and this screen spends exactly it.

     NO KIND HUE. The discipline is that a hue only ever appears
     on something that HAS that kind (§1b). A rule, a role and an
     import are not boats, motors, trailers or rigging kits, so
     Admin is ink, accent and paper — and that is not a shortfall,
     it is the rule being kept where keeping it costs something.

   THE ACCESS SCREEN IS THIS STAGE'S OWN STATE, not a second stage
   kind — the same argument ModuleStage makes about its settings
   panel. "Back to Admin" must not unmount the box, re-run the
   fade and drop the scroll of a person comparing two roles.

   THE DRAWING IS NOT MOUNTED HERE. `.shell-sheet-layer` is the
   whiteboard and it is the app's one permanent surface, alive
   under every window. Its door empties the window stack, which is
   the honest reading of "show me the drawing" — see `setStage`
   in Shell.tsx.
   ============================================================ */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import {
  ArrowLeft,
  Archive,
  ArrowsLeftRight,
  Quotes,
  CaretLeft,
  FlowArrow,
  Graph,
  Scales,
  ShieldCheck,
  Stack,
  TreeStructure,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { isRetired } from '@/types/model'
import { useConstraints } from '@/features/constraints'
import { AccessScreen } from '@/features/modules'
import { ImportExportMenu } from '@/features/io'
import {
  archiveVersion,
  listConfigurations,
  subscribeToArchive,
} from '@/features/tenancy'
import type { AppUser } from '@/features/auth'
import { PageHead } from '@/features/page'
import { atLeast, ROLE_NAME } from '@/features/auth'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { Button, Card, Field, SectionHead } from '@/ui'
import { stageKeys, useStageEscape } from './stageKeys'
import { useStageEntry } from './stageEntry'

const MARK = ICON_SIZE.medium
const MARK_WEIGHT = weightFor(MARK)

export interface AdminStageProps {
  /** the drawing — the app's one permanent surface, under
   *  everything. Only the shell can empty the window stack. */
  onOpenDrawing: () => void
  /** every table you have, on one page */
  onOpenTables: () => void
  /** set a value once at a brand, a range or a model */
  onOpenLevels: () => void
  /** the limits every row must keep */
  onOpenRules: () => void
  /** what fits what — the pairings behind every shortlist */
  onOpenFitment: () => void
  /** the organisation's saved configurations */
  onOpenConfigurations: () => void
  /** one module's own set-up, from the access grid */
  onOpenModule: (moduleId: string) => void
  /** who is signed in. Their `orgSlug` scopes the saved
   *  configurations, which is the one figure on this screen that
   *  cannot be read straight off the project. */
  user: AppUser | null
  onClose: () => void
}

/** A door. A name, a mark, and ONE fact — never a description. */
function Door({
  glyph: Glyph,
  name,
  fact,
  wide,
  onPick,
}: {
  glyph: Icon
  name: string
  /** ONE fact, and only when there is an honest one. A door whose
   *  figure has not resolved — or has none to give — carries no
   *  line rather than a placeholder; the name centres instead. */
  fact?: string
  wide?: boolean
  onPick: () => void
}): ReactElement {
  /* A DOOR IS A CARD, and the card is the primitive's: ground, hairline,
     radius, lift, press and focus ring come from `src/ui`, once. What
     this stage still owns is the cell it stands in (the drawing's door
     is worth two) and what is on it.

     THE NAME WEARS THE DISPLAY TIER'S MIDDLE STEP. `--t-display-xl` is
     the step ds.css cut for "a name that is one of several and is the
     point of the screen"; five doors are the point of this screen, and
     the page's own title above them stays at the title step so the
     chrome never outranks them. The grid is two columns so the longest
     name a door carries — "Saved configurations" — fits at 34px at
     1280 and wraps at a space, never mid-word, below it. */
  return (
    <div className={`ad-cell${wide ? ' is-wide' : ''}`}>
      <Card onActivate={onPick} pad="md">
        <span className="ad-door-mark" aria-hidden="true">
          <Glyph size={MARK} weight={MARK_WEIGHT} />
        </span>
        <span className="ds-display-xl ad-door-name">{name}</span>
        {/* THE ONE FACT. Mono, tabular, because most of them are
            figures and a column of facts that do not line up on the
            decimal is a column somebody has to read twice. */}
        {fact ? <span className="ad-door-fact">{fact}</span> : null}
      </Card>
    </div>
  )
}

export function AdminStage({
  onOpenDrawing,
  onOpenTables,
  onOpenLevels,
  onOpenRules,
  onOpenFitment,
  onOpenConfigurations,
  onOpenModule,
  user,
  onClose,
}: AdminStageProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const roles = useProjectStore((s) => s.roles)
  const org = useProjectStore((s) => s.meta.org)
  const constraints = useConstraints()

  /* THE TOP RUNG. `atLeast` rather than an equality: a check
     written `role === 'super-admin'` is a gate that stays shut the
     day a rung is added above it, and there is one above it in
     every multi-tenant build. */
  const top = atLeast(user, 'super-admin')

  /* WHOSE SET-UP IS ON SCREEN. Held here rather than in the shell's
     Stage union — see the header. */
  const [showing, setShowing] = useState<'index' | 'access'>('index')

  /* HOW MANY WORKING SETS THIS ORGANISATION HAS SAVED. The one
     figure on this screen that is not in the project: the archive is
     asked, asynchronously, and re-asked when it changes — the same
     pair `ConfigurationsPanel` uses, so the door and the sheet
     behind it can never disagree. `null` until it answers and if it
     never answers: the door carries no fact rather than a zero it
     has not earned. */
  const version = useSyncExternalStore(
    subscribeToArchive,
    archiveVersion,
    archiveVersion,
  )
  const [saved, setSaved] = useState<number | null>(null)
  useEffect(() => {
    if (!user) return
    let live = true
    void listConfigurations(user.orgSlug).then(
      (list) => {
        if (live) setSaved(list.length)
      },
      () => {
        if (live) setSaved(null)
      },
    )
    return () => {
      live = false
    }
  }, [user, version])

  /* Escape is the control in track 1 of the bar, on the keyboard.
     Inside the access screen it is that screen's own way back, so the
     stage yields it rather than throwing the whole page away under
     somebody halfway through granting a capability. */
  useStageEscape(showing === 'index' ? onClose : () => setShowing('index'))

  /* AND THE NAME CHANGES WITH `showing`, which is the only reason this
     stage's two screens are audible at all. The access screen replaces
     the whole well below (line ~281) and draws its own `h1` reading
     "Access & roles" — see the note above the bar — so the name here
     is that same h1's words. Without it, going in and out of a screen
     Escape treats as a page of its own would announce nothing.
     See stageEntry.ts. */
  const stage = useStageEntry(showing === 'access' ? 'Access & roles' : 'Admin')

  const facts = useMemo(() => {
    const live = Object.values(entities).filter((e) => !isRetired(e))
    const tables = live.filter((e) => e.role !== 'join')
    const joins = live.filter((e) => e.role === 'join')
    let rows = 0
    for (const e of tables) rows += rowsByEntity[e.id]?.length ?? 0
    let pairs = 0
    for (const e of joins) pairs += rowsByEntity[e.id]?.length ?? 0
    return {
      tables: tables.length,
      rows,
      joins: joins.length,
      pairs,
      roles: Object.keys(roles).length,
      rules: constraints.length,
    }
  }, [entities, rowsByEntity, roles, constraints])

  const n = (x: number): string => x.toLocaleString('en-AU')
  const one = (x: number, singular: string, plural: string): string =>
    `${n(x)} ${x === 1 ? singular : plural}`

  return (
    <div
      className="shell-viewstage ad"
      role="region"
      {...stage}
      /* Delete and Backspace stop at this root, the same line every
         other stage carries: the sheet's window-level handler offers
         to strike the SELECTED TABLE on either one. Escape travels —
         see stageKeys.ts. */
      onKeyDown={stageKeys}
    >
      <div className="shell-view-bar">
        {/* THE WAY BACK is the primitive's ghost button in the bar's
            first track. `.shell-view-lead` is the track, not a look. */}
        <div className="shell-view-lead">
          <Button
            tone="ghost"
            size="sm"
            glyph={<ArrowLeft size={ICON_SIZE.small} />}
            onClick={showing === 'index' ? onClose : () => setShowing('index')}
          >
            Back
          </Button>
        </div>
        {/* THE BAR STOPPED SAYING THE PAGE'S NAME.

            It used to be the only heading these pages had, and it was
            marked up as one. `PageHead` now draws the title, the
            eyebrow, the counted fact and the acts — so the bar was
            printing a second, worse copy of the same thing directly
            above it: "Quotes we have made · a rig, a customer and a
            moment" over "SELLING / Pipeline". Two titles, and the
            centred one won the eye because it was first.

            It is kept where the surface below has NO PageHead — a
            quote document, one customer — because there it is still
            the only thing naming what is on screen.
            Reported as "header of page is crap", and it was.

            AND ACCESS & ROLES IS NOT ONE OF THOSE. `AccessScreen`
            draws its own hero, `h1.md-acc-title`, reading "Access &
            roles" — measured on the page, that h1 sat at top 131 with
            this strip's identical words at top 28, 103px apart. The
            surface names itself; the bar keeps the Back button and
            the act, and stops printing the title a second time. */}
        {showing === 'access' ? (
          <div className="shell-quote-acts">
            <Button
              tone="neutral"
              size="sm"
              glyph={<CaretLeft size={ICON_SIZE.tiny} weight="bold" />}
              onClick={() => setShowing('index')}
            >
              All of Admin
            </Button>
          </div>
        ) : null}
      </div>

      {showing === 'access' ? (
        <div className="ad-well">
          <AccessScreen
            onPlaces={() => setShowing('index')}
            onSettings={onOpenModule}
          />
        </div>
      ) : (
        <div className="ad-well">
          {/* THE APPLICATION'S HEADER. This was the fourth of five
              different ones — a 52px hero over its own eyebrow with
              its own gutter. See features/page/PageHead.tsx.

              THE NAME IS "Admin", NOT THE DEALERSHIP'S. Same reason
              the modules page stopped shouting it: the rail says
              whose business this is on every screen, and a person
              who pressed Admin wants to know they are in Admin. */}
          <PageHead
            eyebrow={org?.name ?? 'Your business'}
            name="Admin"
            /* THE RUNG IS SAID, because what is on this screen
               depends on it and a person who cannot see a door
               should be able to tell whether it is missing or
               simply not theirs. */
            count={user ? ROLE_NAME[user.role] : undefined}
            line="Who may do what, what has been saved, and what goes in and out."
          />

          {/* THE SHAPE BAND IS GONE FROM HERE and is its own stage:
              see DataStage.tsx. Admin is the ORGANISATION — who may
              do what, what has been saved, what goes in and out.
              The data model and the tables are what the business
              SELLS FROM, which is a different job on a different
              day, and it was buried two levels down behind a 32px
              link. */}
          <section className="ad-band" aria-labelledby="ad-band-org">
            {/* the band's caption is the section primitive — the one
                uppercase style, drawn once; this owns only its air */}
            <div className="ad-band-head">
              <SectionHead level="h3" id="ad-band-org">
                The organisation
              </SectionHead>
            </div>
            <div className="ad-grid">
              <Door
                glyph={ShieldCheck}
                name="Access & roles"
                fact={one(facts.roles, 'role', 'roles')}
                onPick={() => setShowing('access')}
              />
              <Door
                glyph={Archive}
                name="Saved configurations"
                fact={
                  saved === null
                    ? undefined
                    : one(saved, 'working set', 'working sets')
                }
                onPick={onOpenConfigurations}
              />
              {/* THE TWO DOORS A FILE COMES IN AND GOES OUT BY. It is
                  a menu, not a page, so it keeps its own trigger and
                  takes the door's shape around it rather than being
                  redrawn — one control, one behaviour, one place that
                  knows what an import costs. */}
              <div className="ad-cell">
                <Card pad="md">
                  <span className="ad-door-mark" aria-hidden="true">
                    <ArrowsLeftRight size={MARK} weight={MARK_WEIGHT} />
                  </span>
                  <span className="ds-display-xl ad-door-name">Import / export</span>
                  <span className="ad-door-fact">
                    <ImportExportMenu align="left" />
                  </span>
                </Card>
              </div>
              {/* THE SENTENCE EVERY QUOTE STARTS WITH. A setting and
                  not a door — pressing it goes nowhere — so it takes
                  the cell's shape around a control, exactly as
                  Import / export does beside it, rather than being
                  drawn as a door that lies about what a press will
                  do. Four cells is two clean rows. */}
              <QuoteTermsCell />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   THE SENTENCE EVERY QUOTE STARTS WITH — CONFIG_FINDINGS adopt 10's
   first layer, given somewhere to be typed.

   `OrgProfile.quoteTerms` explains the model half: it is a STARTING
   VALUE copied onto a document at `freeze`, never a layer resolved at
   read time, because a quote is a photograph and a sentence resolved
   later would rewrite terms on a quote already handed over.

   IT COMMITS ON BLUR, NOT ON EVERY KEYSTROKE. A store write per
   character would be a history entry per character, and Ctrl+Z would
   walk somebody backwards through their own typing one letter at a
   time.

   AND IT RAISES NO TOAST. Rule 9 is about an act whose effect is
   somewhere else — a merge, a delete, a level written across 187
   rows. This one's effect is the field it was typed into: the screen
   IS the receipt, and a note saying "saved" over a control that
   plainly holds the value is the app talking about itself.
   ============================================================ */
function QuoteTermsCell(): ReactElement {
  const terms = useProjectStore((s) => s.meta.org?.quoteTerms ?? '')
  const setQuoteTerms = useProjectStore((s) => s.setQuoteTerms)
  const [draft, setDraft] = useState(terms)

  /* WHAT THE STORE HOLDS WINS WHEN IT CHANGES UNDER US — a project
     swap, an import, an undo. This is React's own "adjust state
     during render" shape rather than an effect: the draft is
     corrected before anything paints, so nothing flashes the old
     sentence. A ref would read the same and is what the linter
     objects to, correctly — a ref read during render is a value the
     renderer cannot see change. */
  const [seen, setSeen] = useState(terms)
  if (seen !== terms) {
    setSeen(terms)
    setDraft(terms)
  }

  return (
    <div className="ad-cell">
      <Card pad="md">
        <span className="ad-door-mark" aria-hidden="true">
          <Quotes size={MARK} weight={MARK_WEIGHT} />
        </span>
        <span className="ds-display-xl ad-door-name">Quote terms</span>
        <span className="ad-door-fact">
          <Field
            label="The sentence every new quote starts with"
            value={draft}
            onChange={setDraft}
            placeholder="This quote is valid for 30 days."
            hint="Copied onto a quote when it is made. Editing it here leaves quotes already written alone."
            onBlur={() => setQuoteTerms(draft)}
          />
        </span>
      </Card>
    </div>
  )
}
