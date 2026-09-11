/* ============================================================
   ONE DEAL'S WORKING STATE — held once, drawn twice.

   `dealParts.tsx` draws the pieces and owns none of them. This
   owns all of it: the three stores a deal hangs off, the box
   somebody is halfway through typing in, and the three refusals
   that have to be printed where they happened. The popup and the
   page both call it, which is what stops "add a note" behaving
   differently depending on which of the two you were looking at.

   EVERY ACT HERE IS UNDOABLE AND THEREFORE A TOAST WITH UNDO
   (rule 9), never a confirm. And it is `say` with its own `act`
   rather than `sayUndoable`, for the reason `Board.tsx` gives
   about a stage move: none of these touch the PROJECT store, so
   pinning the top of that undo stack would offer to reverse
   whatever unrelated edit happened last. Each act puts back
   exactly the thing that was removed, by id.

   THE THREE REFUSALS ARE THREE FACTS AND ARE HELD SEPARATELY. A
   note with no words in it, an address that is not one, and a file
   over the ceiling are different problems with different remedies
   and different homes on screen. One `why` shared between them
   would print "a note needs some words in it" under a file picker.

   WHAT WAS TYPED BELONGS TO THE DEAL IT WAS TYPED ON. Opening a
   second card clears all of it — a half-written sentence about
   Marcus must not arrive on Priya's card.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { currentUser } from '@/features/auth'
import { sizeSay } from '@/features/modules'
import { say } from '@/store/notes'
import { useProjectStore } from '@/store/useProjectStore'
import type { RoleDef } from '@/types/model'
import type { QuoteDef } from '@/types/model'
import { composeNote, dropNote, saveNote, useDealNotes, whyNotNote } from './dealNotes'
import {
  composeLink,
  dropLink,
  saveLink,
  useDealLinks,
  whyNotLink,
  type DealLink,
} from './dealLinks'
import {
  dropFile,
  putFile,
  restoreFile,
  useDealFiles,
  type DealFile,
} from './dealFiles'
import {
  composeHandover,
  dropHandover,
  handoverToast,
  handoversFor,
  ownerInForce,
  ownerOf,
  roleWord,
  saveHandover,
  useDealOwners,
  whyNotOwner,
  NOBODY,
  type Handover,
} from './owners'
import { arrivedAt, useSince, useStages } from './stages'

export interface DealDesk {
  notes: ReturnType<typeof useDealNotes>
  links: ReturnType<typeof useDealLinks>
  files: DealFile[]
  filesReady: boolean
  /** epoch ms this deal arrived where it stands, or null */
  arrived: number | null
  note: {
    text: string
    setText: (v: string) => void
    why: string | null
    unkept: boolean
    add: () => void
  }
  link: {
    why: string | null
    clearWhy: () => void
    /** true when it was taken, which is what empties the boxes */
    add: (label: string, url: string) => boolean
    drop: (link: DealLink) => void
  }
  file: {
    why: string | null
    /** what was DONE, which is not a warning — see `dealFiles.ts` */
    did: string | null
    choose: (chosen: FileList | null) => void
    drop: (file: DealFile) => void
  }
  /** WHOSE DEAL IT IS — the one act on this desk that is about a
   *  person rather than about a thing attached to the deal. See
   *  `owners.ts` for why an owner names a JOB and why that is not
   *  `preparedBy`. */
  owner: {
    /** the role id it is with, or `NOBODY` — a string either way,
     *  because that is what the picker's value has to be */
    at: string
    /** the role itself, or null when nobody holds it OR when the
     *  role that held it has since been deleted. `ownerInForce`
     *  is what refuses to name a job that no longer exists. */
    role: RoleDef | null
    /** the dealership's jobs, for the picker to offer */
    roles: RoleDef[]
    /** every handover on this deal, oldest first */
    trail: Handover[]
    /** why nobody can be given it, or null. Rule 10: the pane
     *  prints this where the control is. */
    why: string | null
    assign: (roleId: string) => void
  }
}

