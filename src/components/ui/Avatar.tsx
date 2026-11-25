import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

/** Photo avatar when `photo` is given (brokers have real photos), otherwise initials tinted by a stable hue. */
export function Avatar({ name, hue = 280, photo, size = 32, className }: { name: string; hue?: number; photo?: string; size?: number; className?: string }) {
  if (photo)
    return (
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        title={name}
        className={cn('inline-block shrink-0 rounded-full object-cover ring-2 ring-surface', className)}
        style={{ width: size, height: size }}
      />
    )
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-surface select-none', className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.38),
        background: `linear-gradient(135deg, hsl(${hue} 55% 52%), hsl(${(hue + 40) % 360} 60% 40%))`,
      }}
      title={name}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ people, max = 4, size = 28 }: { people: { name: string; avatarHue?: number; photo?: string }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <Avatar key={i} name={p.name} hue={p.avatarHue} photo={p.photo} size={size} />
      ))}
      {rest > 0 && (
        <span className="inline-grid place-items-center rounded-full bg-surface-2 font-semibold text-muted ring-2 ring-surface" style={{ width: size, height: size, fontSize: size * 0.36 }}>
          +{rest}
        </span>
      )}
    </div>
  )
}

/** Avatar + name (+ optional secondary line). */
export function PersonCell({ name, hue, photo, sub, size = 32 }: { name: string; hue?: number; photo?: string; sub?: string; size?: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} hue={hue} photo={photo} size={size} />
      <div className="min-w-0">
        <div className="truncate font-semibold">{name}</div>
        {sub && <div className="truncate text-[12px] text-muted">{sub}</div>}
      </div>
    </div>
  )
}
