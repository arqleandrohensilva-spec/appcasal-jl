import { useMemo } from 'react';
import { useData } from '@/lib/store';
import { useAppContext } from '@/lib/context';
import { computeScore } from '@/lib/score';

export function useScore(profileOverride?: 'leandro' | 'jonathan' | 'casal') {
  const { activeProfile } = useAppContext();
  const { cards, accounts, transactions, goals, contributions, budgets } = useData();
  const profile = profileOverride ?? activeProfile;
  return useMemo(
    () => computeScore({ profile, cards, accounts, transactions, goals, contributions, budgets }),
    [profile, cards, accounts, transactions, goals, contributions, budgets],
  );
}
