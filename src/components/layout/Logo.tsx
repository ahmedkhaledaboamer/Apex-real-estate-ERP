import logoMarkUrl from '@/assets/logo-mark-hd.webp'
import { cn } from '@/lib/cn'

/**
 * The glossy Apex Aora infinity mark (cut from the original brand artwork, transparent background).
 * `size` is the mark's height; its width follows the artwork's 2.39 : 1 ratio.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const h = Math.round(size * 0.62)
  const w = Math.round(h * 2.39)
  return (
    <span className={cn('grid shrink-0 place-items-center', className)} style={{ minWidth: w, height: size }}>
      <img src={logoMarkUrl} alt="" width={w} height={h} decoding="async" className="block select-none" style={{ width: w, height: h }} draggable={false} />
    </span>
  )
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={collapsed ? 34 : 38} />
      {!collapsed && (
        <span className="leading-none">
          <span className="block font-display text-[21px] font-semibold tracking-[0.01em] text-white">Apex Aora</span>
          <span className="mt-1 block text-[9.5px] font-semibold tracking-[0.28em] text-white/50">REAL ESTATE · ERP</span>
        </span>
      )}
    </span>
  )
}
