/* ============================================================
   useColumnCommands — everything the header row can do to a column,
   performed against ONE table.

   Shared verbatim by the register on the sheet and the full-window
   lens, so "click the heading to rename it" means the same thing in
   both places. Every write goes through the project store's own
   `addField` / `updateField` / `removeField`; nothing here reaches
   into entity state directly.
   ============================================================ */
import { useCallback, useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  UID_FIELD,
  type EntityDef,
  type FieldDef,
  type FieldType,
} from '@/types/model'
import type { ToastTone } from './Toasts'
import { byCreatedAt } from './helpers'
import { untitledColumnName } from './columnKinds'

export interface NewColumn {
  name: string
  type: FieldType
  /** Choice: the list the user wrote */
  options?: string[]
  /** Link: the table it points at */
  refEntityId?: string
  /** Calculated: the expression */
  formula?: string
  /** the band it joins. A new column is appended at the far right, so
   *  the band it lands IN is the band of the columns it lands NEXT TO
   *  — saying so is what stops it arriving as an orphan stripe under
   *  a header that does not cover it. Absent = in no band. */
  sectionId?: string
}

export interface LinkTarget {
  id: string
  name: string
}

export interface ColumnCommands {
  /** other tables this one could link to, in board order */
  linkTargets: LinkTarget[]
  /** a name a new column can safely take */
  suggestName: () => string
  addColumn: (spec: NewColumn) => FieldDef | null
  renameColumn: (fieldId: string, name: string) => void
  removeColumn: (fieldId: string) => void
  setOptions: (fieldId: string, options: string[]) => void
}

/** A column name must be unique within its table and can never be the
 *  system identifier's — otherwise two headings read the same and the
 *  register stops being trustworthy. */
function nameTrouble(
  entity: EntityDef | undefined,
  name: string,
  selfId?: string,
): string | null {
  const want = name.trim()
  if (want === '') return 'Give the column a name first'
  if (want.toLowerCase() === UID_FIELD.name.toLowerCase()) {
    return `${UID_FIELD.name} is the row’s permanent identifier — pick another name`
  }
  const clash = entity?.fields.some(
    (f) => f.id !== selfId && f.name.trim().toLowerCase() === want.toLowerCase(),
  )
  return clash ? `This table already has a “${want}” column` : null
}

/* ============================================================
   A BAND IS A RUN OF CONSECUTIVE COLUMNS — that is the whole rule
   (`sections.ts`). So a column that JOINS a band has to be put where
   that band actually is, or the sheet draws the same name twice with
   other columns in between and folding one folds both.

   The store moves a column one place at a time, which is all it needs
   to: walk the new column left until it sits at the end of its band's
   run. A brand-new column has no data, so nothing can be disturbed by
   the walk. Bounded, because an unbounded loop over store state is a
   hang waiting for a bad id.
   ============================================================ */
function moveIntoSection(
  entityId: string,
  fieldId: string,
  sectionId: string,
  move: (entityId: string, fieldId: string, dir: -1 | 1) => void,
  read: () => EntityDef | undefined,
): void {
  for (let guard = 0; guard < 256; guard += 1) {
    const fields = read()?.fields
    if (!fields) return
    const at = fields.findIndex((f) => f.id === fieldId)
    if (at < 0) return
    /* the last column of the band, ignoring the traveller itself */
    let last = -1
    for (let i = 0; i < fields.length; i += 1) {
      if (i !== at && fields[i].sectionId === sectionId) last = i
    }
    if (last < 0) return
    const target = last < at ? last + 1 : last
    if (at === target) return
    move(entityId, fieldId, at > target ? -1 : 1)
  }
}

export function useColumnCommands(
  entityId: string,
  pushToast: (text: string, tone?: ToastTone) => void,
): ColumnCommands {
  const entities = useProjectStore((s) => s.entities)
  const addField = useProjectStore((s) => s.addField)
  const updateField = useProjectStore((s) => s.updateField)
  const removeField = useProjectStore((s) => s.removeField)
  const moveField = useProjectStore((s) => s.moveField)

  const entity = entities[entityId] as EntityDef | undefined

  const linkTargets = useMemo<LinkTarget[]>(
    () =>
      Object.values(entities)
        .filter((e) => e.id !== entityId)
        .sort(byCreatedAt)
        .map((e) => ({ id: e.id, name: e.name })),
    [entities, entityId],
  )

  const suggestName = useCallback(
    () => untitledColumnName((entity?.fields ?? []).map((f) => f.name)),
    [entity],
  )

  const addColumn = useCallback(
    (spec: NewColumn): FieldDef | null => {
      const trouble = nameTrouble(entity, spec.name)
      if (trouble) {
        pushToast(trouble, 'warn')
        return null
      }
      const partial: Partial<Omit<FieldDef, 'id'>> = {
        name: spec.name.trim(),
        type: spec.type,
      }
      if (spec.type === 'select') partial.options = spec.options ?? []
      if (spec.type === 'reference') partial.refEntityId = spec.refEntityId
      if (spec.type === 'formula') partial.formula = spec.formula ?? ''
      /* only a band this table actually declares — a stray id would
         put the column under a header nobody can see or fold */
      const band =
        spec.sectionId !== undefined &&
        entity?.sections?.some((s) => s.id === spec.sectionId)
          ? spec.sectionId
          : undefined
      if (band !== undefined) partial.sectionId = band
      const created = addField(entityId, partial)
      if (created && band !== undefined) {
        moveIntoSection(entityId, created.id, band, moveField, () =>
          useProjectStore.getState().entities[entityId],
        )
      }
      if (created) {
        const name = entity?.sections?.find((s) => s.id === band)?.name
        pushToast(name ? `“${created.name}” added to ${name}` : `“${created.name}” added`)
      }
      return created
    },
    [entity, entityId, addField, moveField, pushToast],
  )

  const renameColumn = useCallback(
    (fieldId: string, name: string) => {
      const current = entity?.fields.find((f) => f.id === fieldId)
      if (!current) return
      const want = name.trim()
      if (want === current.name) return
      const trouble = nameTrouble(entity, want, fieldId)
      if (trouble) {
        pushToast(trouble, 'warn')
        return
      }
      updateField(entityId, fieldId, { name: want })
    },
    [entity, entityId, updateField, pushToast],
  )

  const removeColumn = useCallback(
    (fieldId: string) => {
      const gone = entity?.fields.find((f) => f.id === fieldId)
      if (!gone) return
      removeField(entityId, fieldId)
      pushToast(`“${gone.name}” removed`, 'warn')
    },
    [entity, entityId, removeField, pushToast],
  )

  const setOptions = useCallback(
    (fieldId: string, options: string[]) => {
      updateField(entityId, fieldId, { options })
    },
    [entityId, updateField],
  )

  return { linkTargets, suggestName, addColumn, renameColumn, removeColumn, setOptions }
}
