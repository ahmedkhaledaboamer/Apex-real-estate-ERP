import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { optionsOf } from '@/lib/labels'
import { code, dateFromNow } from '@/lib/random'
import { COMMUNITIES, employees } from '@/mocks/core'
import { offplanProjects } from '@/mocks/domain'
import { campaigns } from '@/mocks/marketing'
import type { Campaign, CampaignChannel, CampaignStatus } from '@/types/marketing'
import { CAMPAIGN_STATUS, CHANNEL_OPTIONS } from './labels'

type Form = {
  name: string
  channel: CampaignChannel
  status: CampaignStatus
  startDate: string
  endDate: string
  budget: string
  spent: string
  ownerId: string
  communitySlug: string
  offplanProjectId: string
  audience: string
  notes: string
  impressions: string
  clicks: string
  leads: string
  viewings: string
  deals: string
  gciAttributed: string
}

const blank = (): Form => ({
  name: '',
  channel: 'meta',
  status: 'draft',
  startDate: dateFromNow(3),
  endDate: dateFromNow(33),
  budget: '',
  spent: '0',
  ownerId: 'emp-5',
  communitySlug: '',
  offplanProjectId: '',
  audience: '',
  notes: '',
  impressions: '0',
  clicks: '0',
  leads: '0',
  viewings: '0',
  deals: '0',
  gciAttributed: '0',
})

const fromCampaign = (c: Campaign): Form => ({
  name: c.name,
  channel: c.channel,
  status: c.status,
  startDate: c.startDate,
  endDate: c.endDate,
  budget: String(c.budget),
  spent: String(c.spent),
  ownerId: c.ownerId,
  communitySlug: c.communitySlug ?? '',
  offplanProjectId: c.offplanProjectId ?? '',
  audience: c.audience,
  notes: c.notes,
  impressions: String(c.impressions),
  clicks: String(c.clicks),
  leads: String(c.leads),
  viewings: String(c.viewings),
  deals: String(c.deals),
  gciAttributed: String(c.gciAttributed),
})

const num = (s: string) => Math.max(0, Number(s) || 0)

