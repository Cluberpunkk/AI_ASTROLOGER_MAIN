import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Check if we're in a Capacitor native context
const isNative = typeof (window as any).Capacitor !== 'undefined';

export const useHaptics = () => {
  const impact = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      if (isNative) {
        const styleMap = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        };
        await Haptics.impact({ style: styleMap[style] });
      } else if ('vibrate' in navigator) {
        // Web fallback - short vibration
        const duration = style === 'light' ? 10 : style === 'medium' ? 25 : 50;
        navigator.vibrate(duration);
      }
    } catch (error) {
      // Silently fail - haptics not available
    }
  };

  const notification = async (type: 'success' | 'warning' | 'error' = 'success') => {
    try {
      if (isNative) {
        const typeMap = {
          success: NotificationType.Success,
          warning: NotificationType.Warning,
          error: NotificationType.Error,
        };
        await Haptics.notification({ type: typeMap[type] });
      } else if ('vibrate' in navigator) {
        // Web fallback
        const patterns = {
          success: [30, 50, 30],
          warning: [50, 30, 50],
          error: [100, 50, 100],
        };
        navigator.vibrate(patterns[type]);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const selectionStart = async () => {
    try {
      if (isNative) {
        await Haptics.selectionStart();
      }
    } catch (error) {
      // Silently fail
    }
  };

  const selectionChanged = async () => {
    try {
      if (isNative) {
        await Haptics.selectionChanged();
      }
    } catch (error) {
      // Silently fail
    }
  };

  const selectionEnd = async () => {
    try {
      if (isNative) {
        await Haptics.selectionEnd();
      }
    } catch (error) {
      // Silently fail
    }
  };

  return {
    impact,
    notification,
    selectionStart,
    selectionChanged,
    selectionEnd,
  };
};