export function useDealDesk(orgSlug: string, quote: QuoteDef): DealDesk {
  const notes = useDealNotes(orgSlug)
  const links = useDealLinks(orgSlug)
  const { list: files, again, ready: filesReady } = useDealFiles(orgSlug, quote.id)
  const owners = useDealOwners(orgSlug)
  const at = useStages(orgSlug)
  const since = useSince(orgSlug)
  /* THE DEALERSHIP'S JOBS, from the project store rather than from
     a list of this feature's own. `owners.ts` argues at length that
     the roles are the only directory of who does what here that
     this app did not invent; reading them anywhere but the store
     would be the second copy that argument is against. Sorted by
     name so two people's panes offer the same order. */
  const roleMap = useProjectStore((s) => s.roles)
  const roles = useMemo(
    () => Object.values(roleMap).sort((a, b) => a.name.localeCompare(b.name)),
    [roleMap],
  )

  const [text, setText] = useState('')
  const [noteWhy, setNoteWhy] = useState<string | null>(null)
  const [unkept, setUnkept] = useState(false)
  const [linkWhy, setLinkWhy] = useState<string | null>(null)
  const [fileWhy, setFileWhy] = useState<string | null>(null)
  const [fileDid, setFileDid] = useState<string | null>(null)

  /* A NEW DEAL IS A CLEAN DESK. See the header. */
  useEffect(() => {
    setText('')
    setNoteWhy(null)
    setUnkept(false)
    setLinkWhy(null)
    setFileWhy(null)
    setFileDid(null)
  }, [quote.id])

  const who = currentUser()?.name

  const addNote = useCallback((): void => {
    const refusal = whyNotNote(text)
    if (refusal) {
      setNoteWhy(refusal)
      return
    }
    setNoteWhy(null)
    const note = composeNote(orgSlug, text)
    const kept = saveNote(orgSlug, quote.id, note)
    setUnkept(!kept)
    setText('')
    /* THE SENTENCE NAMES THE DEAL AND WHO IT IS FOR, because the
       audit log listens to this same bus and "Note added to Q-1042"
       tells a manager nothing they can act on. */
    say({
      text: `Note added to ${quote.reference} — ${
        quote.customer.name.trim() || quote.subjectLabel
      }.`,
      act: { label: 'Undo', onPick: () => dropNote(orgSlug, quote.id, note.id) },
    })
  }, [orgSlug, quote, text])

  const addLink = useCallback(
    (label: string, url: string): boolean => {
      const refusal = whyNotLink(label, url)
      if (refusal) {
        setLinkWhy(refusal)
        return false
      }
      const link = composeLink(orgSlug, label, url, who)
      /* `composeLink` REFUSES A SECOND TIME and it is not belt and
         braces: `whyNotLink` reads the boxes and this reads what
         `tidyUrl` actually produced, so a string that parses one way
         and normalises to nothing cannot reach the store. */
      if (!link) {
        setLinkWhy(whyNotLink(label, url) ?? 'That address could not be read.')
        return false
      }
      setLinkWhy(null)
      const kept = saveLink(orgSlug, quote.id, link)
      say({
        text: kept
          ? `${link.label} linked to ${quote.reference}.`
          : `${link.label} linked to ${quote.reference} — this browser refused to store it, so it will not be here after a refresh.`,
        act: { label: 'Undo', onPick: () => dropLink(orgSlug, quote.id, link.id) },
      })
      return true
    },
    [orgSlug, quote, who],
  )

  const removeLink = useCallback(
    (link: DealLink): void => {
      dropLink(orgSlug, quote.id, link.id)
      say({
        text: `${link.label} unlinked from ${quote.reference}.`,
        act: { label: 'Undo', onPick: () => saveLink(orgSlug, quote.id, link) },
      })
    },
    [orgSlug, quote],
  )

  const chooseFiles = useCallback(
    (chosen: FileList | null): void => {
      if (!chosen || chosen.length === 0) return
      setFileWhy(null)
      setFileDid(null)
      void (async () => {
        const kept: DealFile[] = []
        let firstNote: string | null = null
        /* ONE AT A TIME, deliberately. `filePlan` counts what the
           deal already holds, and three parallel writes would each
           read the same count and all three would pass a cap of
           one. */
        for (const f of Array.from(chosen)) {
          const put = await putFile(orgSlug, quote.id, f, who)
          if (!put.ok) {
            /* THE FIRST REFUSAL STOPS THE RUN. Attaching four files
               and being told about the third while the fourth
               silently did not happen is worse than being told once
               and choosing again. */
            setFileWhy(put.why)
            break
          }
          kept.push(put.file)
          firstNote ??= put.note
        }
        /* WHAT WAS DONE, AND TO HOW MANY. One file gets its own
           sentence; several get a count, because five copies of
           "stored exactly as it is" is five lines saying one thing. */
        setFileDid(
          kept.length === 0
            ? null
            : kept.length === 1
              ? firstNote
              : `${kept.length} files were stored exactly as they are, ${sizeSay(
                  kept.reduce((n, f) => n + f.size, 0),
                )} altogether. The copies on your disk are untouched.`,
        )
        again()
        if (kept.length === 0) return
        say({
          text:
            kept.length === 1
              ? `${kept[0].name} attached to ${quote.reference}.`
              : `${kept.length} files attached to ${quote.reference}.`,
          act: {
            label: 'Undo',
            onPick: () => {
              void (async () => {
                for (const f of kept) await dropFile(f.id)
                again()
              })()
            },
          },
        })
      })()
    },
    [orgSlug, quote, who, again],
  )

  const removeFile = useCallback(
    (file: DealFile): void => {
      void (async () => {
        await dropFile(file.id)
        again()
        say({
          /* THE WHOLE ROW IS CAPTURED, not the id, so UNDO puts back
             who attached it and when. "Attach it again" would have
             been a new file with a new author. */
          text: `${file.name} removed from ${quote.reference}.`,
          act: {
            label: 'Undo',
            onPick: () => {
              void (async () => {
                await restoreFile(file)
                again()
              })()
            },
          },
        })
      })()
    },
    [quote, again],
  )

  /** HAND THE DEAL TO A JOB, OR TAKE IT BACK OFF ONE.
   *
   *  IT IS A TOAST WITH UNDO LIKE EVERY OTHER ACT ON THIS DESK,
   *  and that is not a formality here: a change of ownership made
   *  silently is the one act on this screen a person could make by
   *  brushing a dropdown and never find out about. `Board.tsx`
   *  already argues that a stage move must announce itself; an
   *  owner change is the same class of fact and the same rule 9
   *  applies to it.
   *
   *  UNDO REMOVES THE HANDOVER rather than writing a second one
   *  pointing back — see `withoutHandover`. It puts the trail back
   *  exactly as it was found, which is the only thing an Undo on a
   *  record can honestly mean. */
  const assign = useCallback(
    (roleId: string): void => {
      const to = roleId === NOBODY ? null : roleId
      /* A PRESS THAT CHANGES NOTHING SAYS NOTHING. Picking the row
         that is already ticked is a normal thing to do in a
         dropdown, and a toast reporting it would put an entry in
         the activity log for an act that did not happen. */
      if (ownerOf(owners, quote.id) === to) return
      const h = composeHandover(orgSlug, quote.id, to)
      const kept = saveHandover(orgSlug, quote.id, h)
      const said = handoverToast(h, roles, quote.reference, quote.customer.name)
      say({
        /* WHAT A REFRESH WILL ACTUALLY SHOW, named rather than left
           as "it failed" — the shape `addLink` uses one act up, and
           the sentence a person needs: a deal they have just given
           away is about to be back on the desk it came off. */
        text: kept
          ? said
          : `${said} This browser refused to store it, so it will be back with ${roleWord(
              h.from,
              roles,
            )} after a refresh.`,
        act: { label: 'Undo', onPick: () => dropHandover(orgSlug, quote.id, h.id) },
      })
    },
    [orgSlug, owners, quote, roles],
  )

  return {
    notes,
    links,
    files,
    filesReady,
    arrived: arrivedAt(quote, at, since),
    note: {
      text,
      setText: (v: string) => {
        setText(v)
        if (noteWhy) setNoteWhy(null)
      },
      why: noteWhy,
      unkept,
      add: addNote,
    },
    link: {
      why: linkWhy,
      clearWhy: () => setLinkWhy(null),
      add: addLink,
      drop: removeLink,
    },
    file: { why: fileWhy, did: fileDid, choose: chooseFiles, drop: removeFile },
    owner: {
      /* THE PICKER'S VALUE IS THE STORED ID, NOT THE RESOLVED ROLE.
         A deal standing on a role that has since been deleted shows
         `Nobody` — `ownerInForce` refuses to name it — and picking
         a real job from there is a normal reassignment rather than
         a repair somebody has to know about. */
      at: ownerInForce(owners, quote.id, roles)?.id ?? NOBODY,
      role: ownerInForce(owners, quote.id, roles),
      roles,
      trail: handoversFor(owners, quote.id),
      why: whyNotOwner(roles),
      assign,
    },
  }
}
