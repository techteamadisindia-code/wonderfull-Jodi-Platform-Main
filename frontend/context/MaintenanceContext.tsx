'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
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
};

const MaintenanceContext = createContext<MaintenanceContextType>({
  maintenance: defaultMaintenance,
  loading: false,
  isBannerDismissed: false,
  dismissBanner: () => {},
  refreshMaintenance: async () => {},
});

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState<PublicMaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const pathname = usePathname();

  const loadMaintenanceStatus = useCallback(async () => {
    try {
      const data = await fetchPublicMaintenanceStatus();
      setMaintenance(data);
    } catch (error) {
      console.warn('Could not fetch maintenance status, using default:', error);
      setMaintenance(defaultMaintenance);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaintenanceStatus();
  }, [loadMaintenanceStatus]);

  const dismissBanner = () => {
    setIsBannerDismissed(true);
  };

  const refreshMaintenance = async () => {
    await loadMaintenanceStatus();
  };

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
