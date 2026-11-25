import type { EmploymentStatus, Status } from '@/types/core'
import type { AttendanceStatus, LeaveStatus, LeaveType, PayrollStatus } from '@/types/hr'

export const EMPLOYMENT_STATUS: Record<EmploymentStatus, readonly [string, Status]> = {
  active: ['Active', 'success'],
  'on-leave': ['On leave', 'warning'],
  probation: ['Probation', 'info'],
  terminated: ['Terminated', 'danger'],
}

export const ATTENDANCE_STATUS: Record<AttendanceStatus, readonly [string, Status]> = {
  present: ['Present', 'success'],
  late: ['Late', 'warning'],
  absent: ['Absent', 'danger'],
  remote: ['In the field', 'info'],
  'on-leave': ['On leave', 'brand'],
}
/** Heatmap cell colours per attendance status. */
export const ATTENDANCE_CELL: Record<AttendanceStatus, string> = {
  present: 'bg-success/75',
  late: 'bg-warning/85',
  absent: 'bg-danger/80',
  remote: 'bg-info/75',
  'on-leave': 'bg-aura/55',
}

export const LEAVE_TYPE: Record<LeaveType, readonly [string, Status]> = {
  annual: ['Annual', 'brand'],
  sick: ['Sick', 'info'],
  emergency: ['Emergency', 'warning'],
  unpaid: ['Unpaid', 'neutral'],
  maternity: ['Maternity', 'success'],
}
export const LEAVE_STATUS: Record<LeaveStatus, readonly [string, Status]> = {
  pending: ['Pending', 'warning'],
  approved: ['Approved', 'success'],
  rejected: ['Rejected', 'danger'],
}
/** Leave types that are deducted from the employee's annual balance when approved. */
export const DEDUCTS_BALANCE: LeaveType[] = ['annual', 'emergency']

export const PAYROLL_STATUS: Record<PayrollStatus, readonly [string, Status]> = {
  draft: ['Draft', 'warning'],
  paid: ['Paid', 'success'],
}
