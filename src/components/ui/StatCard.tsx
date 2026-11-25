import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/cn'
import { Card } from './Card'
import { IconTile } from './misc'

/**
 * KPI card: label, big value, trend vs previous period, optional sparkline.
 * `trend` is a percentage (positive = up). Set `inverse` when "down is good" (e.g. expenses).
 */
export function StatCard({
  label,
  value,
  trend,
  trendLabel = 'vs last month',
  icon,
  tone = 'brand',
  spark,
  inverse,
  footnote,
  className,
}: {
  label: string
  value: ReactNode
  trend?: number
  trendLabel?: string
  icon?: ReactNode
  tone?: 'brand' | 'royal' | 'cyan' | 'success' | 'warning' | 'danger'
  spark?: number[]
  inverse?: boolean
  /** Shown instead of the trend line */
  footnote?: ReactNode
  className?: string
}) {
  const up = (trend ?? 0) >= 0
  const good = inverse ? !up : up
  const color = { brand: '#843f96', royal: '#275ba8', cyan: '#3cb4e8', success: '#1f9d64', warning: '#d9891a', danger: '#d64545' }[tone]
  return (
    <Card className={cn('relative overflow-hidden p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-muted">{label}</p>
          <p className="mt-2 text-[26px] leading-none font-bold tracking-[-0.02em] tabular">{value}</p>
        </div>
        {icon && <IconTile tone={tone}>{icon}</IconTile>}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        {trend !== undefined ? (
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold', good ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
              {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
            {trendLabel}
          </p>
        ) : (
          <div className="text-[12px] text-muted">{footnote}</div>
        )}
        {spark && spark.length > 1 && (
          <div className="h-9 w-24" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity={0.35} />
                    <stop offset="1" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${tone})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  )
}
