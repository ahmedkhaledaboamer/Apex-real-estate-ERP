import { Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { LogoMark } from '@/components/layout/Logo'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Overlay'
import { formatDate, formatMoney } from '@/lib/format'
import { departmentById, employeeById } from '@/mocks/core'
import { lineGross } from '@/mocks/hr'
import { appSettings } from '@/mocks/settings'
import type { PayrollLine, PayrollRun } from '@/types/hr'
import { PAYROLL_STATUS } from './labels'

export const periodLabel = (period: string) => new Date(`${period}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

/** Print only the payslip (the rest of the app is hidden while printing). */
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #payslip, #payslip * { visibility: visible !important; }
  #payslip { position: fixed; inset: 0; margin: 0; padding: 24px; background: #fff; color: #1e1828; }
  #payslip .no-print { display: none !important; }
}`

export function PayslipModal({ run, line, onClose }: { run: PayrollRun | null; line: PayrollLine | null; onClose: () => void }) {
  const emp = employeeById(line?.employeeId)
  const open = !!run && !!line && !!emp
  const company = appSettings()?.company
  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-[680px]"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button icon={<Printer />} onClick={() => window.print()}>
            Print payslip
          </Button>
        </>
      }
    >
      {open && (
        <div id="payslip" className="max-h-[70vh] overflow-y-auto pt-2 print:max-h-none">
          <style>{PRINT_CSS}</style>
          <div className="overflow-hidden rounded-2xl border border-line">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-gradient px-5 py-4 text-white print:[print-color-adjust:exact]">
              <div className="flex items-center gap-3">
                <LogoMark size={40} className="rounded-xl bg-white px-2 print:[print-color-adjust:exact]" />
                <div className="leading-tight">
                  <p className="font-display text-[20px] font-semibold">{company?.name ?? 'Apex Aora Real Estate LLC'}</p>
                  <p className="text-[11.5px] text-white/75">
                    {company ? `${company.address}, ${company.city}` : 'Dubai'} · RERA ORN {company?.reraOrn ?? '—'} · TRN {company?.trn ?? '—'}
                  </p>
                </div>
              </div>
              <div className="text-end">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase">Payslip</p>
                <p className="text-[15px] font-semibold">{periodLabel(run.period)}</p>
              </div>
            </div>

            <div className="grid gap-x-6 gap-y-2 border-b border-line px-5 py-4 text-[13px] sm:grid-cols-2">
              <Row label="Employee" value={emp.name} />
              <Row label="Employee ID" value={emp.code} />
              <Row label="Designation" value={emp.title} />
              <Row label="Department" value={departmentById(emp.departmentId)?.name ?? '—'} />
              {emp.brn && <Row label="BRN" value={emp.brn} />}
              {emp.commissionSplit != null && <Row label="Commission split" value={`${emp.commissionSplit}%`} />}
              <Row label="Pay date" value={formatDate(run.payDate)} />
              <Row label="Status" value={<StatusBadge value={run.status} map={PAYROLL_STATUS} />} />
            </div>

            <div className="grid sm:grid-cols-2">
              <div className="border-b border-line px-5 py-4 sm:border-e sm:border-b-0">
                <p className="mb-2 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">Earnings</p>
                <Money label="Basic salary" value={line.basic} />
                <Money label="Allowances" value={line.allowances} />
                {emp.commissionSplit != null ? <Money label="Commission" value={line.commission ?? 0} hint="Share of GCI on deals closed this month" /> : <Money label="Overtime" value={line.overtime} />}
                <Money label="Gross pay" value={lineGross(line)} strong />
              </div>
              <div className="px-5 py-4">
                <p className="mb-2 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">Deductions</p>
                <Money label="Absence & advances" value={line.deductions} />
                <Money label="Income tax" value={0} hint="Not applicable in the UAE" />
                <Money label="Total deductions" value={line.deductions} strong />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/60 px-5 py-4">
              <div>
                <p className="text-[12px] text-muted">Net pay (transferred via WPS)</p>
                <p className="text-[11.5px] text-muted">Bank account ending •••• {emp.code.slice(-3)}4</p>
              </div>
              <p className="text-[24px] font-bold tracking-[-0.02em] text-aura tabular dark:text-[#d6a8e3]">{formatMoney(line.net, { decimals: true })}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted">This is a system-generated payslip and does not require a signature.</p>
        </div>
      )}
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-muted">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  )
}
function Money({ label, value, strong, hint }: { label: string; value: number; strong?: boolean; hint?: string }) {
  return (
    <div className={strong ? 'mt-2 flex items-center justify-between gap-3 border-t border-line pt-2 text-[13.5px] font-semibold' : 'flex items-start justify-between gap-3 py-1 text-[13px]'}>
      <span className={strong ? '' : 'text-muted'}>
        {label}
        {hint && <span className="block text-[11px] text-muted/80">{hint}</span>}
      </span>
      <span className="whitespace-nowrap tabular">{formatMoney(value, { decimals: true })}</span>
    </div>
  )
}
