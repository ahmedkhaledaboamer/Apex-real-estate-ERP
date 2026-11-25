import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, BadgeCheck, Building2, Eye, EyeOff, KeyRound, Lock, Mail, MapPin, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { IMG, srcSetOf } from '@/assets/images'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Overlay'
import { toast } from '@/components/ui/Toast'
import { DEMO_EMAIL, DEMO_PASSWORD, signIn, type SignInError } from '@/lib/auth'
import { cn } from '@/lib/cn'

const ERRORS: Record<SignInError, string> = {
  'unknown-email': 'No account found with this e-mail address.',
  'wrong-password': 'The password is incorrect. Please try again.',
  inactive: 'This account has been deactivated. Contact your administrator.',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Sign-in screen: Dubai skyline visual on the left, the form on the right (stacked on phones). */
export function LoginPage({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [forgotOpen, setForgotOpen] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Sign in · Apex Aora Real Estate ERP'
    emailRef.current?.focus()
  }, [])

  const emailError = touched && !EMAIL_RE.test(email.trim()) ? 'Enter a valid e-mail address.' : null
  const passwordError = touched && password.length === 0 ? 'Enter your password.' : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    setError(null)
    if (!EMAIL_RE.test(email.trim()) || !password) {
      setShake((s) => s + 1)
      return
    }
    setLoading(true)
    const res = await signIn(email, password, remember)
    setLoading(false)
    if (!res.ok) {
      setError(ERRORS[res.error])
      setShake((s) => s + 1)
      return
    }
    toast.success('Welcome back')
    const target = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('/login') ? redirectTo : '/'
    navigate({ to: target, replace: true })
  }

  const fillDemo = () => {
    setEmail(DEMO_EMAIL)
    setPassword(DEMO_PASSWORD)
    setError(null)
    setTouched(false)
  }

  return (
    <div className="grid min-h-svh grid-cols-[minmax(0,1fr)] bg-bg lg:grid-cols-[1.08fr_1fr]">
      {/* ------------------------------------------------------------ */}
      {/*  Visual: Dubai skyline + property glass cards                 */}
      {/* ------------------------------------------------------------ */}
      <aside className="relative isolate h-[330px] overflow-hidden sm:h-[380px] lg:sticky lg:top-0 lg:h-svh">
        <img
          src={IMG.hero}
          srcSet={srcSetOf(IMG.hero)}
          sizes="(min-width: 1024px) 54vw, 100vw"
          alt="Dubai skyline with Burj Khalifa at sunset"
          {...{ fetchpriority: 'high' }}
          decoding="async"
          className="absolute inset-0 -z-20 size-full animate-[login-zoom_24s_ease-out_both] object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgb(56_26_76/0.78)_0%,rgb(86_61_150/0.45)_45%,rgb(28_18_38/0.86)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-[#140c1d]/90 to-transparent" />

        <div className="flex h-full flex-col justify-between p-6 pb-14 text-white sm:p-8 sm:pb-16 lg:p-12">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div className="leading-none">
              <div className="font-display text-[23px] font-semibold tracking-[0.01em]">Apex Aora</div>
              <div className="mt-1 text-[9.5px] font-semibold tracking-[0.3em] text-white/60">REAL ESTATE · DUBAI</div>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-[560px]">
            <p className="hidden items-center gap-2.5 text-[11.5px] font-semibold tracking-[0.22em] text-white/80 sm:flex">
              <span className="h-px w-8 bg-cyan" />
              RERA-LICENSED BROKERAGE · ERP
            </p>
            <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-semibold tracking-[-0.01em] text-balance sm:text-[44px] lg:mt-4 lg:text-[56px]">
              Every deal in Dubai,
              <br className="hidden sm:block" /> one place to run it.
            </h2>
            <p className="mt-4 hidden max-w-md text-[15px] leading-relaxed text-white/75 sm:block">Listings, leads, viewings, commissions and finance for the Apex Aora team — from the first enquiry to the title deed.</p>

            {/* Feature chips */}
            <ul className="mt-6 hidden flex-wrap gap-2 lg:flex">
              {[
                [Building2, 'Listings & off-plan'],
                [TrendingUp, 'Commission tracking'],
                [ShieldCheck, 'RERA & DLD ready'],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Building2
                return (
                  <li key={label as string} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[12.5px] font-medium backdrop-blur-md">
                    <I className="size-3.5 text-cyan" />
                    {label as string}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Glass cards (desktop) */}
          <div className="hidden items-end gap-4 lg:flex">
            <figure className="w-[300px] animate-rise overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl [animation-delay:200ms]">
              <div className="relative aspect-[16/9]">
                <img src={IMG.villa} srcSet={srcSetOf(IMG.villa)} sizes="300px" alt="Beachfront villa with pool on Palm Jumeirah" loading="lazy" decoding="async" className="size-full object-cover" />
                <span className="absolute start-3 top-3 rounded-full bg-success px-2.5 py-0.5 text-[11px] font-bold">Closed</span>
              </div>
              <figcaption className="p-4">
                <p className="text-[14px] font-semibold">Signature beachfront villa</p>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-white/70">
                  <MapPin className="size-3.5" /> Palm Jumeirah · 6 beds · 9,500 sq ft
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-[12.5px]">
                  <span className="text-white/70">Commission</span>
                  <span className="font-bold tabular">AED 840,000</span>
                </div>
              </figcaption>
            </figure>

            <div className="flex flex-col gap-4">
              <div className="flex animate-rise items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-xl [animation-delay:350ms]">
                <span className="grid size-10 place-items-center rounded-xl bg-success/25 text-[#7ee2b0]">
                  <TrendingUp className="size-5" />
                </span>
                <div>
                  <p className="text-[11.5px] text-white/70">Commission income · this quarter</p>
                  <p className="text-[18px] font-bold tabular">
                    AED 8.4M <span className="text-[12px] font-semibold text-[#7ee2b0]">+18%</span>
                  </p>
                </div>
              </div>
              <div className="flex animate-rise gap-2 [animation-delay:500ms]">
                {[
                  [IMG.palm, 'Palm Jumeirah aerial view'],
                  [IMG.marina, 'Dubai Marina at dusk'],
                  [IMG.living, 'Bright living room with skyline view'],
                ].map(([src, alt]) => (
                  <img key={alt} src={src} srcSet={srcSetOf(src)} sizes="96px" alt={alt} loading="lazy" decoding="async" className="size-[88px] rounded-xl border border-white/25 object-cover shadow-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------ */}
      {/*  Form                                                          */}
      {/* ------------------------------------------------------------ */}
      <main className="relative -mt-8 flex items-center justify-center rounded-t-[28px] bg-bg px-5 pt-10 pb-10 sm:px-8 lg:mt-0 lg:rounded-none lg:px-12 lg:py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-aura/10 px-3 py-1 text-[12px] font-semibold text-aura dark:text-[#d6a8e3]">
              <Sparkles className="size-3.5" /> Team portal
            </span>
            <h1 className="mt-4 text-[30px] leading-tight font-bold tracking-[-0.02em]">Welcome back</h1>
            <p className="mt-1.5 text-[14px] text-muted">Sign in with your Apex Aora work account to continue.</p>
          </div>

          <form key={shake} noValidate onSubmit={submit} className={cn('space-y-4', shake > 0 && 'animate-[login-shake_0.4s_ease-in-out]')}>
            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/8 px-3.5 py-3 text-[13px] font-medium text-danger dark:text-[#f07f7f]">
                <Lock className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[12.5px] font-semibold text-fg/85">
                Work e-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@apexaora.ae"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  className="h-12 w-full rounded-xl border border-line bg-surface ps-11 pe-3.5 text-[14px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 hover:border-aura/40 focus:border-aura focus:ring-3 focus:ring-aura/15 aria-[invalid=true]:border-danger"
                />
              </div>
              {emailError && (
                <p id="email-error" className="text-[12px] text-danger">
                  {emailError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[12.5px] font-semibold text-fg/85">
                  Password
                </label>
                <button type="button" onClick={() => setForgotOpen(true)} className="text-[12.5px] font-semibold text-aura hover:underline dark:text-[#d6a8e3]">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className="h-12 w-full rounded-xl border border-line bg-surface ps-11 pe-12 text-[14px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 hover:border-aura/40 focus:border-aura focus:ring-3 focus:ring-aura/15 aria-[invalid=true]:border-danger"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute end-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  aria-pressed={show}
                >
                  {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-[12px] text-danger">
                  {passwordError}
                </p>
              )}
            </div>

            <Checkbox label={<span className="text-muted">Keep me signed in on this device</span>} checked={remember} onChange={(e) => setRemember(e.target.checked)} />

            <Button type="submit" size="lg" loading={loading} className="h-12 w-full text-[14.5px]">
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight className="rtl:rotate-180" />}
            </Button>
          </form>

          {/* Demo account */}
          <div className="mt-6 rounded-2xl border border-dashed border-aura/35 bg-aura/5 p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-aura/12 text-aura dark:text-[#d6a8e3]">
                <BadgeCheck className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">Demo account</p>
                <p className="mt-0.5 text-[12.5px] break-words text-muted">
                  {DEMO_EMAIL} · <span className="font-mono">{DEMO_PASSWORD}</span>
                </p>
              </div>
              <Button variant="soft" size="sm" onClick={fillDemo}>
                Use
              </Button>
            </div>
          </div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted">
            <ShieldCheck className="size-3.5" />
            Protected access · Apex Aora Real Estate LLC · RERA ORN 28451
          </p>
        </div>
      </main>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset your password"
        footer={
          <>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setForgotOpen(false)
                toast.success('If the e-mail is registered, a reset link is on its way')
              }}
            >
              Send reset link
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">Enter your work e-mail and we will send you a link to choose a new password.</p>
        <div className="relative mt-4">
          <Mail className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
          <input
            type="email"
            defaultValue={email}
            placeholder="name@apexaora.ae"
            aria-label="Work e-mail"
            className="h-11 w-full rounded-xl border border-line bg-surface ps-11 pe-3.5 text-[14px] outline-none focus:border-aura focus:ring-3 focus:ring-aura/15"
          />
        </div>
      </Modal>
    </div>
  )
}
