// Static Tailwind class maps per profile accent.
// Tailwind v4 only generates classes that appear literally in source — never `text-${x}-600`.

export type AccentName = 'purple' | 'emerald' | 'orange';

export interface AccentClasses {
  text: string;
  bg: string;
  bgHover: string;
  border: string;
  borderHover: string;
  ring: string;
  bgSoft: string;
  bgSoftHover: string;
  textSoft: string;
}

export const ACCENT: Record<AccentName, AccentClasses> = {
  purple: {
    text: 'text-purple-600',
    bg: 'bg-purple-600',
    bgHover: 'hover:bg-purple-700',
    border: 'border-purple-300',
    borderHover: 'hover:border-purple-500',
    ring: 'ring-purple-400',
    bgSoft: 'bg-purple-100',
    bgSoftHover: 'hover:bg-purple-50/30',
    textSoft: 'text-purple-500',
  },
  emerald: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    border: 'border-emerald-300',
    borderHover: 'hover:border-emerald-500',
    ring: 'ring-emerald-400',
    bgSoft: 'bg-emerald-100',
    bgSoftHover: 'hover:bg-emerald-50/30',
    textSoft: 'text-emerald-500',
  },
  orange: {
    text: 'text-orange-600',
    bg: 'bg-orange-600',
    bgHover: 'hover:bg-orange-700',
    border: 'border-orange-300',
    borderHover: 'hover:border-orange-500',
    ring: 'ring-orange-400',
    bgSoft: 'bg-orange-100',
    bgSoftHover: 'hover:bg-orange-50/30',
    textSoft: 'text-orange-500',
  },
};

export function accentFor(profile: 'leandro' | 'jonathan' | 'casal'): AccentClasses {
  if (profile === 'leandro') return ACCENT.purple;
  if (profile === 'jonathan') return ACCENT.emerald;
  return ACCENT.orange;
}
