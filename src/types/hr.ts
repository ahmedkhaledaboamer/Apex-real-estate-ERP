/** HR module: attendance, leave and payroll (brokers earn basic + allowances + commission). */

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'remote' | 'on-leave'

export interface AttendanceRecord {
  id: string
  employeeId: string
  /** yyyy-mm-dd */
  date: string
  status: AttendanceStatus
  /** "HH:mm" (null when absent / on leave) */
  checkIn: string | null
  /** "HH:mm" (null when absent, on leave, or still at work today) */
  checkOut: string | null
  /** Worked hours, 1 decimal */
  hours: number
}

export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRequest {
  id: string
  code: string
  employeeId: string
  type: LeaveType
  /** yyyy-mm-dd, inclusive */
  from: string
  /** yyyy-mm-dd, inclusive */
  to: string
  /** Working days (Mon–Fri) in the range */
  days: number
  reason: string
  status: LeaveStatus
  approverId: string | null
  requestedAt: string
  decidedAt: string | null
}

export type PayrollStatus = 'draft' | 'paid'

export interface PayrollLine {
  employeeId: string
  basic: number
  allowances: number
  overtime: number
  /** Broker commission: share of GCI on deals closed in the period (0 for non-brokers) */
  commission: number
  deductions: number
  net: number
}

export interface PayrollRun {
  id: string
  /** yyyy-mm */
  period: string
  status: PayrollStatus
  /** yyyy-mm-dd */
  payDate: string
  paidAt: string | null
  lines: PayrollLine[]
}
