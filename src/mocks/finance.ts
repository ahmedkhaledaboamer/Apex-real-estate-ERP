import { createResource } from '@/api/resource'
import { code, createRng, today } from '@/lib/random'
import type { CampaignChannel } from '@/types/marketing'
import type { Account, CommissionPayout, Expense, ExpenseCategory } from '@/types/finance'
import type { PaymentMethod } from '@/types/domain'
import { employees, suppliers } from './core'
import { brokerShare, deals, payments } from './domain'
import { campaigns, campaignSpendInMonth, portalStats } from './marketing'

/* Finance demo data: bank/cash accounts, ~12 months of operating expenses and broker commission payouts.
   Expenses are tuned so the agency runs a realistic 15–30% net margin on GCI. Broker commissions are
   NOT expenses here — they are cost of sales, paid through `commissionPayouts`. */

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00`)
  d.setDate(d.getDate() + n)
  return iso(d)
}
const minDay = (a: string, b: string) => (a < b ? a : b)

/* ------------------------------------------------------------------ */
/*  Accounts                                                            */
/* ------------------------------------------------------------------ */
export const ACCOUNT_IDS = { current: 'acc-enbd', escrow: 'acc-escrow', petty: 'acc-petty', card: 'acc-card' } as const
/** Petty cash runs on an imprest float, topped up from the current account at the start of each month. */
export const PETTY_FLOAT = 20_000
/** Card receipts settle into the current account after this many days. */
export const CARD_SETTLEMENT_DAYS = 2

function makeAccounts(): Account[] {
  const opening = (() => {
    const t = today()
    return iso(new Date(t.getFullYear(), t.getMonth() - 11, 0))
  })()
  return [
    { id: ACCOUNT_IDS.current, name: 'Current account', bank: 'Emirates NBD', kind: 'current', iban: 'AE07 0260 •••• •••• 4471', openingBalance: 1_650_000, openingDate: opening, clientMoney: false },
    { id: ACCOUNT_IDS.escrow, name: 'Client money (escrow)', bank: 'ADCB', kind: 'escrow', iban: 'AE53 0030 •••• •••• 9082', openingBalance: 2_840_000, openingDate: opening, clientMoney: true },
    { id: ACCOUNT_IDS.petty, name: 'Petty cash', bank: 'Office safe', kind: 'petty-cash', iban: 'Imprest float AED 20,000', openingBalance: PETTY_FLOAT, openingDate: opening, clientMoney: false },
    { id: ACCOUNT_IDS.card, name: 'Card clearing', bank: 'Network International', kind: 'card-clearing', iban: 'MID 4410 •••• 27', openingBalance: 0, openingDate: opening, clientMoney: false },
  ]
}
export const accounts = createResource<Account>('re-accounts', makeAccounts, { label: 'Account' })

/* ------------------------------------------------------------------ */
/*  Expenses                                                            */
/* ------------------------------------------------------------------ */
const AD_PAYEE: Record<Exclude<CampaignChannel, 'portal-featured'>, [string | null, string]> = {
  meta: ['sup-4', 'Meta Ads'],
  google: ['sup-5', 'Google Ads'],
  tiktok: [null, 'TikTok for Business'],
  email: [null, 'Mailchimp (Intuit)'],
  whatsapp: [null, 'WhatsApp Business API — 360dialog'],
  print: [null, 'ITP Media — Emirates Woman'],
  influencer: [null, 'Creator Hub Talent Management'],
}
const PORTAL_SUPPLIER = { 'property-finder': ['sup-1', 'Property Finder'], bayut: ['sup-2', 'Bayut'], dubizzle: ['sup-3', 'Dubizzle'] } as const
const MONTH_NAME = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function makeExpenses(): Expense[] {
  const r = createRng(1301)
  const now = today()
  const todayIso = iso(now)
  const staff = employees.collection.all()
  const finance = staff.filter((e) => e.departmentId === 'finance').map((e) => e.id)
  const vendors = suppliers.collection.all()
  const termsOf = (id: string | null) => vendors.find((v) => v.id === id)?.paymentTerms ?? 0
  const allDeals = deals.collection.all()
  const cmps = campaigns.collection.all()
  const stats = portalStats.collection.all()
  const out: Omit<Expense, 'id' | 'number'>[] = []

  for (let k = 11; k >= 0; k--) {
    const first = new Date(now.getFullYear(), now.getMonth() - k, 1)
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
    const key = `${first.getFullYear()}-${pad(first.getMonth() + 1)}`
    const label = `${MONTH_NAME[first.getMonth()]} ${first.getFullYear()}`
    const day = (n: number) => iso(new Date(first.getFullYear(), first.getMonth(), Math.min(n, last.getDate())))
    const summer = first.getMonth() >= 5 && first.getMonth() <= 8

    const add = (e: { date: string; category: ExpenseCategory; supplierId?: string | null; payee: string; description: string; amount: number; vatRate?: number; account?: string; method?: PaymentMethod; recurring?: boolean; reference?: string }) => {
      // Status by age: older bills are paid; this month's are a mix awaiting approval / payment.
      const terms = termsOf(e.supplierId ?? null)
      const due = addDays(e.date, terms)
      let status: Expense['status']
      if (e.date > todayIso) status = 'approved'
      else if (k >= 2) status = 'paid'
      else if (k === 1) status = due <= todayIso || r.bool(0.7) ? 'paid' : 'approved'
      else status = e.recurring && terms === 0 ? 'paid' : r.weighted([['pending', 4], ['approved', 3], ['paid', 3]] as const)
      const paidAt = status === 'paid' ? minDay(todayIso, addDays(e.date, Math.min(terms, r.int(0, Math.max(0, terms))))) : null
      out.push({
        date: e.date,
        category: e.category,
        supplierId: e.supplierId ?? null,
        payee: e.payee,
        description: e.description,
        amount: Math.round(e.amount),
        vatRate: e.vatRate ?? 5,
        status,
        accountId: e.account ?? ACCOUNT_IDS.current,
        method: e.method ?? 'bank-transfer',
        reference: e.reference ?? `${(e.payee.match(/[A-Z]/g) ?? ['X']).slice(0, 3).join('')}-${r.int(10000, 99999)}`,
        submittedById: r.pick(finance),
        approvedById: status === 'approved' || status === 'paid' ? 'emp-7' : null,
        paidAt,
        recurring: !!e.recurring,
        notes: '',
      })
    }

    // Office rent — Bay Square, billed monthly
    add({ date: day(1), category: 'rent', supplierId: 'sup-14', payee: 'Bay Square Properties', description: `Office rent — Bay Square Building 7, Offices 701–702 · ${label}`, amount: 42_000, recurring: true })

    // Salaries (WPS) — basic + allowances of staff employed that month, plus overtime. Broker commissions are separate.
    const onPayroll = staff.filter((e) => e.status !== 'terminated' && e.joinDate <= iso(last))
    let payDay = new Date(first.getFullYear(), first.getMonth(), 27)
    while (payDay.getDay() === 0 || payDay.getDay() === 6) payDay = new Date(payDay.getTime() - 86_400_000)
    const gross = onPayroll.reduce((a, e) => a + e.salary + e.allowances, 0) + r.amount(2_000, 7_000, 50)
    add({ date: iso(payDay), category: 'salaries', payee: `WPS payroll — ${onPayroll.length} employees`, description: `Salaries & allowances · ${label} (excl. broker commissions)`, amount: gross, vatRate: 0, recurring: true, reference: `WPS-${key.replace('-', '')}` })

    // Listing portals — package + credits (from Marketing › Portals)
    for (const ps of stats.filter((s) => s.month === key)) {
      const [sid, name] = PORTAL_SUPPLIER[ps.portal]
      add({ date: day(2), category: 'portals', supplierId: sid, payee: name, description: `${name} subscription — ${ps.quota} listings + ${ps.creditsTotal} credits · ${label}`, amount: ps.cost, recurring: true })
    }

    // Paid advertising — campaign spend booked monthly per channel (from Marketing › Campaigns)
    const byChannel = new Map<CampaignChannel, { amount: number; names: string[] }>()
    for (const c of cmps) {
      const amt = campaignSpendInMonth(c, key)
      if (amt <= 0) continue
      const row = byChannel.get(c.channel) ?? { amount: 0, names: [] }
      row.amount += amt
      row.names.push(c.name.split(' — ')[0]!)
      byChannel.set(c.channel, row)
    }
    for (const [ch, row] of byChannel) {
      const date = k === 0 ? todayIso : iso(last)
      const what = row.names.length > 1 ? `${row.names.length} campaigns` : row.names[0]
      if (ch === 'portal-featured') {
        add({ date, category: 'portals', supplierId: 'sup-1', payee: 'Property Finder', description: `Featured & premium boosts — ${what} · ${label}`, amount: row.amount })
        continue
      }
      const [sid, name] = AD_PAYEE[ch]
      add({ date, category: 'advertising', supplierId: sid, payee: name, description: `${name} — ${what} · ${label}`, amount: row.amount, method: ch === 'meta' || ch === 'google' || ch === 'tiktok' ? 'card' : 'bank-transfer' })
    }

    // Photography, video & virtual tours
    const shoots = r.int(2, 4)
    add({ date: day(r.int(8, 22)), category: 'media', supplierId: 'sup-6', payee: 'Skyline Media Production', description: `Listing photography & drone video — ${shoots} shoots · ${label}`, amount: shoots * r.amount(1_600, 2_400, 50) })
    if (r.bool(0.55)) add({ date: day(r.int(10, 25)), category: 'media', supplierId: 'sup-7', payee: 'Studio 360 Virtual Tours', description: `3D virtual tours — ${r.int(2, 5)} units`, amount: r.amount(1_800, 4_200, 50) })

    // RERA & DLD: Trakheesi advertising permits every month, broker card renewals, annual licences
    const permits = r.int(5, 11)
    add({ date: day(r.int(3, 20)), category: 'licensing', payee: 'Dubai Land Department', description: `Trakheesi advertising permits × ${permits}`, amount: permits * 360, vatRate: 0, method: 'card' })
    const renewals = r.weighted([[0, 3], [1, 4], [2, 2]] as const)
    if (renewals) add({ date: day(r.int(5, 24)), category: 'licensing', payee: 'Dubai Land Department — RERA', description: `RERA broker card renewal × ${renewals}`, amount: renewals * 1_520, vatRate: 0, method: 'card' })
    if (k === 7) add({ date: day(12), category: 'licensing', payee: 'Dubai Land Department — RERA', description: 'Office registration (ORN) annual renewal', amount: 11_800, vatRate: 0 })
    if (k === 4) add({ date: day(18), category: 'licensing', payee: 'Department of Economy & Tourism', description: 'Trade licence renewal — real estate brokerage', amount: 16_450, vatRate: 0 })

    // Software & telecom
    add({ date: day(1), category: 'software', supplierId: 'sup-16', payee: 'PropSpace CRM', description: `CRM & listings syndication — ${onPayroll.length} seats · ${label}`, amount: 5_900, recurring: true, method: 'card' })
    add({ date: day(1), category: 'software', payee: 'Google Workspace', description: `Google Workspace Business — ${onPayroll.length} users`, amount: onPayroll.length * 52, recurring: true, method: 'card' })

    // Utilities
    add({ date: day(r.int(12, 16)), category: 'utilities', payee: 'DEWA', description: `Electricity & water — Bay Square 7 offices · ${label}`, amount: summer ? r.amount(6_800, 8_400) : r.amount(4_200, 5_600), recurring: true })
    add({ date: day(r.int(5, 9)), category: 'utilities', supplierId: 'sup-15', payee: 'du Business', description: `Business fibre + ${onPayroll.length} mobile lines`, amount: r.amount(3_200, 3_700), recurring: true })

    // Office & pantry (petty cash)
    add({ date: day(r.int(3, 10)), category: 'office', payee: 'Al Rawdah Cleaning', supplierId: 'sup-10', description: 'Office cleaning — monthly contract', amount: 2_400, recurring: true, account: ACCOUNT_IDS.petty, method: 'cash' })
    add({ date: day(r.int(10, 24)), category: 'office', payee: 'Carrefour Business', description: 'Pantry, stationery & printer supplies', amount: r.amount(1_100, 2_300), account: ACCOUNT_IDS.petty, method: 'cash' })
    if (r.bool(0.25)) add({ date: day(r.int(5, 25)), category: 'office', payee: 'Danube Home Office', description: r.pick(['Meeting room chairs × 6', 'Reception signage refresh', 'Standing desks × 3']), amount: r.amount(4_500, 9_000, 100) })

    // Legal (quarterly retainer + ad-hoc)
    if (k % 3 === 2) add({ date: day(r.int(6, 20)), category: 'legal', supplierId: 'sup-12', payee: 'Gulf Legal Advocates', description: 'Quarterly retainer — agency agreements, Form A/B/F reviews', amount: 9_500 })
    if (r.bool(0.2)) add({ date: day(r.int(6, 24)), category: 'legal', supplierId: 'sup-12', payee: 'Gulf Legal Advocates', description: r.pick(['Commission dispute — demand letter', 'RDC tenancy dispute support', 'Developer agency agreement review']), amount: r.amount(3_500, 8_500, 250) })

    // Conveyancing — trustee-office coordination per closed sale transfer
    const transfers = allDeals.filter((d) => d.type === 'sale' && d.stage === 'closed' && d.closedAt?.slice(0, 7) === key).length
    if (transfers) add({ date: k === 0 ? todayIso : iso(last), category: 'conveyancing', supplierId: 'sup-11', payee: 'TransferPro Conveyancing', description: `Transfer coordination & trustee booking × ${transfers}`, amount: transfers * 450 })
  }

  // A couple of rejected submissions (duplicates / out of policy) — excluded from the P&L.
  const t = iso(now)
  out.push({ date: addDays(t, -9), category: 'media', supplierId: 'sup-6', payee: 'Skyline Media Production', description: 'Duplicate invoice — drone video Palm Frond K', amount: 2_200, vatRate: 5, status: 'rejected', accountId: ACCOUNT_IDS.current, method: 'bank-transfer', reference: 'SMP-55210', submittedById: finance[0]!, approvedById: 'emp-7', paidAt: null, recurring: false, notes: 'Already paid under SMP-55187' })
  out.push({ date: addDays(t, -4), category: 'office', supplierId: null, payee: 'Nobu Dubai', description: 'Client dinner — over entertainment policy limit', amount: 3_850, vatRate: 5, status: 'rejected', accountId: ACCOUNT_IDS.petty, method: 'card', reference: 'RCPT-8812', submittedById: 'emp-11', approvedById: 'emp-7', paidAt: null, recurring: false, notes: 'Re-submit as marketing event with guest list' })

  return out
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e, i) => ({ ...e, id: `exp-${i + 1}`, number: code('EXP', 3100 + i + 1) }))
    .reverse()
}
export const expenses = createResource<Expense>('re-expenses', makeExpenses, { label: 'Expense' })

/* ------------------------------------------------------------------ */
/*  Broker commission payouts                                          */
/* ------------------------------------------------------------------ */
function makePayouts(): CommissionPayout[] {
  const r = createRng(1302)
  const now = today()
  const todayIso = iso(now)
  const pays = payments.collection.all()
  const closed = deals.collection
    .all()
    .filter((d) => d.stage === 'closed' && d.closedAt)
    .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!))
  return closed.map((d, i) => {
    const collected = d.collected >= d.commission
    const lastReceipt = pays.filter((p) => p.dealId === d.id).reduce((a, p) => (p.date > a ? p.date : a), d.closedAt!.slice(0, 10))
    let status: CommissionPayout['status'] = 'pending'
    let paidAt: string | null = null
    let approvedAt: string | null = null
    if (collected) {
      // Monthly commission run on the 10th of the month after collection.
      const c = new Date(`${lastReceipt}T00:00:00`)
      const run = iso(new Date(c.getFullYear(), c.getMonth() + 1, 10))
      if (run <= todayIso) {
        status = 'paid'
        paidAt = run
        approvedAt = `${addDays(run, -2)}T10:00:00.000Z`
      } else if (lastReceipt <= addDays(todayIso, -4) && r.bool(0.6)) {
        status = 'approved'
        approvedAt = `${addDays(lastReceipt, 2)}T10:00:00.000Z`
      }
    }
    return {
      id: `cp-${i + 1}`,
      dealId: d.id,
      brokerId: d.agentId,
      amount: brokerShare(d),
      status,
      approvedAt,
      paidAt,
      reference: paidAt ? `CR-${paidAt.slice(0, 7).replace('-', '')}-${pad(r.int(1, 99))}` : '',
    }
  })
}
export const commissionPayouts = createResource<CommissionPayout>('re-commission-payouts', makePayouts, { label: 'Payout' })

export const accountById = (id: string | null | undefined) => (id ? accounts.collection.byId(id) : undefined)