export function CampaignDrawer({ open, onClose, campaign }: { open: boolean; onClose: () => void; campaign: Campaign | null }) {
  const [f, setF] = useState<Form>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const create = campaigns.useCreate()
  const update = campaigns.useUpdate()
  const { data: staff } = employees.useList()
  const { data: projects } = offplanProjects.useList()
  const marketers = (staff ?? []).filter((e) => e.departmentId === 'marketing' || e.departmentId === 'management')

  useEffect(() => {
    if (open) {
      setF(campaign ? fromCampaign(campaign) : blank())
      setErrors({})
    }
  }, [open, campaign])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))

  const save = () => {
    const e: typeof errors = {}
    if (!f.name.trim()) e.name = 'Give the campaign a name'
    if (!f.startDate) e.startDate = 'Required'
    if (!f.endDate) e.endDate = 'Required'
    else if (f.startDate && f.endDate < f.startDate) e.endDate = 'Ends before it starts'
    if (!(num(f.budget) > 0)) e.budget = 'Enter a budget'
    if (num(f.spent) > num(f.budget) * 1.1) e.spent = 'Spend is more than 10% over budget'
    if (num(f.clicks) > num(f.impressions) && num(f.impressions) > 0) e.clicks = 'More clicks than impressions'
    setErrors(e)
    if (Object.keys(e).length) return
    const data: Omit<Campaign, 'id' | 'code'> = {
      name: f.name.trim(),
      channel: f.channel,
      status: f.status,
      startDate: f.startDate,
      endDate: f.endDate,
      budget: num(f.budget),
      spent: num(f.spent),
      ownerId: f.ownerId,
      communitySlug: f.communitySlug || null,
      offplanProjectId: f.offplanProjectId || null,
      audience: f.audience.trim(),
      notes: f.notes.trim(),
      impressions: num(f.impressions),
      clicks: num(f.clicks),
      leads: num(f.leads),
      viewings: num(f.viewings),
      deals: num(f.deals),
      gciAttributed: num(f.gciAttributed),
    }
    if (campaign) update.mutate({ id: campaign.id, patch: data }, { onSuccess: onClose })
    else {
      const max = campaigns.collection.all().reduce((a, c) => Math.max(a, Number(c.code.split('-')[1]) || 0), 140)
      create.mutate({ ...data, code: code('CMP', max + 1, 3) }, { onSuccess: onClose })
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={campaign ? 'Edit campaign' : 'New campaign'}
      subtitle={campaign ? campaign.code : 'Plan a paid campaign and track its results'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={create.isPending || update.isPending}>
            {campaign ? 'Save changes' : 'Create campaign'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Campaign name" required error={errors.name} className="sm:col-span-2">
          {(id) => <Input id={id} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Dubai Hills villas — Meta lead ads" aria-invalid={!!errors.name} />}
        </Field>
        <Field label="Channel" required>
          {(id) => <Select id={id} value={f.channel} onChange={(e) => set('channel', e.target.value as CampaignChannel)} options={CHANNEL_OPTIONS} />}
        </Field>
        <Field label="Status">
          {(id) => <Select id={id} value={f.status} onChange={(e) => set('status', e.target.value as CampaignStatus)} options={optionsOf(CAMPAIGN_STATUS)} />}
        </Field>
        <Field label="Start date" required error={errors.startDate}>
          {(id) => <Input id={id} type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} aria-invalid={!!errors.startDate} />}
        </Field>
        <Field label="End date" required error={errors.endDate}>
          {(id) => <Input id={id} type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} aria-invalid={!!errors.endDate} />}
        </Field>
        <Field label="Budget (AED)" required error={errors.budget}>
          {(id) => <Input id={id} type="number" min={0} step={500} value={f.budget} onChange={(e) => set('budget', e.target.value)} aria-invalid={!!errors.budget} />}
        </Field>
        <Field label="Spent so far (AED)" error={errors.spent}>
          {(id) => <Input id={id} type="number" min={0} step={10} value={f.spent} onChange={(e) => set('spent', e.target.value)} aria-invalid={!!errors.spent} />}
        </Field>
        <Field label="Community" hint="Optional — area the ads target">
          {(id) => <Select id={id} value={f.communitySlug} onChange={(e) => set('communitySlug', e.target.value)} placeholder="Any / not specific" options={COMMUNITIES.map((c) => ({ value: c.slug, label: c.name }))} />}
        </Field>
        <Field label="Off-plan project" hint="Optional — launch being promoted">
          {(id) => <Select id={id} value={f.offplanProjectId} onChange={(e) => set('offplanProjectId', e.target.value)} placeholder="None" options={(projects ?? []).map((p) => ({ value: p.id, label: p.name }))} />}
        </Field>
        <Field label="Owner">
          {(id) => <Select id={id} value={f.ownerId} onChange={(e) => set('ownerId', e.target.value)} options={marketers.map((e) => ({ value: e.id, label: e.name }))} />}
        </Field>
        <Field label="Audience / targeting">
          {(id) => <Input id={id} value={f.audience} onChange={(e) => set('audience', e.target.value)} placeholder="e.g. Investors UAE & UK, 30–55" />}
        </Field>

        <div className="pt-2 sm:col-span-2">
          <h3 className="text-[13px] font-semibold">Results</h3>
          <p className="text-[12px] text-muted">Synced from the ad platforms and CRM — edit to correct.</p>
        </div>
        <Field label="Impressions">{(id) => <Input id={id} type="number" min={0} value={f.impressions} onChange={(e) => set('impressions', e.target.value)} />}</Field>
        <Field label="Clicks" error={errors.clicks}>
          {(id) => <Input id={id} type="number" min={0} value={f.clicks} onChange={(e) => set('clicks', e.target.value)} aria-invalid={!!errors.clicks} />}
        </Field>
        <Field label="Leads">{(id) => <Input id={id} type="number" min={0} value={f.leads} onChange={(e) => set('leads', e.target.value)} />}</Field>
        <Field label="Viewings">{(id) => <Input id={id} type="number" min={0} value={f.viewings} onChange={(e) => set('viewings', e.target.value)} />}</Field>
        <Field label="Deals closed">{(id) => <Input id={id} type="number" min={0} value={f.deals} onChange={(e) => set('deals', e.target.value)} />}</Field>
        <Field label="GCI attributed (AED)">{(id) => <Input id={id} type="number" min={0} step={100} value={f.gciAttributed} onChange={(e) => set('gciAttributed', e.target.value)} />}</Field>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={f.notes} onChange={(e) => set('notes', e.target.value)} />}
        </Field>
      </div>
    </Drawer>
  )
}
