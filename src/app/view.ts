/* OFF THE DEFAULT PATH — the shell no longer holds a lens. Kept
   because `Rails.tsx` and `ViewSwitch.tsx` are typed against it. */

/** The two lenses on the same drawing.
 *  SHEET = the blueprint whiteboard. TABLE = the full-window data grid.
 *  Deliberately NOT part of the persisted store: which lens you are
 *  looking through is chrome state, not part of the drawing. */
export type ShellView = 'sheet' | 'table'
