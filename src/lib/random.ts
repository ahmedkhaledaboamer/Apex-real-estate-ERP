/**
 * Deterministic random helpers for mock data: the same seed always produces the same records,
 * so demo data is stable between reloads. Dates are relative to "today" so the demo never looks stale.
 */
export function createRng(seed: number) {
  let s = seed >>> 0
  const next = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    float: (min: number, max: number) => next() * (max - min) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)]!,
    /** Pick by weights: weighted([['a', 3], ['b', 1]]) */
    weighted: <T>(items: readonly (readonly [T, number])[]): T => {
      const total = items.reduce((a, [, w]) => a + w, 0)
      let r = next() * total
      for (const [v, w] of items) {
        r -= w
        if (r <= 0) return v
      }
      return items[items.length - 1]![0]
    },
    bool: (p = 0.5) => next() < p,
    sample: <T>(arr: readonly T[], n: number): T[] => {
      const copy = [...arr]
      const out: T[] = []
      while (out.length < n && copy.length) out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]!)
      return out
    },
    /** Round to a "nice" amount, e.g. 12,340 → 12,350 with step 50. */
    amount: (min: number, max: number, step = 50) => Math.round((next() * (max - min) + min) / step) * step,
  }
}
export type Rng = ReturnType<typeof createRng>

const DAY = 86_400_000
/** Start of today (local). */
export function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
/** ISO date-time `days` from today (negative = past), optionally at a given hour. */
export function daysFromNow(days: number, hour = 9, minute = 0) {
  const d = new Date(today().getTime() + days * DAY)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}
/** ISO date (yyyy-mm-dd) `days` from today. */
export function dateFromNow(days: number) {
  const d = new Date(today().getTime() + days * DAY)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** Zero-padded document number: code('INV', 42) → "INV-0042" */
export function code(prefix: string, n: number, width = 4) {
  return `${prefix}-${String(n).padStart(width, '0')}`
}
