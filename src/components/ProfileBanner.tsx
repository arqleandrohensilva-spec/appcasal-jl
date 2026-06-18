import { Users, User } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { accentFor } from '@/lib/accent';
import { cn } from '@/lib/utils';

export function ProfileBanner() {
  const { activeProfile } = useAppContext();
  const a = accentFor(activeProfile);
  const isCasal = activeProfile === 'casal';
  const Icon = isCasal ? Users : User;

  const label = isCasal
    ? 'Vendo dados do casal (Leandro + Jonathan)'
    : `Vendo apenas dados de ${activeProfile.charAt(0).toUpperCase() + activeProfile.slice(1)}`;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 mb-4 text-sm',
        a.border, a.bgSoft, a.text,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-medium truncate">{label}</span>
    </div>
  );
}
