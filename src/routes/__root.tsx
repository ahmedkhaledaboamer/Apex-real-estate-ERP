import { Outlet, createRootRoute, Link, redirect, useRouterState } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/misc'
import { Toaster } from '@/components/ui/Toast'
import { isAuthenticated } from '@/lib/auth'

/** Pages shown without the app shell (sidebar/top bar) and without signing in. */
const PUBLIC_PATHS = ['/login']

export const Route = createRootRoute({
  // Everything except the login page needs a session; signed-in users skip the login page.
  beforeLoad: ({ location }) => {
    const isPublic = PUBLIC_PATHS.includes(location.pathname)
    const authed = isAuthenticated()
    if (!authed && !isPublic) {
      const target = location.href === '/' ? undefined : location.href
      throw redirect({ to: '/login', search: { redirect: target } as never, replace: true })
    }
    if (authed && isPublic) throw redirect({ to: '/', replace: true })
  },
  component: RootLayout,
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

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (PUBLIC_PATHS.includes(pathname))
    return (
      <>
        <Outlet />
        <Toaster />
      </>
    )
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
