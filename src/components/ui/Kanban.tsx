import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface KanbanColumn<S extends string> {
  id: S
  title: string
  /** Tailwind bg class for the column dot, e.g. 'bg-info' */
  dot: string
  /** Optional footer/summary under the title (e.g. total value). */
  summary?: (count: number) => ReactNode
}

/**
 * Drag-and-drop board (native HTML5 DnD, no library). Cards move between columns;
 * `onMove(id, toColumn)` persists the change (use the resource's optimistic `useUpdate`).
 */
export function Kanban<T extends { id: string }, S extends string>({
  columns,
  items,
  getColumn,
  onMove,
  renderCard,
  columnSummary,
  onCardClick,
}: {
  columns: KanbanColumn<S>[]
  items: T[]
  getColumn: (item: T) => S
  onMove: (id: string, to: S) => void
  renderCard: (item: T) => ReactNode
  columnSummary?: (items: T[]) => ReactNode
  onCardClick?: (item: T) => void
}) {
  const [over, setOver] = useState<S | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  return (
    <div className="-mx-1 flex items-start gap-4 overflow-x-auto px-1 pb-3">
      {columns.map((col) => {
        const list = items.filter((i) => getColumn(i) === col.id)
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.id)
            }}
            onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain')
              setOver(null)
              setDragging(null)
              const item = items.find((i) => i.id === id)
              if (item && getColumn(item) !== col.id) onMove(id, col.id)
            }}
            className={cn('flex min-w-[260px] flex-1 basis-0 flex-col rounded-card border border-line bg-surface-2/50 transition-colors duration-150', over === col.id && 'border-aura/50 bg-aura/5')}
          >
            <div className="flex items-center justify-between gap-2 px-3.5 pt-3.5 pb-2">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', col.dot)} />
                <span className="text-[13px] font-semibold">{col.title}</span>
                <span className="rounded-full bg-surface px-1.5 text-[11px] font-semibold text-muted ring-1 ring-line">{list.length}</span>
              </div>
            </div>
            {columnSummary && <div className="px-3.5 pb-2 text-[12px] text-muted">{columnSummary(list)}</div>}
            <div className="flex min-h-[120px] flex-1 flex-col gap-2.5 p-2.5 pt-1">
              {list.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', item.id)
                    e.dataTransfer.effectAllowed = 'move'
                    setDragging(item.id)
                  }}
                  onDragEnd={() => setDragging(null)}
                  onClick={onCardClick ? () => onCardClick(item) : undefined}
                  className={cn(
                    'cursor-grab rounded-xl border border-line bg-surface p-3.5 shadow-soft transition-[box-shadow,opacity,border-color] duration-150 hover:border-aura/30 hover:shadow-lift active:cursor-grabbing',
                    dragging === item.id && 'opacity-50',
                  )}
                >
                  {renderCard(item)}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
