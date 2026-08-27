/* ============================================================
   WHICH DOOR YOU CAME THROUGH — and the seam this stands in for.

   THE SITUATION, HONESTLY. The modules grid draws one card per
   PLACE (`places.ts`): Highfield, Yamaha, Stacer. Pressing one has
   to open its module's workspace STANDING AT THAT TABLE, or the
   header says "Boats" over a card that said "Highfield" and the
   split the grid exists for is undone on the first press.

   The shell's route carries one fact — which module — and the shell
   is not this feature's to change. `ModuleWorkspace` therefore
   takes a `place` prop, which is the seam a host should fill:

       <ModuleIndex module={m} place={tableId} … />

   Until a host does, the grid writes the table it was pressed at
   here and the workspace reads it on the way in. That is a channel
   between two components of ONE feature, mounted one after the
   other by the same gesture — not shared application state.

   THE RULES THAT KEEP IT HONEST:

     · IT IS KEYED BY MODULE. A remembered place can only ever be
       read back for the module it belongs to, so an id cannot
       survive a switch and open the wrong brand.
     · IT IS NEVER PERSISTED. Nothing about the business changes
       when somebody walks through a door; this is a position, and
       a reload starts at the module.
     · THE PROP WINS. A host that carries the fact properly is
       believed over anything remembered here.
     · IT IS CLEARED WHEN THE WHOLE MODULE IS ASKED FOR, so
       "All modules" then pressing the Boats module opens the
       module rather than the brand somebody opened an hour ago.
   ============================================================ */

/** module id → the table its workspace should open at. */
const at = new Map<string, string>()

/** The grid says which door was pressed. `undefined` means the whole
 *  module, and forgets any earlier answer for it. */
export function rememberPlace(moduleId: string, tableId: string | undefined): void {
  if (tableId === undefined) at.delete(moduleId)
  else at.set(moduleId, tableId)
}

/** Where this module's workspace should stand. */
export function placeFor(moduleId: string): string | undefined {
  return at.get(moduleId)
}

/** Drop everything — for a test, and for a project being replaced
 *  under a stage that is still mounted. */
export function forgetPlaces(): void {
  at.clear()
}
