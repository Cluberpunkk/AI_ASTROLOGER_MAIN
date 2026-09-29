import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export type SessionState = 'idle' | 'connecting' | 'active';
export type AvatarState = 'idle' | 'listening' | 'speaking';
export type MicStatus = 'active' | 'muted' | 'denied';

export const useVoiceSession = () => {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [micStatus, setMicStatus] = useState<MicStatus>('muted');
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const requestMicPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;
      setMicStatus('active');
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setMicStatus('denied');
      toast.error('Microphone access is needed to begin.', {
        description: 'Please grant permission and try again.',
        action: {
          label: 'Try Again',
          onClick: () => requestMicPermission(),
        },
      });
      return false;
    }
  };

  const startSession = useCallback(async () => {
    setSessionState('connecting');
    setStatusMessage('Connecting...');

    // Request microphone access
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      setSessionState('idle');
      setStatusMessage('');
      return;
    }

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production, this would establish WebSocket connection
    // const ws = new WebSocket('wss://your-project.functions.supabase.co/realtime-chat');
    // wsRef.current = ws;

    setSessionState('active');
    setAvatarState('listening');
    setStatusMessage('Listening...');

    // Show consent toast on first session
    toast.info('This session may use your birth details to prepare your horoscope.', {
      duration: 5000,
    });

    // Simulate voice interaction states
    simulateVoiceInteraction();
  }, []);

  const stopSession = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setSessionState('idle');
    setAvatarState('idle');
    setMicStatus('muted');
    setStatusMessage('');
  }, []);

  const toggleSession = useCallback(() => {
    if (sessionState === 'active') {
      stopSession();
    } else {
      startSession();
    }
  }, [sessionState, startSession, stopSession]);

  // Simulate voice interaction for demo purposes
  const simulateVoiceInteraction = () => {
    let phase = 0;
    const interval = setInterval(() => {
      phase++;
      if (phase % 4 === 0) {
        setAvatarState('listening');
        setStatusMessage('Listening...');
      } else if (phase % 4 === 2) {
        setAvatarState('speaking');
        setStatusMessage('Speaking...');
      }
    }, 3000);

    // Cleanup interval when session stops
    return () => clearInterval(interval);
  };

  return {
    sessionState,
    avatarState,
    micStatus,
    statusMessage,
    toggleSession,
    isActive: sessionState === 'active',
    isConnecting: sessionState === 'connecting',
  };
};
