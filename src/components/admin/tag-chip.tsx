import { getTagColor } from '@/lib/tag-colors'
import { cn } from '@/lib/utils'

type Tag = { id: string; name: string; color: string }

export function TagChip({ tag, className }: { tag: Tag; className?: string }) {
  const c = getTagColor(tag.color)
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)} style={c.chipStyle}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={c.dotStyle} />
      {tag.name}
    </span>
  )
}
