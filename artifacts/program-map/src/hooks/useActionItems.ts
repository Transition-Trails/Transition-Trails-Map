import { useMemo } from 'react';
import { recommendations, type RecPriority } from '@/data/operationalIntelligenceData';
import { useAppContext, type RecOverride } from '@/context/AppContext';

export function useActionItems() {
  const { actionItemOverrides, setActionItemOverride, resetActionItemOverrides, platformRoles } =
    useAppContext();

  const mergedRecs = useMemo(() => {
    const pennyAssigned = platformRoles.find(r => r.id === 'penny-admin')?.owner.trim();
    const unassigned    = platformRoles.filter(r => !r.owner.trim()).length;

    return recommendations
      .filter(r => !(r.id === 'rec-1' && pennyAssigned))
      .filter(r => !(r.id === 'rec-4' && unassigned === 0))
      .map(r => {
        const base =
          r.id === 'rec-4'
            ? { ...r, action: `Assign Owners to ${unassigned} Unowned Role${unassigned !== 1 ? 's' : ''}` }
            : r;
        const ov = actionItemOverrides[r.id];
        return ov ? { ...base, ...ov } : base;
      });
  }, [actionItemOverrides, platformRoles]);

  const visibleRecs = useMemo(
    () => mergedRecs.filter(r => r.status !== 'resolved' && r.status !== 'dismissed'),
    [mergedRecs],
  );

  function setItemStatus(id: string, status: 'open' | 'resolved' | 'dismissed') {
    setActionItemOverride(id, { ...actionItemOverrides[id], status });
  }

  function setItemPriority(id: string, priority: RecPriority) {
    setActionItemOverride(id, { ...actionItemOverrides[id], priority });
  }

  return {
    mergedRecs,
    visibleRecs,
    setItemStatus,
    setItemPriority,
    resetActionItemOverrides,
    actionItemOverrides,
  };
}

export type { RecOverride };
