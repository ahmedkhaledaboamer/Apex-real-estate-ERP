import { Link, type LinkProps } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand-gradient text-white shadow-[0_6px_16px_-6px_rgb(132_63_150/0.6)] hover:brightness-110',
  secondary: 'bg-plum text-white hover:bg-indigo dark:bg-surface-2 dark:hover:bg-line',
  outline: 'border border-line bg-surface text-fg hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white hover:brightness-110',
  soft: 'bg-aura/10 text-aura hover:bg-aura/15 dark:bg-aura/20 dark:text-[#d6a8e3]',
}
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[12.5px]',
  md: 'h-10 gap-2 rounded-[10px] px-4 text-[13.5px]',
  lg: 'h-11 gap-2 rounded-xl px-5 text-[14px]',
  icon: 'size-10 rounded-[10px]',
  'icon-sm': 'size-8 rounded-lg',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition-[background-color,color,filter,scale,box-shadow] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    VARIANT[variant],
    SIZE[size],
    className,
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
    </button>
  )
})

/** Router link styled as a button. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: LinkProps & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  )
}
