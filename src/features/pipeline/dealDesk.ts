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

import { useCallback, useEffect, useState } from 'react'
import { currentUser } from '@/features/auth'
import { sizeSay } from '@/features/modules'
import { say } from '@/store/notes'
import type { QuoteDef } from '@/features/quote'
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
}

export function useDealDesk(orgSlug: string, quote: QuoteDef): DealDesk {
  const notes = useDealNotes(orgSlug)
  const links = useDealLinks(orgSlug)
  const { list: files, again, ready: filesReady } = useDealFiles(orgSlug, quote.id)
  const at = useStages(orgSlug)
  const since = useSince(orgSlug)

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
  }
}
