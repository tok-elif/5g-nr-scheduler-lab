import { useMemo, useState, type KeyboardEvent } from 'react'
import type { TimeAllocationCell, TimeAllocationView } from '../../viewModels/timeAllocationViewModel'
import { allocationDetailRows } from './allocationPresentation'
import { FloatingInfoCard } from './FloatingInfoCard'
import { positionFloatingCard, type FloatingCardPosition } from './floatingCardPosition'
import './NrTimeOverview.css'

const FALLBACK_PALETTE = [
  '#2563eb', '#0f766e', '#c2410c', '#7c3aed', '#be123c',
  '#0369a1', '#4d7c0f', '#b45309', '#4338ca', '#0e7490',
]

function colorForCell(cell: TimeAllocationCell, colors: ReadonlyMap<string, string>) {
  if (cell.label && colors.has(cell.label)) return colors.get(cell.label) as string
  if (cell.ueId === null) return '#cbd5e1'
  return FALLBACK_PALETTE[cell.ueId % FALLBACK_PALETTE.length]
}

interface FrameGroup {
  readonly frameIndex: number
  readonly subframes: readonly {
    readonly subframeInFrame: number
    readonly cells: readonly TimeAllocationCell[]
  }[]
}

function groupByFrame(cells: readonly TimeAllocationCell[]): FrameGroup[] {
  const frames = new Map<number, Map<number, TimeAllocationCell[]>>()

  for (const cell of cells) {
    const frame = frames.get(cell.time.frameIndex) ?? new Map<number, TimeAllocationCell[]>()
    const subframe = frame.get(cell.time.subframeInFrame) ?? []
    subframe.push(cell)
    frame.set(cell.time.subframeInFrame, subframe)
    frames.set(cell.time.frameIndex, frame)
  }

  return [...frames.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([frameIndex, subframes]) => ({
      frameIndex,
      subframes: [...subframes.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([subframeInFrame, subframeCells]) => ({
          subframeInFrame,
          cells: subframeCells,
        })),
    }))
}

export interface NrTimeOverviewProps {
  readonly view: TimeAllocationView
  readonly selectedSlot: number | null
  readonly onSelect: (globalSlotIndex: number) => void
}

export function NrTimeOverview({ view, selectedSlot, onSelect }: NrTimeOverviewProps) {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<FloatingCardPosition | null>(null)

  const frames = useMemo(() => groupByFrame(view.cells), [view.cells])
  const colors = useMemo(
    () => new Map(view.legend.filter((entry) => entry.color).map((entry) => [entry.key, entry.color as string])),
    [view.legend],
  )
  const inspectedCell = view.cells.find((cell) => cell.globalSlotIndex === hoveredSlot) ?? null

  const show = (target: HTMLElement, index: number) => {
    setHoveredSlot(index)
    setTooltipPosition(positionFloatingCard(target, view.cells[0]?.kind === 'm2' ? 320 : 250))
  }

  const hide = () => {
    setHoveredSlot(null)
    setTooltipPosition(null)
  }

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      onSelect(index)
    }
  }

  return (
    <div className="nr-time-overview" data-density={view.density}>
      <div className="nr-time-legend" role="list" aria-label="Slot renk açıklaması">
        {view.legend.map((entry) => (
          <span className="nr-time-legend-item" role="listitem" key={entry.key}>
            <i
              style={{ background: entry.color ?? (entry.key === 'selected' ? 'transparent' : undefined) }}
              className={entry.key === 'selected' ? 'nr-legend-selected' : undefined}
              aria-hidden="true"
            />
            <span>{entry.label}</span>
          </span>
        ))}
      </div>

      <FloatingInfoCard
        id="nr-time-tooltip"
        position={tooltipPosition}
        title={inspectedCell ? `Slot ${inspectedCell.globalSlotIndex + 1}` : ''}
      >
        {inspectedCell && (
          <>
            <dl>
              {inspectedCell.tooltipRows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            {inspectedCell.kind === 'm2' && inspectedCell.allocations.length > 0 && (
              <div className="floating-card-allocations">
                {inspectedCell.allocations.map((allocation) => (
                  <span key={allocation.ueIndex ?? allocation.ueId}>
                    {allocationDetailRows(allocation)
                      .map((row) => `${row.label}: ${row.value}`)
                      .join(' · ')}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </FloatingInfoCard>

      <div className="nr-time-frames">
        {frames.map((frame) => {
          const frameSlotCount = frame.subframes.reduce((sum, subframe) => sum + subframe.cells.length, 0)

          return (
            <section className="nr-frame" key={frame.frameIndex} aria-label={`Frame ${frame.frameIndex}`}>
              <header className="nr-frame-header">
                <div className="nr-frame-heading">
                  <span className="nr-frame-index">F{frame.frameIndex}</span>
                  <div>
                    <strong>Frame {frame.frameIndex}</strong>
                    <span>Zaman–frekans tahsis görünümü</span>
                  </div>
                </div>
                <div className="nr-frame-meta">
                  <span>{frame.subframes.length} subframe</span>
                  <span>{frameSlotCount} slot</span>
                </div>
              </header>

              <div className="nr-subframes">
                {frame.subframes.map((subframe) => (
                  <article className="nr-subframe" key={subframe.subframeInFrame}>
                    <header className="nr-subframe-header">
                      <span>Subframe</span>
                      <strong>{subframe.subframeInFrame}</strong>
                    </header>

                    <div className="nr-slot-row">
                      {subframe.cells.map((cell) => {
                        const selected = cell.globalSlotIndex === selectedSlot
                        return (
                          <div className="nr-slot-wrap" key={cell.globalSlotIndex}>
                            <button
                              type="button"
                              className={`nr-slot${selected ? ' selected' : ''} status-${cell.status}`}
                              style={{ '--slot-color': colorForCell(cell, colors) } as React.CSSProperties}
                              aria-selected={selected}
                              aria-label={`Slot ${cell.globalSlotIndex + 1}${cell.label ? `, ${cell.label}` : ''}`}
                              aria-describedby="nr-time-tooltip"
                              data-slot={cell.globalSlotIndex}
                              data-status={cell.status}
                              onClick={() => onSelect(cell.globalSlotIndex)}
                              onMouseEnter={(event) => show(event.currentTarget, cell.globalSlotIndex)}
                              onMouseLeave={hide}
                              onFocus={(event) => show(event.currentTarget, cell.globalSlotIndex)}
                              onBlur={hide}
                              onKeyDown={(event) => handleKey(event, cell.globalSlotIndex)}
                            >
                              <span className="nr-slot-number">S{cell.globalSlotIndex + 1}</span>
                              {view.density !== 'color' && cell.label ? (
                                <span className="nr-slot-label">
                                  {view.density === 'label' ? cell.label : cell.label.replace(/^U/, '')}
                                </span>
                              ) : null}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
