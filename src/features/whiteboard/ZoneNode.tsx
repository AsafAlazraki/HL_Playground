import { memo } from 'react'
import type { CSSProperties } from 'react'
import { NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentBrightVar } from './useDerivedGraph'
import type { ZoneFlowNode } from './useDerivedGraph'

function ZoneNodeImpl({ id, data, selected }: NodeProps<ZoneFlowNode>) {
  const updateGroup = useProjectStore((s) => s.updateGroup)
  const { group, memberCount } = data
  const style = {
    /* zone strokes/labels sit ON the navy sheet — bright accent variants */
    '--wb-accent': accentBrightVar(group.accent),
    '--wb-tick': accentBrightVar(group.accent),
  } as CSSProperties

  return (
    <div
      className={`wb-zone${selected ? ' wb-zone--selected' : ''}`}
      style={style}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={240}
        minHeight={160}
        lineClassName="wb-rs-line"
        handleClassName="wb-rs-handle"
        onResizeEnd={(_event, p) =>
          updateGroup(id, {
            position: { x: p.x, y: p.y },
            size: { w: p.width, h: p.height },
          })
        }
      />

      <i className="wb-tick wb-tick--tl" aria-hidden="true" />
      <i className="wb-tick wb-tick--tr" aria-hidden="true" />
      <i className="wb-tick wb-tick--bl" aria-hidden="true" />
      <i className="wb-tick wb-tick--br" aria-hidden="true" />

      <span className="wb-zone-name mono-label" title={group.name}>
        {group.name}
      </span>
      <span className="wb-zone-count mono-label">
        {memberCount === 0
          ? 'Empty zone'
          : `${memberCount} entit${memberCount === 1 ? 'y' : 'ies'}`}
      </span>
    </div>
  )
}

/* A frame draws its name, its member count and its resize handles —
   nothing that depends on where it sits, so the positional props React
   Flow hands it on every drag frame are ignored here. */
const sameZoneProps = (
  a: NodeProps<ZoneFlowNode>,
  b: NodeProps<ZoneFlowNode>,
): boolean =>
  a.id === b.id && a.data === b.data && a.selected === b.selected

export const ZoneNode = memo(ZoneNodeImpl, sameZoneProps)
