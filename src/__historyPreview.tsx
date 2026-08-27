/* TEMPORARY — a standalone mount for HISTORY, so the two screens can
   be looked at before the shell has a door to them. Delete this file
   and history-preview.html; neither is imported by the app. Same
   arrangement as __rigPreview.tsx / __dashboardPreview.tsx next door.

   THE DATA IS THE REAL SEED, not a fixture: the Northside project is
   loaded, two customers are filed in the register the ordinary way,
   and the quotes are written against REAL boat rows with the REAL
   frozen pictures those rows carry. A preview drawn over invented
   data teaches you nothing about the screen you are about to ship —
   it is the widths, the wraps and the photographs that are being
   looked at, and all three come from the data. */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { buildNorthsideProject } from '@/demos/northside'
import { useProjectStore } from '@/store/useProjectStore'
import { addCustomer, ensureCustomerRegister, CUSTOMER_PHONE_FIELD, CUSTOMER_EMAIL_FIELD } from '@/features/crm'
import { registerQuote, type QuoteDef, type QuoteLine } from '@/features/quote'
import { HistoryStage } from '@/features/history'
import {
  displayFieldOf,
  isImageValue,
  type EntityDef,
  type ImageRef,
  type RowData,
} from '@/types/model'
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/bridge.css'

const daysAgo = (n: number, hour = 11): string => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

let n = 0
const id = (p: string): string => `${p}_${++n}`

function line(label: string, unitPrice: number | null): QuoteLine {
  return {
    id: id('line'),
    entityId: 'preview',
    rowId: id('row'),
    label,
    qty: 1,
    unitPrice,
    priceFieldId: 'f',
    priceColumnName: 'Cash',
    levelKey: 'cash',
    levelResolved: 'cash',
    levels: [],
  }
}

interface Make {
  id: string
  reference: string
  createdAt: string
  updatedAt?: string
  state?: 'draft' | 'issued'
  supersedesId?: string
  customerRow?: string
  customerName?: string
  contact?: string[]
  subject: string
  image?: ImageRef
  table: string
  row: string
  lines: QuoteLine[]
}

const quote = (m: Make): QuoteDef => ({
  id: m.id,
  reference: m.reference,
  state: m.state ?? 'draft',
  viewId: 'preview-view',
  rootTableId: m.table,
  rootRowId: m.row,
  subjectLabel: m.subject,
  subjectSpecs: [],
  ...(m.image ? { subjectImage: m.image } : {}),
  sections: [
    { blockId: 'b1', tableId: m.table, title: 'Motors', lineIds: m.lines.map((l) => l.id) },
  ],
  lines: m.lines,
  adjustments: [],
  levelKey: 'cash',
  customer: {
    name: m.customerName ?? '',
    ...(m.contact ? { contact: m.contact } : {}),
  },
  ...(m.customerRow
    ? { customerRef: { tableId: '__customers', rowId: m.customerRow } }
    : {}),
  ...(m.supersedesId ? { supersedesId: m.supersedesId } : {}),
  createdAt: m.createdAt,
  updatedAt: m.updatedAt ?? m.createdAt,
})

/** The first picture on a row, if it has one — the same address a
 *  quote would freeze. */
function shotOf(entity: EntityDef, row: RowData): ImageRef | undefined {
  for (const f of entity.fields) {
    if (f.type !== 'image') continue
    const v = row.values[f.id]
    if (isImageValue(v) && v.length > 0) return v[0]
  }
  return undefined
}

function labelOf(entity: EntityDef, row: RowData): string {
  const f = displayFieldOf(entity)
  const v = f ? row.values[f.id] : null
  return typeof v === 'string' && v !== '' ? v : `${entity.name} row`
}

