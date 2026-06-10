import { useAppContext } from '@/context/AppContext';
import { canAccess } from '@/config/accessTiers';

export function useTierFlags() {
  const { userTier } = useAppContext();
  return {
    isEveryday:     userTier === 'everyday',
    isPower:        userTier === 'power',
    isPowerOrAbove: canAccess('power',  userTier),
    isAdminOrAbove: canAccess('admin',  userTier),
    isSuperAdmin:   userTier === 'superadmin',
    tier:           userTier,
  };
}
