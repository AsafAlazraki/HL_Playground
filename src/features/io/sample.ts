/* ============================================================
   io/sample — the bundled marine-dealership demo project.
   `buildSampleProject()` is a pure builder (no store access);
   `loadSampleProject()` applies it via the store.
   ============================================================ */

import { newId, nowIso } from '@/lib/id'
import type {
  CellValue,
  EntityDef,
  FieldDef,
  FieldType,
  GroupDef,
  RowData,
  RuleDef,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { keepingOrganisation } from './apply'

export interface SampleProject {
  name: string
  entities: EntityDef[]
  groups: GroupDef[]
  rules: RuleDef[]
  rowsByEntity: Record<string, RowData[]>
}

const field = (
  id: string,
  name: string,
  type: FieldType,
  extra?: Partial<Omit<FieldDef, 'id' | 'name' | 'type'>>,
): FieldDef => ({ id, name, type, ...extra })

export function buildSampleProject(): SampleProject {
  const stamp = nowIso()
  /** rows get millisecond-staggered createdAt so insertion order survives
   *  the store's createdAt sort on reload */
  const base = Date.now()
  let tick = 0
  const nextStamp = (): string => new Date(base + tick++).toISOString()

  /* ---- Boat ------------------------------------------------ */
  const boatId = newId()
  const bName = newId()
  const bModel = newId()
  const bLength = newId()
  const bPrice = newId()
  const bStock = newId()
  const bCond = newId()
  const bListed = newId()

  /* ---- Customer -------------------------------------------- */
  const customerId = newId()
  const cName = newId()
  const cEmail = newId()
  const cPhone = newId()
  const cSegment = newId()

  /* ---- Deal ------------------------------------------------ */
  const dealId = newId()
  const dRef = newId()
  const dBoat = newId()
  const dCustomer = newId()
  const dSale = newId()
  const dDiscount = newId()
  const dDeposit = newId()
  const dClose = newId()
  const dCost = newId()
  const dNet = newId()
  const dMargin = newId()

  /* ---- Service Job ----------------------------------------- */
  const jobId = newId()
  const jNo = newId()
  const jBoat = newId()
  const jDesc = newId()
  const jHours = newId()
  const jRate = newId()
  const jParts = newId()
  const jTotal = newId()
  const jStatus = newId()

  /* ---- Zone ------------------------------------------------ */
  const zoneId = newId()

  const entities: EntityDef[] = [
    {
      id: boatId,
      name: 'Boat',
      description: 'Hulls on the yard — stock, used and consignment.',
      accent: 'blue',
      displayFieldId: bName,
      position: { x: 120, y: 130 },
      fields: [
        field(bName, 'Name', 'text', { required: true }),
        field(bModel, 'Model', 'text'),
        field(bLength, 'Length ft', 'number'),
        field(bPrice, 'Price', 'number'),
        field(bStock, 'In Stock', 'boolean'),
        field(bCond, 'Condition', 'select', { options: ['New', 'Used', 'Consignment'] }),
        field(bListed, 'Listed On', 'date'),
      ],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: customerId,
      name: 'Customer',
      description: 'Buyers on the books — retail, trade and VIP.',
      accent: 'viridian',
      displayFieldId: cName,
      position: { x: 860, y: 150 },
      groupId: zoneId,
      fields: [
        field(cName, 'Name', 'text', { required: true }),
        field(cEmail, 'Email', 'text'),
        field(cPhone, 'Phone', 'text'),
        field(cSegment, 'Segment', 'select', { options: ['Retail', 'Trade', 'VIP'] }),
      ],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: dealId,
      name: 'Deal',
      description: 'A boat sold to a customer — pricing worked on-sheet.',
      accent: 'carmine',
      displayFieldId: dRef,
      position: { x: 860, y: 430 },
      groupId: zoneId,
      fields: [
        field(dRef, 'Deal Ref', 'text', { required: true }),
        field(dBoat, 'Boat', 'reference', { refEntityId: boatId }),
        field(dCustomer, 'Customer', 'reference', { refEntityId: customerId }),
        field(dSale, 'Sale Price', 'number'),
        field(dDiscount, 'Discount %', 'number'),
        field(dDeposit, 'Deposit Paid', 'boolean'),
        field(dClose, 'Close Date', 'date'),
        field(dCost, 'Cost', 'number'),
        field(dNet, 'Net Price', 'formula', {
          formula: '[Sale Price] * (1 - [Discount %] / 100)',
        }),
        field(dMargin, 'Margin', 'formula', { formula: '[Net Price] - [Cost]' }),
      ],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: jobId,
      name: 'Service Job',
      description: 'Workshop jobs against hulls — labour, parts, totals.',
      accent: 'ochre',
      displayFieldId: jNo,
      position: { x: 160, y: 560 },
      fields: [
        field(jNo, 'Job No', 'text', { required: true }),
        field(jBoat, 'Boat', 'reference', { refEntityId: boatId }),
        field(jDesc, 'Description', 'text'),
        field(jHours, 'Hours', 'number'),
        field(jRate, 'Rate', 'number'),
        field(jParts, 'Parts', 'number'),
        field(jTotal, 'Total', 'formula', { formula: '[Hours] * [Rate] + [Parts]' }),
        field(jStatus, 'Status', 'select', { options: ['Booked', 'In Progress', 'Done'] }),
      ],
      createdAt: stamp,
      updatedAt: stamp,
    },
  ]

  const groups: GroupDef[] = [
    {
      id: zoneId,
      name: 'SALES PIPELINE',
      accent: 'violet',
      position: { x: 790, y: 70 },
      size: { w: 620, h: 730 },
    },
  ]

  /* ---- rows ------------------------------------------------ */
  const row = (
    entityId: string,
    id: string,
    values: Record<string, CellValue>,
  ): RowData => {
    const at = nextStamp()
    return { id, entityId, values, createdAt: at, updatedAt: at }
  }

  const boat1 = newId()
  const boat2 = newId()
  const boat3 = newId()
  const cust1 = newId()
  const cust2 = newId()
  const cust3 = newId()

  const rowsByEntity: Record<string, RowData[]> = {
    [boatId]: [
      row(boatId, boat1, {
        [bName]: 'Quintrex 481 Fishabout',
        [bModel]: '481 Fishabout Pro',
        [bLength]: 15.8,
        [bPrice]: 52990,
        [bStock]: true,
        [bCond]: 'New',
        [bListed]: '2026-05-12',
      }),
      row(boatId, boat2, {
        [bName]: 'Stacer 429 Seaway',
        [bModel]: '429 Seaway',
        [bLength]: 14.1,
        [bPrice]: 38500,
        [bStock]: true,
        [bCond]: 'Used',
        [bListed]: '2026-04-03',
      }),
      row(boatId, boat3, {
        [bName]: 'Riviera 445 SUV',
        [bModel]: '445 SUV',
        [bLength]: 44.6,
        [bPrice]: 1235000,
        [bStock]: false,
        [bCond]: 'Consignment',
        [bListed]: '2026-06-21',
      }),
    ],
    [customerId]: [
      row(customerId, cust1, {
        [cName]: 'Marina Calloway',
        [cEmail]: 'marina.calloway@outlook.com',
        [cPhone]: '0412 336 208',
        [cSegment]: 'VIP',
      }),
      row(customerId, cust2, {
        [cName]: 'Dean Okafor',
        [cEmail]: 'dean.okafor@gmail.com',
        [cPhone]: '0401 887 512',
        [cSegment]: 'Retail',
      }),
      row(customerId, cust3, {
        [cName]: 'Harbourline Charters',
        [cEmail]: 'ops@harbourline.com.au',
        [cPhone]: '07 3856 1122',
        [cSegment]: 'Trade',
      }),
    ],
    [dealId]: [
      row(dealId, newId(), {
        [dRef]: 'DL-2026-014',
        [dBoat]: boat1,
        [dCustomer]: cust1,
        [dSale]: 52990,
        [dDiscount]: 7.5,
        [dDeposit]: true,
        [dClose]: '2026-07-18',
        [dCost]: 41200,
      }),
      row(dealId, newId(), {
        [dRef]: 'DL-2026-019',
        [dBoat]: boat3,
        [dCustomer]: cust3,
        [dSale]: 1235000,
        [dDiscount]: 12,
        [dDeposit]: false,
        [dClose]: '2026-08-29',
        [dCost]: 998000,
      }),
    ],
    [jobId]: [
      row(jobId, newId(), {
        [jNo]: 'SJ-1042',
        [jBoat]: boat2,
        [jDesc]: '100-hour service, gearbox oil + impeller',
        [jHours]: 6.5,
        [jRate]: 128,
        [jParts]: 342.5,
        [jStatus]: 'Done',
      }),
      row(jobId, newId(), {
        [jNo]: 'SJ-1057',
        [jBoat]: boat1,
        [jDesc]: 'Fit dual-battery system with isolator',
        [jHours]: 4,
        [jRate]: 128,
        [jParts]: 519.5,
        [jStatus]: 'In Progress',
      }),
    ],
  }

  return {
    name: 'Northside Marine — Demo',
    entities,
    groups,
    rules: [],
    rowsByEntity,
  }
}

/** Builds the sample and applies it wholesale (replaces current project).
 *  Wrapped so the organisation survives the swap — without it the whole
 *  app would drop back to onboarding the moment this loads. */
export function loadSampleProject(): void {
  const sample = buildSampleProject()
  keepingOrganisation(() => {
    useProjectStore.getState().replaceProject({
      name: sample.name,
      entities: sample.entities,
      groups: sample.groups,
      rules: sample.rules,
      rowsByEntity: sample.rowsByEntity,
    })
  })
}
