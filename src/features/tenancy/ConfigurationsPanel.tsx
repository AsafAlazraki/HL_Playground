/* ============================================================
   SAVED CONFIGURATIONS — one business's set-up, filed and openable.

   MOUNTING IT (the whole job):

     import { ConfigurationsPanel } from '@/features/tenancy'
     <ConfigurationsPanel user={user} />

   It fills whatever box it is put in, scrolls itself, and brings its
   own stylesheet. `user` is the signed-in `AppUser` — the panel does
   not reach for `currentUser()` itself, because the shell already
   holds it and two readers of one identity is how a screen ends up
   showing another business's list.

   ---------------------------------------------------------------
   THE ONE JUDGEMENT ON THIS SCREEN.

   OPENING A CONFIGURATION REPLACES THE SHEET AND CANNOT BE UNDONE.
   `replaceProject` calls `forgetHistory()` — a swap is not a step —
   so Ctrl+Z will not bring the previous sheet back. That is the
   narrow case rule 9 keeps a confirm for, and §7 says a confirm
   states its blast radius COMPUTED: `sheetNow` already does that
   counting for the three other surfaces that destroy a sheet, so
   this uses it and cannot disagree with them. See `atStake` below
   for the one thing it does NOT reuse, and the measurement that
   settled it.

   The confirm is INLINE, in the row it belongs to, rather than a
   modal over the panel. A modal would hide the list the person is
   comparing against — "is this the one from before the winter
   prices?" is answered by the row underneath.

   AND IT OFFERS THE WAY OUT FIRST. The row's own "Save this sheet
   first" writes the current set as a new configuration before
   anything is replaced, which turns an irreversible act into a
   reversible one. That button is the reason this screen is not
   frightening.

   ---------------------------------------------------------------
   EVERY FIGURE HERE WAS COUNTED. Tables, columns, rows, modules,
   pages, rules and quotes come from `summariseEnvelope` at the
   moment of the save, and the size is the byte length of the
   envelope. Nothing is estimated and nothing is invented: a
   configuration with no modules says nothing about modules rather
   than printing a nought.
   ============================================================ */

import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent, JSX } from 'react'
import { say } from '@/store/notes'
import { sheetNow, quotesSurviveSentence, type SheetNow } from '@/features/io/sheetNow'
import type { AppUser } from '@/features/auth/session'
import type { ConfigRecord } from './archive'
import {
  archiveVersion,
  listConfigurations,
  openConfiguration,
  removeConfiguration,
  saveConfiguration,
  subscribeToArchive,
  suggestedConfigName,
} from './configs'
import './tenancy.css'

export interface ConfigurationsPanelProps {
  /** who is signed in. Their `orgSlug` scopes every row on this screen. */
  user: AppUser
}

/** Which row is mid-question, and which question. One at a time: two
 *  open confirms on one list is two decisions at a glance, and §4b's
 *  rule about a note holding one decision applies to a row as well. */
type Asking = { id: string; about: 'open' | 'forget' } | null

