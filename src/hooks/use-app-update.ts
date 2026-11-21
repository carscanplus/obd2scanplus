import { useState, useCallback, useEffect } from "react";
import { checkForUpdate, getCurrentAppVersion, UpdateInfo } from "@/services/updater";

export function useAppUpdate(autoCheckOnMount = true) {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const check = useCallback(async (showModalIfNoUpdate = false) => {
    setChecking(true);
    try {
      const info = await checkForUpdate();
      setUpdateInfo(info);
      if (info.hasUpdate || showModalIfNoUpdate) {
        setIsModalOpen(true);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (autoCheckOnMount) {
      // Retrasar 2 segundos para no interferir con la carga inicial
      const timer = setTimeout(() => {
        check(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoCheckOnMount, check]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    checking,
    updateInfo,
    isModalOpen,
    check,
    closeModal,
    currentVersion: getCurrentAppVersion(),
  };
}
