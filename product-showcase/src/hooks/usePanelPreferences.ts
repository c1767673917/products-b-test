import { useState, useEffect } from 'react';

interface PanelPreferences {
  width: number;
  isOpen: boolean;
}

const DEFAULT_PREFERENCES: PanelPreferences = {
  width: 400,
  isOpen: false
};

const STORAGE_KEY = 'product-detail-panel-preferences';

export const usePanelPreferences = () => {
  const [preferences, setPreferences] = useState<PanelPreferences>(DEFAULT_PREFERENCES);

  // 从 localStorage 加载偏好设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences(prev => ({
          ...prev,
          ...parsed,
          // 确保宽度在合理范围内
          width: Math.max(300, Math.min(800, parsed.width || DEFAULT_PREFERENCES.width))
        }));
      }
    } catch (error) {
      console.warn('Failed to load panel preferences:', error);
    }
  }, []);

  // 保存偏好设置到 localStorage
  const savePreferences = (newPreferences: Partial<PanelPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save panel preferences:', error);
    }
  };

  // 设置面板宽度
  const setPanelWidth = (width: number) => {
    const constrainedWidth = Math.max(300, Math.min(800, width));
    savePreferences({ width: constrainedWidth });
  };

  // 设置面板开关状态
  const setPanelOpen = (isOpen: boolean) => {
    savePreferences({ isOpen });
  };

  // 重置为默认设置
  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to reset panel preferences:', error);
    }
  };

  return {
    preferences,
    setPanelWidth,
    setPanelOpen,
    resetPreferences
  };
};

export default usePanelPreferences;