export function ConfigurationsPanel({ user }: ConfigurationsPanelProps): JSX.Element {
  /* the archive is off-store and async, so the list is read on mount
     and again whenever the archive says it moved — `archiveVersion`
     is the external snapshot that makes that a subscription rather
     than a refresh button */
  const version = useSyncExternalStore(subscribeToArchive, archiveVersion, archiveVersion)
  const [rows, setRows] = useState<ConfigRecord[] | null>(null)
  const [name, setName] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState<Asking>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    let stale = false
    void listConfigurations(user.orgSlug).then((list) => {
      if (!stale) setRows(list)
    })
    return () => {
      stale = true
    }
  }, [user.orgSlug, version])

  const save = useCallback(
    async (title?: string): Promise<boolean> => {
      setBusy(true)
      const res = await saveConfiguration(user, title ?? name)
      if (!alive.current) return res.ok
      setBusy(false)
      if (!res.ok) {
        setProblem(res.why)
        return false
      }
      setProblem(null)
      setName('')
      /* A SAVE IS NOT DESTRUCTIVE, so it gets a note rather than a
         dialog, and the note carries the figure a person would
         otherwise have to go and count. */
      say({ text: `Saved “${res.record.name}” — ${res.record.counts.tables} tables, ${res.record.counts.rows.toLocaleString()} rows.` })
      return true
    },
    [name, user],
  )

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault()
    if (busy) return
    void save()
  }

  const doOpen = useCallback(
    async (record: ConfigRecord): Promise<void> => {
      setBusy(true)
      const res = await openConfiguration(record.id)
      if (!alive.current) return
      setBusy(false)
      setAsking(null)
      if (!res.ok) {
        setProblem(res.why)
        return
      }
      setProblem(null)
      say({
        text: `“${res.record.name}” is on the sheet — ${res.counts.tables} tables, ${res.counts.rows.toLocaleString()} rows.`,
      })
    },
    [],
  )

  const doForget = useCallback(async (record: ConfigRecord): Promise<void> => {
    setBusy(true)
    const res = await removeConfiguration(record.id)
    if (!alive.current) return
    setBusy(false)
    setAsking(null)
    if (!res.ok) {
      setProblem(res.why)
      return
    }
    setProblem(null)
    say({ text: `“${record.name}” is no longer saved. Your sheet was not touched.` })
  }, [])

  const suggestion = suggestedConfigName()

  return (
    <section className="tn" aria-label="Saved configurations">
      <header className="tn-head">
        <h2 className="tn-title">Saved configurations</h2>
        {/* ONE LINE, AND IT IS THE BLAST RADIUS. What a configuration
            HOLDS is the half a person cannot guess, and it is the half
            that matters before they open one over their own sheet. That
            saving saves and opening opens is the two buttons. */}
        <p className="tn-lede">
          Tables, rows, rules, pages, modules and quotes, filed under {user.orgName}.
        </p>
      </header>

      {/* ---- save the sheet as it stands ---------------------- */}
      <form className="tn-save" onSubmit={onSubmit}>
        <label className="tn-label" htmlFor="tn-name">
          Name this configuration
        </label>
        <div className="tn-save-row">
          <input
            id="tn-name"
            className="tn-input"
            type="text"
            value={name}
            placeholder={suggestion}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value)
              setProblem(null)
            }}
          />
          <button className="tn-go" type="submit" disabled={busy}>
            Save this sheet
          </button>
        </div>
        <p className="tn-hint">
          Leave the name empty and it is filed as {suggestion || 'the project name'}.
        </p>
      </form>

      {problem !== null && (
        <p className="tn-why" role="status">
          {problem}
        </p>
      )}

      {/* ---- what has been saved ------------------------------ */}
      {rows === null ? (
        <p className="tn-quiet">Reading what is saved…</p>
      ) : rows.length === 0 ? (
        <p className="tn-quiet">
          Nothing is saved for {user.orgName} yet. The first save on this machine becomes what
          a new browser opens with.
        </p>
      ) : (
        <ol className="tn-list">
          {rows.map((r) => (
            <li className="tn-item" key={r.id}>
              <div className="tn-item-top">
                <div className="tn-item-said">
                  <h3 className="tn-name">{r.name}</h3>
                  <p className="tn-stamp">
                    <span className="tn-rev">REV {String(r.rev).padStart(2, '0')}</span>
                    <span className="tn-dot" aria-hidden="true" />
                    <time className="tn-when" dateTime={r.savedAt}>
                      {whenSaid(r.savedAt)}
                    </time>
                    <span className="tn-dot" aria-hidden="true" />
                    <span className="tn-who">{r.savedBy.name}</span>
                  </p>
                </div>
                <div className="tn-acts">
                  <button
                    className="tn-act"
                    type="button"
                    disabled={busy}
                    onClick={() => setAsking({ id: r.id, about: 'open' })}
                  >
                    Open
                  </button>
                  <button
                    className="tn-act is-quiet"
                    type="button"
                    disabled={busy}
                    onClick={() => setAsking({ id: r.id, about: 'forget' })}
                  >
                    Forget
                  </button>
                </div>
              </div>

              <p className="tn-holds">
                {holdings(r).map((h) => (
                  <span className="tn-fact" key={h.noun}>
                    <span className="tn-fig">{h.n.toLocaleString()}</span> {h.noun}
                  </span>
                ))}
                <span className="tn-fact">
                  <span className="tn-fig">{sizeOf(r.bytes)}</span>
                </span>
              </p>

              {asking?.id === r.id && asking.about === 'open' && (
                <div className="tn-ask">
                  <p className="tn-ask-say">
                    {atStake().blank ? (
                      'There is nothing on the sheet, so nothing is overwritten.'
                    ) : (
                      <>
                        The sheet now holds{' '}
                        {atStake().facts.map((f, i) => (
                          <Fragment key={f.noun}>
                            {i > 0 ? ' · ' : ''}
                            <span className="tn-fact">
                              <span className="tn-fig">{f.n.toLocaleString()}</span> {f.noun}
                            </span>
                          </Fragment>
                        ))}
                        . All of it is replaced.
                      </>
                    )}
                  </p>
                  <p className="tn-ask-say is-hard">
                    Opening a configuration cannot be undone — Ctrl+Z does not bring the
                    previous sheet back.
                  </p>
                  {quotesSurviveSentence(sheetNow()) !== '' && (
                    <p className="tn-ask-say">{quotesSurviveSentence(sheetNow())}</p>
                  )}
                  <div className="tn-ask-acts">
                    <button
                      className="tn-act"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void save(`${suggestion} — before opening ${r.name}`)
                      }}
                    >
                      Save this sheet first
                    </button>
                    <button
                      className="tn-act is-danger"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void doOpen(r)
                      }}
                    >
                      Replace the sheet
                    </button>
                    <button
                      className="tn-act is-quiet"
                      type="button"
                      onClick={() => setAsking(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {asking?.id === r.id && asking.about === 'forget' && (
                <div className="tn-ask">
                  <p className="tn-ask-say is-hard">
                    Forget “{r.name}”? Your sheet is not touched, and this cannot be undone.
                  </p>
                  <div className="tn-ask-acts">
                    <button
                      className="tn-act is-danger"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void doForget(r)
                      }}
                    >
                      Forget it
                    </button>
                    <button
                      className="tn-act is-quiet"
                      type="button"
                      onClick={() => setAsking(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ------------------------------------------------------------ */
/* the words and the figures                                     */
/* ------------------------------------------------------------ */

/** What a saved configuration holds, as counted nouns, with nothing
 *  that is zero. "0 modules" is noise in a line about what is in a
 *  file, and the dealer's nouns are the ones used everywhere else. */
function holdings(r: ConfigRecord): Array<{ n: number; noun: string }> {
  const c = r.counts
  const out: Array<{ n: number; noun: string }> = [
    { n: c.tables, noun: c.tables === 1 ? 'table' : 'tables' },
    { n: c.rows, noun: c.rows === 1 ? 'row' : 'rows' },
  ]
  if (c.modules > 0) out.push({ n: c.modules, noun: c.modules === 1 ? 'module' : 'modules' })
  if (c.pages > 0) out.push({ n: c.pages, noun: c.pages === 1 ? 'page' : 'pages' })
  if (c.rules > 0) out.push({ n: c.rules, noun: c.rules === 1 ? 'rule' : 'rules' })
  if (c.quotes > 0) out.push({ n: c.quotes, noun: c.quotes === 1 ? 'quote' : 'quotes' })
  return out
}

/* ============================================================
   THE BLAST RADIUS, COMPUTED.

   THE COUNT IS `sheetNow()` — io's own, the one CLEAR SHEET and
   REPLACE use, so the three surfaces cannot disagree about how much
   is at stake. What is NOT reused is `sheetFacts`, which returns
   finished strings, and the reason is measured rather than
   stylistic: it prints `15691 rows` while the holdings line six
   pixels above it prints `15,691 rows`, because every figure on this
   screen is mono, tabular and grouped. One number written two ways
   in one box reads as two different numbers.

   So the nouns, the order and the zero-suppression are `sheetFacts`'
   — table, row, module, page, rule, zone, anything at nought left
   out — and only the rendering is this screen's.
   ============================================================ */
function atStake(): { blank: boolean; facts: Array<{ n: number; noun: string }> } {
  const now: SheetNow = sheetNow()
  const facts: Array<{ n: number; noun: string }> = [
    { n: now.tables, noun: now.tables === 1 ? 'table' : 'tables' },
  ]
  const add = (n: number, one: string, many: string): void => {
    if (n > 0) facts.push({ n, noun: n === 1 ? one : many })
  }
  add(now.rows, 'row', 'rows')
  add(now.modules, 'module', 'modules')
  add(now.pages, 'page', 'pages')
  add(now.rules, 'rule', 'rules')
  add(now.zones, 'zone', 'zones')
  return { blank: now.blank, facts }
}

/** A saved size a person can compare — kB below a megabyte, MB above,
 *  one decimal, never "1048576 bytes". */
function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} kB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/** When it was saved, in the reader's own locale. A date and a time,
 *  because two configurations saved on one afternoon are the ordinary
 *  case and a bare date cannot tell them apart. */
function whenSaid(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
