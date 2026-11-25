import { createResource } from '@/api/resource'
import { code, createRng, dateFromNow, today } from '@/lib/random'
import type { Employee } from '@/types/core'
import type { AttendanceRecord, LeaveRequest, LeaveType, PayrollLine, PayrollRun } from '@/types/hr'
import { BROKER_DEPARTMENTS, employees } from './core'
import { brokerShare, deals } from './domain'

/* HR demo data: leave requests, ~30 working days of attendance and 6 months of payroll.
   Working week is Monday–Friday. Dates are yyyy-mm-dd strings relative to today. */

/* ------------------------------ date helpers ----------------------------- */

const pad = (n: number) => String(n).padStart(2, '0')
/** Local Date → yyyy-mm-dd */
export const toIsoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** yyyy-mm-dd → local Date (midnight) */
export function parseDay(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
export const todayIso = () => dateFromNow(0)
export function addDays(iso: string, n: number) {
  const d = parseDay(iso)
  d.setDate(d.getDate() + n)
  return toIsoDay(d)
}
export function isWeekend(iso: string) {
  const dow = parseDay(iso).getDay()
  return dow === 0 || dow === 6
}
/** Move `n` working days (Mon–Fri) from `iso` (negative = back). n = 0 snaps forward to a working day. */
export function shiftWorkingDays(iso: string, n: number) {
  let d = iso
  const step = n < 0 ? -1 : 1
  while (isWeekend(d)) d = addDays(d, step)
  let left = Math.abs(n)
  while (left > 0) {
    d = addDays(d, step)
    if (!isWeekend(d)) left--
  }
  return d
}
/** Working days (Mon–Fri) between two dates, inclusive. */
export function workingDaysBetween(from: string, to: string) {
  if (!from || !to || to < from) return 0
  let n = 0
  for (let d = from; d <= to; d = addDays(d, 1)) if (!isWeekend(d)) n++
  return n
}
/** Monday of the week containing `iso`. */
export function weekStart(iso: string) {
  const dow = parseDay(iso).getDay()
  return addDays(iso, -((dow + 6) % 7))
}
export const leaveCovers = (l: Pick<LeaveRequest, 'from' | 'to'>, day: string) => l.from <= day && day <= l.to

/* --------------------------------- leave --------------------------------- */

const REASONS: Record<LeaveType, string[]> = {
  annual: ['Family vacation', 'Visiting family back home', 'Wedding of a sibling', 'Annual leave after Q-end closings', 'Rest after Cityscape week', 'Eid holidays with family'],
  sick: ['Flu and fever', 'Medical procedure', 'Doctor-advised rest', 'Back pain'],
  emergency: ['Family emergency', 'Urgent personal matter', 'Child unwell'],
  unpaid: ['Extended personal leave', 'RERA certification study leave'],
  maternity: ['Maternity leave'],
}

function makeLeave(): LeaveRequest[] {
  const r = createRng(1401)
  const emps = employees.collection.all().filter((e) => e.status !== 'terminated')
  const t = todayIso()
  const out: LeaveRequest[] = []
  const add = (e: Employee, type: LeaveType, from: string, to: string, status: LeaveRequest['status'], requestedDaysAgo: number) => {
    const requested = new Date(parseDay(from).getTime())
    requested.setDate(requested.getDate() - requestedDaysAgo)
    requested.setHours(r.int(8, 17), r.int(0, 59), 0, 0)
    const approverId = e.managerId ?? 'emp-8'
    out.push({
      id: '',
      code: '',
      employeeId: e.id,
      type,
      from,
      to,
      days: workingDaysBetween(from, to),
      reason: r.pick(REASONS[type]),
      status,
      approverId,
      requestedAt: requested.toISOString(),
      decidedAt: status === 'pending' ? null : new Date(Math.min(requested.getTime() + r.int(2, 30) * 3_600_000, Date.now())).toISOString(),
    })
  }

  // 1) People flagged on-leave are away right now.
  const away = emps.filter((e) => e.status === 'on-leave')
  for (const e of away) add(e, 'annual', shiftWorkingDays(t, -r.int(1, 3)), shiftWorkingDays(t, r.int(2, 6)), 'approved', r.int(10, 25))

  // 2) A few more people out this week.
  const others = r.sample(emps.filter((e) => e.status === 'active' && e.id !== 'emp-1'), 14)
  const mon = weekStart(t)
  add(others[0]!, 'sick', mon, addDays(mon, 1), 'approved', 0)
  add(others[1]!, 'annual', addDays(mon, 3), addDays(mon, 4), 'approved', 12)
  add(others[2]!, 'emergency', addDays(mon, 2), addDays(mon, 2), 'approved', 1)

  // 3) Pending requests in the near future.
  for (let i = 3; i < 9; i++) {
    const from = shiftWorkingDays(t, r.int(4, 45))
    add(others[i]!, r.weighted([['annual', 6], ['unpaid', 1], ['emergency', 1]] as const), from, shiftWorkingDays(from, r.int(0, 7)), 'pending', r.int(4, 30))
  }
  // keep pending requests recent
  for (const l of out.slice(-6)) l.requestedAt = new Date(Date.now() - r.int(2, 96) * 3_600_000).toISOString()

  // 4) History: approved and rejected.
  for (let i = 0; i < 16; i++) {
    const e = r.pick(emps)
    const type = i === 0 ? 'maternity' : r.weighted([['annual', 6], ['sick', 3], ['emergency', 1], ['unpaid', 1]] as const)
    const from = shiftWorkingDays(t, -r.int(14, 170))
    const len = type === 'maternity' ? 30 : type === 'sick' ? r.int(0, 2) : r.int(0, 6)
    const to = shiftWorkingDays(from, len)
    if (to >= t) continue
    add(e, type, from, to, i % 6 === 5 ? 'rejected' : 'approved', type === 'sick' ? 0 : r.int(5, 30))
  }
  add(others[9]!, 'annual', shiftWorkingDays(t, 15), shiftWorkingDays(t, 24), 'rejected', 20)

  return out
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .map((l, i, all) => ({ ...l, id: `lv-${all.length - i}`, code: code('LV', all.length - i) }))
}

/* ------------------------------- attendance ------------------------------- */

const hm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

function makeAttendance(): AttendanceRecord[] {
  const r = createRng(1402)
  const emps = employees.collection.all().filter((e) => e.status !== 'terminated')
  const leave = leaveRequests.collection.all().filter((l) => l.status === 'approved')
  const t = todayIso()
  let start = shiftWorkingDays(t, -29)
  const firstOfMonth = `${t.slice(0, 8)}01`
  if (firstOfMonth < start) start = firstOfMonth
  // Per-person habits
  const habits = new Map(
    emps.map((e) => [
      e.id,
      {
        late: r.float(0.02, 0.16),
        // "remote" = out in the field (viewings, valuations, site visits) for brokers and property managers
        remote: BROKER_DEPARTMENTS.includes(e.departmentId) || e.departmentId === 'property-management' ? r.float(0.15, 0.3) : e.departmentId === 'marketing' ? r.float(0.08, 0.18) : r.float(0, 0.05),
        absent: r.float(0.005, 0.035),
      },
    ]),
  )
  const out: AttendanceRecord[] = []
  for (let day = start; day <= t; day = addDays(day, 1)) {
    if (isWeekend(day)) continue
    for (const e of emps) {
      if (e.joinDate > day) continue
      const h = habits.get(e.id)!
      const base = { id: `att-${e.id}-${day}`, employeeId: e.id, date: day }
      if (leave.some((l) => l.employeeId === e.id && leaveCovers(l, day))) {
        out.push({ ...base, status: 'on-leave', checkIn: null, checkOut: null, hours: 0 })
        continue
      }
      const roll = r.next()
      const status = roll < h.absent ? 'absent' : roll < h.absent + h.late ? 'late' : roll < h.absent + h.late + h.remote ? 'remote' : 'present'
      if (status === 'absent') {
        out.push({ ...base, status, checkIn: null, checkOut: null, hours: 0 })
        continue
      }
      const inMin = status === 'late' ? r.int(550, 610) : status === 'remote' ? r.int(500, 560) : r.int(490, 540)
      const outMin = r.int(1015, 1130)
      const isToday = day === t
      out.push({
        ...base,
        status,
        checkIn: hm(inMin),
        checkOut: isToday ? null : hm(outMin),
        hours: isToday ? 0 : Math.round(((outMin - inMin - 45) / 60) * 10) / 10,
      })
    }
  }
  return out
}

/* --------------------------------- payroll -------------------------------- */

/** Broker commission for a payroll month (yyyy-mm): sum of the broker's share of deals closed that month. */
export function brokerCommissionFor(employeeId: string, period: string, all = deals.collection.all()) {
  let total = 0
  for (const d of all) if (d.agentId === employeeId && d.stage === 'closed' && d.closedAt?.startsWith(period)) total += brokerShare(d)
  return total
}

function makePayroll(): PayrollRun[] {
  const r = createRng(1403)
  const emps = employees.collection.all().filter((e) => e.status !== 'terminated')
  const now = today()
  const runs: PayrollRun[] = []
  for (let k = 5; k >= 0; k--) {
    const first = new Date(now.getFullYear(), now.getMonth() - k, 1)
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
    const period = `${first.getFullYear()}-${pad(first.getMonth() + 1)}`
    let pay = toIsoDay(new Date(first.getFullYear(), first.getMonth(), 27))
    while (isWeekend(pay)) pay = addDays(pay, -1)
    const lines: PayrollLine[] = emps
      .filter((e) => e.joinDate <= toIsoDay(last))
      .map((e) => {
        // Brokers don't earn overtime — they earn commission.
        const overtime = !BROKER_DEPARTMENTS.includes(e.departmentId) && r.bool(0.3) ? r.amount(250, 2400, 50) : 0
        const deductions = r.bool(0.28) ? r.amount(150, 1600, 50) : 0
        const commission = brokerCommissionFor(e.id, period)
        return { employeeId: e.id, basic: e.salary, allowances: e.allowances, overtime, commission, deductions, net: e.salary + e.allowances + overtime + commission - deductions }
      })
    runs.push({
      id: `pay-${period}`,
      period,
      status: k === 0 ? 'draft' : 'paid',
      payDate: pay,
      paidAt: k === 0 ? null : new Date(parseDay(pay).getTime() + 10 * 3_600_000).toISOString(),
      lines,
    })
  }
  return runs.reverse()
}

/* -------------------------------- resources ------------------------------- */

export const leaveRequests = createResource<LeaveRequest>('re-leave', makeLeave, { label: 'Leave request' })
export const attendance = createResource<AttendanceRecord>('re-attendance', makeAttendance, { label: 'Attendance' })
export const payrollRuns = createResource<PayrollRun>('re-payroll', makePayroll, { label: 'Payroll run' })

export const lineGross = (l: PayrollLine) => l.basic + l.allowances + l.overtime + (l.commission ?? 0)
export function runTotals(run: Pick<PayrollRun, 'lines'>) {
  let gross = 0
  let commission = 0
  let deductions = 0
  let net = 0
  for (const l of run.lines) {
    gross += lineGross(l)
    commission += l.commission ?? 0
    deductions += l.deductions
    net += l.net
  }
  return { gross, commission, deductions, net, employees: run.lines.length }
}
