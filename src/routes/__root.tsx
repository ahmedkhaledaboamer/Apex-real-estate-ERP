import { Outlet, createRootRoute, Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/misc'

export const Route = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
  notFoundComponent: () => (
    <Card>
      <EmptyState
        icon={<Compass />}
        title="Page not found"
        message="The page you are looking for does not exist."
        action={
          <Link to="/" className={buttonClass()}>
            Back to dashboard
          </Link>
        }
      />
    </Card>
  ),
})
