'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { fetchPublicMaintenanceStatus, PublicMaintenanceData } from '../services/adminApi';

interface MaintenanceContextType {
  maintenance: PublicMaintenanceData | null;
  loading: boolean;
  isBannerDismissed: boolean;
  dismissBanner: () => void;
  refreshMaintenance: () => Promise<void>;
}

const defaultMaintenance: PublicMaintenanceData = {
  enabled: false,
  banner: false,
  title: "We'll Be Back Soon",
  message: 'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
  estimatedEndTime: null,
  allowAdminAccess: true,
  allowNewRegistrations: true,
};

const MaintenanceContext = createContext<MaintenanceContextType>({
  maintenance: defaultMaintenance,
  loading: false,
  isBannerDismissed: false,
  dismissBanner: () => {},
  refreshMaintenance: async () => {},
});

const BANNER_STORAGE_KEY = 'wj_dismissed_banner_sig';

function getBannerSignature(data: PublicMaintenanceData | null): string {
  if (!data || !data.banner) return '';
  return `${data.title || ''}|${data.message || ''}|${data.estimatedEndTime || ''}`;
}

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState<PublicMaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(BANNER_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  const loadMaintenanceStatus = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const data = await fetchPublicMaintenanceStatus();
      if (!isMountedRef.current) return;

      setMaintenance((prev) => {
        if (
          prev &&
          prev.enabled === data.enabled &&
          prev.banner === data.banner &&
          prev.title === data.title &&
          prev.message === data.message &&
          prev.estimatedEndTime === data.estimatedEndTime &&
          prev.allowAdminAccess === data.allowAdminAccess &&
          prev.allowNewRegistrations === data.allowNewRegistrations
        ) {
          return prev;
        }
        return data;
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      console.warn('Could not fetch maintenance status, preserving last-known state:', error);
      setMaintenance((prev) => prev || defaultMaintenance);
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadMaintenanceStatus();

    const intervalId = setInterval(() => {
      loadMaintenanceStatus();
    }, 15000); // 15-second non-aggressive periodic refresh

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMaintenanceStatus();
      }
    };

    const handleFocus = () => {
      loadMaintenanceStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadMaintenanceStatus]);

  const currentBannerSignature = getBannerSignature(maintenance);
  const isBannerDismissed = Boolean(
    currentBannerSignature && dismissedSignature === currentBannerSignature
  );

  const dismissBanner = useCallback(() => {
    if (!currentBannerSignature) return;
    setDismissedSignature(currentBannerSignature);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(BANNER_STORAGE_KEY, currentBannerSignature);
      } catch {}
    }
  }, [currentBannerSignature]);

  const refreshMaintenance = useCallback(async () => {
    await loadMaintenanceStatus();
  }, [loadMaintenanceStatus]);

  return (
    <MaintenanceContext.Provider
      value={{
        maintenance,
        loading,
        isBannerDismissed,
        dismissBanner,
        refreshMaintenance,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}
