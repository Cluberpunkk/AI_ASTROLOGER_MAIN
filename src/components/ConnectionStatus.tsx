import { Wifi, WifiOff, Loader2, RefreshCw, Signal, SignalHigh, SignalMedium, SignalLow, SignalZero } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ConnectionStatus as ConnectionStatusType, ConnectionQuality } from '@/hooks/useWebSocketChat';

interface ConnectionStatusProps {
  connectionStatus: ConnectionStatusType;
  connectionQuality?: ConnectionQuality;
  latency?: number | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  onReconnect?: () => void;
}

export const ConnectionStatus = ({ 
  connectionStatus, 
  connectionQuality = 'unknown',
  latency,
  reconnectAttempts, 
  maxReconnectAttempts,
  onReconnect 
}: ConnectionStatusProps) => {
  const [showBanner, setShowBanner] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  useEffect(() => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
      setShowBanner(true);
      setWasDisconnected(true);
    } else if (connectionStatus === 'connecting' && wasDisconnected) {
      // Only show connecting if we were previously disconnected (reconnecting scenario)
      setShowBanner(true);
    } else if (connectionStatus === 'connected' && wasDisconnected) {
      // Show "connected" briefly then hide
      setTimeout(() => {
        setShowBanner(false);
        setWasDisconnected(false);
      }, 2000);
    } else if (connectionStatus === 'connected') {
      setShowBanner(false);
    }
  }, [connectionStatus, wasDisconnected]);

  const getQualityIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Signal className="h-4 w-4 text-green-500" />;
      case 'good':
        return <SignalHigh className="h-4 w-4 text-green-400" />;
      case 'fair':
        return <SignalMedium className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <SignalLow className="h-4 w-4 text-red-500" />;
      default:
        return <SignalZero className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getQualityText = () => {
    if (latency === null || latency === undefined) return '';
    return `${latency}ms`;
  };

  const getStatusContent = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <>
            <Wifi className="h-4 w-4" />
            <span>Connected</span>
            {connectionQuality !== 'unknown' && (
              <span className="flex items-center gap-1 ml-2 text-xs opacity-80">
                {getQualityIcon()}
                {getQualityText()}
              </span>
            )}
          </>
        );
      case 'connecting':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </>
        );
      case 'reconnecting':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Reconnecting... ({reconnectAttempts}/{maxReconnectAttempts})</span>
          </>
        );
      case 'disconnected':
        return (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Disconnected</span>
            {onReconnect && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onReconnect}
                className="ml-2 h-6 px-2 text-xs bg-background/20 hover:bg-background/40"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </>
        );
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500/90 text-white';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500/90 text-yellow-950';
      case 'disconnected':
        return 'bg-destructive/90 text-destructive-foreground';
    }
  };

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300",
        "safe-area-inset",
        getStatusColor()
      )}
    >
      {getStatusContent()}
    </div>
  );
};