function Preview(): React.ReactElement {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const seed = buildNorthsideProject()
    useProjectStore.getState().replaceProject({
      name: 'Northside Marine',
      entities: seed.entities,
      groups: seed.groups ?? [],
      rules: seed.rules ?? [],
      rowsByEntity: seed.rowsByEntity,
    })

    ensureCustomerRegister()
    const table = ensureCustomerRegister()
    const nameField = displayFieldOf(table)
    const mk = (name: string, phone: string, email: string): string => {
      const row = addCustomer({
        ...(nameField ? { [nameField.id]: name } : {}),
        [CUSTOMER_PHONE_FIELD]: phone,
        [CUSTOMER_EMAIL_FIELD]: email,
      })
      return row?.id ?? ''
    }
    const kelleher = mk('Robert Kelleher', '0400 118 442', 'rob.kelleher@example.invalid')
    const dawson = mk('Dawson Marine Services', '07 3888 1120', 'orders@example.invalid')

    /* real rows, so the widths and the photographs are real */
    const store = useProjectStore.getState()
    const boats = Object.values(store.entities).filter((e) => e.kind === 'boat')
    const pick = (which: number): { e: EntityDef; r: RowData } | null => {
      const e = boats[which % Math.max(1, boats.length)]
      if (!e) return null
      const rows = store.rowsByEntity[e.id] ?? []
      const r = rows[Math.min(rows.length - 1, 12 + which * 7)]
      return r ? { e, r } : null
    }

    const a = pick(0)
    const b = pick(1)
    const c = pick(2)

    if (a) {
      const label = labelOf(a.e, a.r)
      const img = shotOf(a.e, a.r)
      registerQuote(
        quote({
          id: 'pv_v1',
          reference: '20260810-01',
          createdAt: daysAgo(17, 9),
          state: 'issued',
          customerRow: kelleher,
          customerName: 'R Kelleher',
          contact: ['0400 118 442'],
          subject: label,
          ...(img ? { image: img } : {}),
          table: a.e.id,
          row: a.r.id,
          lines: [
            line('Yamaha F70LA', 12490),
            line('Bimini top and clears', 1980),
            line('Rigging kit', null),
          ],
        }),
      )
      registerQuote(
        quote({
          id: 'pv_v2',
          reference: '20260824-02',
          createdAt: daysAgo(3, 14),
          state: 'issued',
          supersedesId: 'pv_v1',
          customerRow: kelleher,
          customerName: 'Robert Kelleher',
          contact: ['0400 118 442'],
          subject: label,
          ...(img ? { image: img } : {}),
          table: a.e.id,
          row: a.r.id,
          lines: [line('Yamaha F90LB', 15240), line('Dunbier trailer', 6890)],
        }),
      )
    }

    if (b) {
      const img = shotOf(b.e, b.r)
      registerQuote(
        quote({
          id: 'pv_draft',
          reference: '20260827-01',
          createdAt: daysAgo(0, 8),
          updatedAt: daysAgo(0, 16),
          customerRow: dawson,
          customerName: 'Dawson Marine Services',
          contact: ['07 3888 1120'],
          subject: labelOf(b.e, b.r),
          ...(img ? { image: img } : {}),
          table: b.e.id,
          row: b.r.id,
          lines: [line('Suzuki DF60A', 10990), line('Rego and PDI', 890)],
        }),
      )
    }

    if (c) {
      const img = shotOf(c.e, c.r)
      registerQuote(
        quote({
          id: 'pv_walkin',
          reference: '20260722-03',
          createdAt: daysAgo(36, 15),
          state: 'issued',
          customerName: 'Walk-in — Trevor',
          subject: labelOf(c.e, c.r),
          ...(img ? { image: img } : {}),
          table: c.e.id,
          row: c.r.id,
          lines: [line('Mercury 115 Pro XS', 18450)],
        }),
      )
    }

    setReady(true)
  }, [])

  if (!ready) return <div />
  return (
    <div className="ds-root" style={{ height: '100dvh' }}>
      <HistoryStage onOpenQuote={(quoteId) => console.log('open quote', quoteId)} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
