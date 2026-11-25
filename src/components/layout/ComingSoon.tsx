import { Hammer } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState, PageHeader } from '@/components/ui/misc'

/** Temporary placeholder for screens that are being built. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={<Hammer />} title="Being built" message="This screen is part of the next delivery." />
      </Card>
    </>
  )
}
