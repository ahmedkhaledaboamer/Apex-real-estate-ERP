import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCompact } from '@/lib/format'

/** Brand series palette (in order). */
export const CHART_COLORS = ['#843f96', '#275ba8', '#3cb4e8', '#563d96', '#d9891a', '#1f9d64', '#d64545', '#a97cc4']

export interface Series {
  key: string
  label: string
  color?: string
}

type Formatter = (v: number) => string

function TooltipBox({ active, payload, label, format }: { active?: boolean; payload?: { name?: string; value?: number; color?: string; payload?: { fill?: string } }[]; label?: ReactNode; format: Formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5 text-[12.5px] shadow-lift">
      {label !== undefined && <p className="mb-1.5 font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-full" style={{ background: p.color ?? p.payload?.fill }} />
          {p.name}: <span className="font-semibold text-fg tabular">{format(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  )
}

const axisProps = { tickLine: false, axisLine: false, tickMargin: 8 } as const

/** Smooth area chart for trends over time (revenue, bookings…). */
export function TrendChart<T extends object>({ data, x, series, height = 280, format = formatCompact, stacked }: { data: T[]; x: string; series: Series[]; height?: number; format?: Formatter; stacked?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0.28} />
              <stop offset="1" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey={x} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => formatCompact(Number(v))} width={48} />
        <Tooltip content={<TooltipBox format={format} />} cursor={{ stroke: 'var(--line)' }} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? 'a' : undefined}
            stroke={s.color ?? CHART_COLORS[i]}
            strokeWidth={2.25}
            fill={`url(#grad-${s.key})`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Grouped or stacked bars (income vs expenses, by month/department…). */
export function BarsChart<T extends object>({ data, x, series, height = 280, format = formatCompact, stacked, horizontal }: { data: T[]; x: string; series: Series[]; height?: number; format?: Formatter; stacked?: boolean; horizontal?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, bottom: 0, left: horizontal ? 8 : 0 }} barGap={4}>
        <CartesianGrid vertical={!!horizontal} horizontal={!horizontal} strokeDasharray="3 4" />
        {horizontal ? (
          <>
            <XAxis type="number" {...axisProps} tickFormatter={(v) => formatCompact(Number(v))} />
            <YAxis type="category" dataKey={x} {...axisProps} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} {...axisProps} />
            <YAxis {...axisProps} tickFormatter={(v) => formatCompact(Number(v))} width={48} />
          </>
        )}
        <Tooltip content={<TooltipBox format={format} />} cursor={{ fill: 'var(--surface-2)' }} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId={stacked ? 'a' : undefined} fill={s.color ?? CHART_COLORS[i]} radius={stacked ? 0 : horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Donut with centre total and a legend list beside it. */
export function DonutChart({ data, height = 220, format = formatCompact, centerLabel, centerValue }: { data: { name: string; value: number; color?: string }[]; height?: number; format?: Formatter; centerLabel?: string; centerValue?: ReactNode }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-5 @md:flex-row">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" cornerRadius={4}>
              {data.map((d, i) => (
                <Cell key={d.name} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox format={format} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-[22px] font-bold tabular">{centerValue ?? format(total)}</span>
          {centerLabel && <span className="text-[11.5px] text-muted">{centerLabel}</span>}
        </div>
      </div>
      <ul className="w-full flex-1 space-y-2.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="truncate text-muted">{d.name}</span>
            </span>
            <span className="font-semibold tabular">
              {format(d.value)} <span className="ms-1 text-[11.5px] font-medium text-muted">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  )
}
