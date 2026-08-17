/* ============================================================
   WINDOW KIT — what a window IS, where it opens, what it is
   called, and what it draws.

   Kept out of Shell.tsx so the shell stays a shell: it owns the
   stack and the focus order, and everything about an individual
   window's identity lives here.
   ============================================================ */

import type { ReactNode } from 'react'
import type { EntityDef } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import { HomeStage } from './HomeStage'
import { TableStage } from './TableStage'
import { ViewStage } from './ViewStage'
import { DesignStage } from './DesignStage'
import { RulesStage } from './RulesStage'
import { FlowStage } from './FlowStage'
import { QuoteStage } from './QuoteStage'
import { ModuleStage } from './ModuleStage'

/** Everything that can be a window. */
export type Stage =
  | { kind: 'home' }
  | { kind: 'table'; entityId: string }
  | { kind: 'view'; entityId: string }
  | { kind: 'design'; entityId: string }
  | { kind: 'rules' }
  | { kind: 'flow' }
  | { kind: 'quote'; quoteId: string | null }
  | { kind: 'module'; moduleId: string | null }

export interface WinFrame {
  x: number
  y: number
  w: number
  h: number
}

export interface Win {
  id: string
  stage: Stage
  frame: WinFrame
  zoomed: boolean
  mini: boolean
}

/** ONE WINDOW PER SUBJECT. Two presses on Boats raise the window
 *  that is already open rather than making a second one. */
export const winKey = (s: Stage): string =>
  'entityId' in s
    ? `${s.kind}:${s.entityId}`
    : s.kind === 'quote'
      ? `quote:${s.quoteId ?? 'list'}`
      : s.kind === 'module'
        ? `module:${s.moduleId ?? 'dash'}`
        : s.kind

/** CASCADE, like every OS. Each new window lands down and right of
 *  the last so the one underneath is still visibly there, and the
 *  run wraps before it walks off the screen. */
export function bestFrame(n: number): WinFrame {
  const step = 28
  const i = n % 6
  const w = Math.min(1180, Math.max(760, Math.round(window.innerWidth * 0.72)))
  const h = Math.min(760, Math.max(460, Math.round(window.innerHeight * 0.7)))
  const x = Math.round((window.innerWidth - w) / 2) + i * step - 40
  const y = 56 + i * step
  return { x: Math.max(8, x), y, w, h }
}

/** What the titlebar says. A window is named for its subject. */
export function winTitle(s: Stage, entities: Record<string, EntityDef>): ReactNode {
  if (s.kind === 'home') return 'Home'
  if (s.kind === 'rules') return 'Business rules'
  if (s.kind === 'flow') return 'What fits what'
  if (s.kind === 'quote') return s.quoteId ? 'Quote' : 'Quotes'
  if (s.kind === 'module') return s.moduleId ? 'Module' : 'Dashboard'
  const e = entities[s.entityId]
  if (!e) return 'Table'
  const mark = <TableKindSymbol kind={kindOf(e.kind)} size={ICON_SIZE.tiny} />
  if (s.kind === 'design')
    return (
      <>
        {mark}
        {e.name} — Columns
      </>
    )
  if (s.kind === 'view')
    return (
      <>
        {mark}
        {e.name} — What goes with each one
      </>
    )
  return (
    <>
      {mark}
      {e.name}
    </>
  )
}

export interface StageHandlers {
  openWin: (s: Stage) => void
  close: () => void
}

/** What a window draws. Every stage is mounted exactly as it was —
 *  the window supplies the frame, so none of them changed. */
export function renderStage(s: Stage, h: StageHandlers): ReactNode {
  switch (s.kind) {
    case 'home':
      return <HomeStage onOpenTable={(id) => h.openWin({ kind: 'table', entityId: id })} />
    case 'table':
      return (
        <TableStage
          entityId={s.entityId}
          onClose={h.close}
          onOpenView={(id) => h.openWin({ kind: 'view', entityId: id })}
          onOpenDesign={(id) => h.openWin({ kind: 'design', entityId: id })}
        />
      )
    case 'view':
      return (
        <ViewStage
          entityId={s.entityId}
          onQuote={(quoteId) => h.openWin({ kind: 'quote', quoteId })}
          onClose={h.close}
        />
      )
    case 'design':
      return <DesignStage entityId={s.entityId} onClose={h.close} />
    case 'rules':
      return <RulesStage onClose={h.close} />
    case 'flow':
      return <FlowStage onClose={h.close} />
    case 'quote':
      return (
        <QuoteStage
          quoteId={s.quoteId}
          onOpen={(quoteId) => h.openWin({ kind: 'quote', quoteId })}
          onClose={h.close}
        />
      )
    case 'module':
      return (
        <ModuleStage
          moduleId={s.moduleId}
          onOpen={(moduleId) => h.openWin({ kind: 'module', moduleId })}
          onClose={h.close}
        />
      )
  }
}
