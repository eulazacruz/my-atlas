'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useUI } from '@/components/providers/UIProvider';
import type { Profile } from '@/lib/types';
import { cn, initials } from '@/lib/utils';

/* ───────── Superfícies ───────── */
export function Glass({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp onClick={onClick} whileTap={onClick ? { scale: 0.98 } : undefined} className={cn('glass block w-full text-left', className)}>
      {children}
    </Comp>
  );
}

export function Section({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mb-7', className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between px-1">
          {title && <h2 className="label">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: ReactNode; back?: boolean }) {
  const { back: goBack } = useUI();
  return (
    <header className="mb-6 pt-[calc(3.6rem+var(--sat,env(safe-area-inset-top)))]">
      {back && (
        <button onClick={goBack} className="-ml-1 mb-2 flex items-center gap-0.5 text-[15px] font-medium muted active:opacity-60">
          <ChevronLeft size={20} /> Voltar
        </button>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {subtitle && <p className="mb-0.5 truncate text-[13px] muted first-letter:uppercase">{subtitle}</p>}
          <h1 className="text-[30px] font-bold leading-[1.08] tracking-[-0.035em] [overflow-wrap:anywhere]">{title}</h1>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
    </header>
  );
}

/* ───────── Botões ───────── */
export function IconButton({ label, onClick, children, className }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <motion.button whileTap={{ scale: 0.88 }} aria-label={label} title={label} onClick={onClick} className={cn('glass grid h-10 w-10 place-items-center !rounded-full', className)}>
      {children}
    </motion.button>
  );
}

export function Button({
  children, onClick, variant = 'secondary', className, disabled, type = 'button',
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; className?: string; disabled?: boolean; type?: 'button' | 'submit';
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.96 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors disabled:opacity-35',
        variant === 'primary' && 'bg-black text-white dark:bg-white dark:text-black',
        variant === 'secondary' && 'bg-black/[0.06] dark:bg-white/[0.08]',
        variant === 'ghost' && 'muted',
        variant === 'danger' && 'bg-red-500/10 text-red-600 dark:text-red-400',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors',
        active ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/[0.05] text-black/70 dark:bg-white/[0.07] dark:text-white/75',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function CheckCircle({ checked, onClick, size = 24 }: { checked: boolean; onClick?: () => void; size?: number }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-pressed={checked}
      className={cn(
        'grid shrink-0 place-items-center rounded-full transition-colors',
        checked ? 'bg-black text-white dark:bg-white dark:text-black' : 'ring-[1.5px] ring-inset ring-black/25 dark:ring-white/30',
      )}
      style={{ width: size, height: size }}
    >
      {checked && <Check size={size * 0.6} strokeWidth={3} />}
    </motion.button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors', checked ? 'bg-black dark:bg-white' : 'bg-black/10 dark:bg-white/15')}
    >
      <motion.span
        className={cn('absolute top-[3px] h-6 w-6 rounded-full shadow-md', checked ? 'bg-white dark:bg-black' : 'bg-white')}
        animate={{ left: checked ? 23 : 3 }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      />
    </button>
  );
}

export function Segmented<T extends string>({ options, value, onChange, id }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div className="glass-thin flex p-1 !rounded-full">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn('relative h-9 flex-1 rounded-full text-[13px] font-semibold transition-colors', value === o.value ? '' : 'muted')}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-white/[0.14]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ───────── Dados ───────── */
export function Avatar({ profile, name, size = 36, ring }: { profile?: Profile | null; name?: string; size?: number; ring?: boolean }) {
  const label = profile?.displayName ?? name ?? '?';
  const isB = profile?.role === 'B';
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold',
        isB ? 'bg-neutral-300 text-black dark:bg-neutral-700 dark:text-white' : 'bg-black text-white dark:bg-white dark:text-black',
        ring && 'ring-2 ring-black/80 ring-offset-2 ring-offset-[var(--ring-gap)] dark:ring-white/80',
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt={label} className="h-full w-full object-cover grayscale-[0.2]" referrerPolicy="no-referrer" />
      ) : (
        initials(label) || '?'
      )}
    </span>
  );
}

export function Progress({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.09]', className)}>
      <motion.div
        className="h-full rounded-full bg-black dark:bg-white"
        style={color ? { background: color } : undefined}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
      />
    </div>
  );
}

export function Empty({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center px-6 py-9 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-black/[0.05] dark:bg-white/[0.07]">{icon}</div>
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-[13px] muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export function Row({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline', onClick && 'cursor-pointer active:bg-black/[0.03] dark:active:bg-white/[0.03]', className)}
    >
      {children}
    </div>
  );
}

/* ───────── Bottom Sheet ───────── */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[32px] bg-white/85 backdrop-blur-3xl backdrop-saturate-150 shadow-[0_-1px_0_rgba(255,255,255,0.9)_inset] dark:bg-[#111]/85 dark:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            dragListener
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/20" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <h3 className="text-[19px] font-bold tracking-tight">{title}</h3>
              <button onClick={onClose} className="text-[15px] font-medium muted">
                Fechar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
            {footer && <div className="border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 hairline">{footer}</div>}
            {!footer && <div className="pb-[max(1rem,env(safe-area-inset-bottom))]" />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
