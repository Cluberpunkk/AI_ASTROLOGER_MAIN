import { useState, useEffect, useCallback, useRef } from 'react';

interface NetworkState {
  isOnline: boolean;
  isConnecting: boolean;
  lastOnlineAt: Date | null;
  reconnectAttempts: number;
}

interface UseNetworkStatusOptions {
  onOnline?: () => void;
  onOffline?: () => void;
  onReconnect?: () => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export const useNetworkStatus = (options: UseNetworkStatusOptions = {}) => {
  const {
    onOnline,
    onOffline,
    onReconnect,
    maxReconnectAttempts = 3,
    reconnectDelay = 3000,
  } = options;

  const [state, setState] = useState<NetworkState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnecting: false,
    lastOnlineAt: null,
    reconnectAttempts: 0,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasOfflineRef = useRef(false);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const handleOnline = useCallback(() => {
    clearReconnectTimeout();
    
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = false;

    setState(prev => ({
      ...prev,
      isOnline: true,
      isConnecting: false,
      lastOnlineAt: new Date(),
      reconnectAttempts: 0,
    }));

    if (wasOffline) {
      onReconnect?.();
    }
    onOnline?.();
  }, [onOnline, onReconnect, clearReconnectTimeout]);

  const handleOffline = useCallback(() => {
    wasOfflineRef.current = true;
    
    setState(prev => ({
      ...prev,
      isOnline: false,
      isConnecting: true,
    }));

    onOffline?.();
  }, [onOffline]);

  const attemptReconnect = useCallback(() => {
    if (state.reconnectAttempts >= maxReconnectAttempts) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      reconnectAttempts: prev.reconnectAttempts + 1,
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      if (navigator.onLine) {
        handleOnline();
      } else {
        attemptReconnect();
      }
    }, reconnectDelay);
  }, [state.reconnectAttempts, maxReconnectAttempts, reconnectDelay, handleOnline]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearReconnectTimeout();
    };
  }, [handleOnline, handleOffline, clearReconnectTimeout]);

  // Start reconnection attempts when offline
  useEffect(() => {
    if (!state.isOnline && state.isConnecting && state.reconnectAttempts === 0) {
      attemptReconnect();
    }
  }, [state.isOnline, state.isConnecting, state.reconnectAttempts, attemptReconnect]);

  const resetReconnection = useCallback(() => {
    clearReconnectTimeout();
    setState(prev => ({
      ...prev,
      reconnectAttempts: 0,
      isConnecting: false,
    }));
  }, [clearReconnectTimeout]);

  return {
    isOnline: state.isOnline,
    isConnecting: state.isConnecting,
    lastOnlineAt: state.lastOnlineAt,
    reconnectAttempts: state.reconnectAttempts,
    maxReconnectAttempts,
    resetReconnection,
  };
};
