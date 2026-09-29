import { useState, useEffect, useCallback } from 'react';

type StatusType = 'online' | 'last_seen_2min' | 'last_seen_3min';

interface AstrologerStatus {
  status: StatusType;
  displayText: string;
  isOnline: boolean;
}

export const useAstrologerStatus = (isTyping: boolean = false) => {
  const [status, setStatus] = useState<StatusType>('online');

  // Cycle through statuses for realism
  useEffect(() => {
    if (isTyping) {
      setStatus('online');
      return;
    }

    const interval = setInterval(() => {
      setStatus(prev => {
        const rand = Math.random();
        if (rand < 0.6) return 'online';
        if (rand < 0.8) return 'last_seen_2min';
        return 'last_seen_3min';
      });
    }, 15000); // Change status every 15 seconds

    return () => clearInterval(interval);
  }, [isTyping]);

  const setOnline = useCallback(() => {
    setStatus('online');
  }, []);

  const getStatusInfo = (): AstrologerStatus => {
    switch (status) {
      case 'online':
        return {
          status: 'online',
          displayText: 'Online',
          isOnline: true
        };
      case 'last_seen_2min':
        return {
          status: 'last_seen_2min',
          displayText: 'Last seen 2 min ago',
          isOnline: false
        };
      case 'last_seen_3min':
        return {
          status: 'last_seen_3min',
          displayText: 'Last seen 3 min ago',
          isOnline: false
        };
      default:
        return {
          status: 'online',
          displayText: 'Online',
          isOnline: true
        };
    }
  };

  return {
    ...getStatusInfo(),
    setOnline,
    isTyping
  };
};
