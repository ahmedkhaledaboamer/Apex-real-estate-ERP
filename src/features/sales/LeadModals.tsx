import { useNavigate } from '@tanstack/react-router'
import { Link2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PersonCell } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Overlay'
import { toast } from '@/components/ui/Toast'
import { CUSTOMER_TYPE, LEAD_INTEREST } from '@/lib/labels'
import { customers } from '@/mocks/core'
import { leads } from '@/mocks/domain'
import type { Lead } from '@/types/domain'
import { CUSTOMER_TYPE_TONE, INTEREST_TO_CUSTOMER, LOST_REASONS } from './labels'
import { nextCode } from './shared'
import { materializeSeeds } from '@/mocks/sales'

const digits = (p: string) => p.replace(/\D/g, '').slice(-9)

/** Ask why a lead was lost, then move it to Lost. */
export function LostModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const update = leads.useUpdate({ silent: true })
  const [reason, setReason] = useState(LOST_REASONS[0]!)
  const [other, setOther] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (lead) {
      setReason(LOST_REASONS[0]!)
      setOther('')
      setError('')
    }
  }, [lead])
  const save = () => {
    if (!lead) return
    const text = reason === 'other' ? other.trim() : reason
    if (!text) return setError('Tell us why')
    update.mutate({ id: lead.id, patch: { stage: 'lost', lostReason: text, lastActivityAt: new Date().toISOString() } }, { onSuccess: () => (toast.info(`${lead.name} marked as lost`), onClose()) })
  }
  return (
    <Modal
      open={!!lead}
      onClose={onClose}
      title="Mark lead as lost"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={save} loading={update.isPending}>
            Mark lost
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[13.5px] text-muted">Why did {lead?.name} not go ahead? Reasons feed the lost-lead report.</p>
        <Field label="Reason" required>
          {(id) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)} options={[...LOST_REASONS.map((r) => ({ value: r, label: r })), { value: 'other', label: 'Other…' }]} />}
        </Field>
        {reason === 'other' && (
          <Field label="Details" required error={error}>
            {(id) => <Input id={id} value={other} onChange={(e) => (setOther(e.target.value), setError(''))} placeholder="Short reason" aria-invalid={!!error} autoFocus />}
          </Field>
        )}
      </div>
    </Modal>
  )
}

/**
 * Convert a lead into a client: links an existing client with the same email/phone, otherwise creates one
 * of the right type (buy/off-plan → buyer, rent → tenant, sell → seller, list for rent → landlord).
 * The lead is marked Won with `customerId`.
 */
export function ConvertModal({ lead, onClose, onConverted }: { lead: Lead | null; onClose: () => void; onConverted?: (customerId: string) => void }) {
  const { data: custs = [] } = customers.useList()
  const create = customers.useCreate()
  const updateLead = leads.useUpdate({ silent: true })
  const navigate = useNavigate()
  const [mode, setMode] = useState<'link' | 'new'>('new')

  const match = useMemo(() => {
    if (!lead) return undefined
    const email = lead.email.trim().toLowerCase()
    const phone = digits(lead.phone)
    return custs.find((c) => (email && c.email.toLowerCase() === email) || (phone.length >= 7 && digits(c.phone) === phone))
  }, [lead, custs])
  useEffect(() => setMode(match ? 'link' : 'new'), [match, lead])

  if (!lead) return null
  const type = INTEREST_TO_CUSTOMER[lead.interest]

  const finish = (customerId: string, created: boolean) => {
    updateLead.mutate(
      { id: lead.id, patch: { stage: 'won', customerId, lastActivityAt: new Date().toISOString() } },
      {
        onSuccess: () => {
          toast.success(created ? `${lead.name} converted to a ${CUSTOMER_TYPE[type].toLowerCase()}` : `${lead.name} linked to an existing client`)
          onClose()
          if (onConverted) onConverted(customerId)
          else navigate({ to: '/sales/clients/$clientId', params: { clientId: customerId } })
        },
      },
    )
  }

  const convert = () => {
    materializeSeeds()
    if (mode === 'link' && match) return finish(match.id, false)
    create.mutate(
      {
        code: nextCode('CL', custs, 0),
        name: lead.name,
        type,
        email: lead.email,
        phone: lead.phone,
        nationality: '—',
        city: 'Dubai',
        ownerId: lead.ownerId,
        createdAt: new Date().toISOString(),
        tags: [lead.interest === 'offplan' ? 'Off-plan' : 'From lead'],
        avatarHue: Math.floor(Math.random() * 360),
      },
      { onSuccess: (c) => finish(c.id, true) },
    )
  }

  return (
    <Modal
      open={!!lead}
      onClose={onClose}
      title="Convert to client"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={convert} loading={create.isPending || updateLead.isPending} icon={mode === 'link' ? <Link2 /> : <UserPlus />}>
            {mode === 'link' ? 'Link & mark won' : 'Create client & mark won'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[13.5px] text-muted">
          {lead.name} ({LEAD_INTEREST[lead.interest].toLowerCase()}) becomes a client and the lead moves to Won.
        </p>
        {match && (
          <button type="button" onClick={() => setMode('link')} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-start transition-colors ${mode === 'link' ? 'border-aura bg-aura/5' : 'border-line hover:bg-surface-2'}`}>
            <div className="min-w-0">
              <p className="mb-1.5 text-[11.5px] font-semibold text-muted uppercase">Existing client — same email / phone</p>
              <PersonCell name={match.name} hue={match.avatarHue} sub={`${match.code} · ${match.email}`} size={32} />
            </div>
            <StatusBadge value={match.type} map={CUSTOMER_TYPE_TONE} />
          </button>
        )}
        <button type="button" onClick={() => setMode('new')} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-start transition-colors ${mode === 'new' ? 'border-aura bg-aura/5' : 'border-line hover:bg-surface-2'}`}>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold">Create a new client</p>
            <p className="truncate text-[12px] text-muted">
              {lead.email || lead.phone} · owner stays with the lead's broker
            </p>
          </div>
          <StatusBadge value={type} map={CUSTOMER_TYPE_TONE} />
        </button>
      </div>
    </Modal>
  )
}
