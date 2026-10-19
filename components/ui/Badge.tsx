import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'crimson' | 'blue' | 'teal' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  size?: 'sm' | 'md';
}

export function Badge({
  className = '',
  variant = 'crimson',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    crimson: 'bg-red-50 text-red-800 border-red-200/90',
    blue: 'bg-sky-50 text-sky-800 border-sky-200/90',
    teal: 'bg-teal-50 text-teal-800 border-teal-200/90',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/90',
    rose: 'bg-rose-50 text-rose-800 border-rose-200/90',
    purple: 'bg-purple-50 text-purple-800 border-purple-200/90',
    slate: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-0.5 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
