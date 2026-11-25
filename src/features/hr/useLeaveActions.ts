import { toast } from '@/components/ui/Toast'
import { CURRENT_USER_ID, employees } from '@/mocks/core'
import { leaveRequests } from '@/mocks/hr'
import type { LeaveRequest } from '@/types/hr'
import { DEDUCTS_BALANCE } from './labels'

/** Approve / reject a leave request. Approving annual or emergency leave deducts the days from the balance. */
export function useLeaveActions() {
  const updateLeave = leaveRequests.useUpdate({ silent: true })
  const updateEmployee = employees.useUpdate({ silent: true })

  const approve = (l: LeaveRequest) => {
    updateLeave.mutate(
      { id: l.id, patch: { status: 'approved', approverId: CURRENT_USER_ID, decidedAt: new Date().toISOString() } },
      {
        onSuccess: () => {
          const emp = employees.collection.byId(l.employeeId)
          if (emp && DEDUCTS_BALANCE.includes(l.type)) {
            updateEmployee.mutate({ id: emp.id, patch: { leaveBalance: Math.max(0, emp.leaveBalance - l.days) } })
            toast.success(`Approved · ${l.days} ${l.days === 1 ? 'day' : 'days'} deducted from ${emp.name.split(' ')[0]}’s balance`)
          } else toast.success('Leave request approved')
        },
      },
    )
  }
  const reject = (l: LeaveRequest) => {
    updateLeave.mutate({ id: l.id, patch: { status: 'rejected', approverId: CURRENT_USER_ID, decidedAt: new Date().toISOString() } }, { onSuccess: () => toast.info('Leave request rejected') })
  }
  return { approve, reject, pending: updateLeave.isPending }
}
