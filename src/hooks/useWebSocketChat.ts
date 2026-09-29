import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { STORAGE_KEYS } from '@/lib/constants';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isNudge?: boolean;
  reactions?: string[];
  isStreaming?: boolean;
}

interface WSMessage {
  type: string;
  sessionId?: string;
  content?: string;
  fullContent?: string;
  message?: string;
  messages?: Array<{ role: string; content: string; timestamp: string; id: string; deliveryStatus?: string; isNudge?: boolean }>;
  messageId?: string;
  latency?: number;
  bubbleIndex?: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

const RECONNECT_DELAYS = [1000, 2000, 3000, 5000, 10000];
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 20000; // 20 seconds - more frequent to keep connection alive
const PONG_TIMEOUT = 10000; // 10 seconds - more lenient timeout

// Latency thresholds for connection quality
const LATENCY_THRESHOLDS = {
  excellent: 100,
  good: 300,
  fair: 600
};

export const useWebSocketChat = () => {
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('unknown');
  const [latency, setLatency] = useState<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionEndedRef = useRef(false);
  
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const currentBubbleIndexRef = useRef<number>(0);
  const messageQueueRef = useRef<Array<{ content: string; isQuickReply?: boolean }>>([]);
  const latestMessageIdRef = useRef<string | null>(null);
  const pingStartTimeRef = useRef<number | null>(null);
  const latencyHistoryRef = useRef<number[]>([]);
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const calculateConnectionQuality = useCallback((latencyMs: number): ConnectionQuality => {
    if (latencyMs <= LATENCY_THRESHOLDS.excellent) return 'excellent';
    if (latencyMs <= LATENCY_THRESHOLDS.good) return 'good';
    if (latencyMs <= LATENCY_THRESHOLDS.fair) return 'fair';
    return 'poor';
  }, []);

  const updateLatency = useCallback((newLatency: number) => {
    // Keep last 5 latency measurements for averaging
    latencyHistoryRef.current.push(newLatency);
    if (latencyHistoryRef.current.length > 5) {
      latencyHistoryRef.current.shift();
    }
    
    // Calculate average latency
    const avgLatency = Math.round(
      latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length
    );
    
    setLatency(avgLatency);
    setConnectionQuality(calculateConnectionQuality(avgLatency));
  }, [calculateConnectionQuality]);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        pingStartTimeRef.current = Date.now();
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
        
        // Set timeout for pong response
        pongTimeoutRef.current = setTimeout(() => {
          console.warn('Pong timeout - connection may be dead');
          setConnectionQuality('poor');
          socketRef.current?.close();
        }, PONG_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }, [clearHeartbeat]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WSMessage = JSON.parse(event.data);
      console.log('WS received:', data.type, data);

      switch (data.type) {
        case 'connected': {
          console.log('Connected with session:', data.sessionId);
          setSessionId(data.sessionId || null);
          if (data.sessionId) {
            localStorage.setItem(STORAGE_KEYS.SESSION_ID, data.sessionId);
            navigate(`/chat/${data.sessionId}`, { replace: true });
          }
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
          latencyHistoryRef.current = [];
          setConnectionQuality('unknown');
          startHeartbeat();
          
          // Dismiss any reconnecting toast and show success if we were reconnecting
          if (reconnectAttemptsRef.current > 0) {
            toast.success('Connected!', { id: 'connection-status', duration: 2000 });
          } else {
            toast.dismiss('connection-status');
          }
          
          // Send any queued messages
          while (messageQueueRef.current.length > 0) {
            const queued = messageQueueRef.current.shift();
            if (queued && socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({
                type: 'message',
                content: queued.content,
                isQuickReply: queued.isQuickReply
              }));
            }
          }
          break;
        }

        case 'history': {
          console.log('History received:', data.messages?.length, 'messages');
          if (data.messages && data.messages.length > 0) {
            const loadedMessages: Message[] = data.messages.map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              deliveryStatus: (msg.deliveryStatus as Message['deliveryStatus']) || 'delivered',
              isNudge: (msg as any).isNudge || false
            }));
            console.log('Setting messages:', loadedMessages);
            setMessages(loadedMessages);
          }
          break;
        }

        case 'message_ack': {
          // Update message status to 'sent' then 'delivered'
          if (data.messageId) {
            setMessages(prev => prev.map(msg => 
              msg.deliveryStatus === 'sending'
                ? { ...msg, deliveryStatus: 'delivered' as const }
                : msg
            ));
          }
          break;
        }

        case 'new_bubble': {
          // Start a new streaming bubble
          setIsGenerating(true);
          const bubbleIndex = data.bubbleIndex ?? 0;
          currentBubbleIndexRef.current = bubbleIndex;
          
          const newId = `assistant-${Date.now()}-${bubbleIndex}`;
          streamingMessageIdRef.current = newId;
          latestMessageIdRef.current = newId;
          
          setMessages(prev => [...prev, {
            id: newId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            deliveryStatus: 'delivered',
            isStreaming: true
          }]);
          break;
        }

        case 'chunk': {
          setIsGenerating(true);
          const bubbleIndex = data.bubbleIndex ?? currentBubbleIndexRef.current;
          
          if (!streamingMessageIdRef.current) {
            // Fallback: Create new streaming message if new_bubble wasn't received
            const newId = `assistant-${Date.now()}-${bubbleIndex}`;
            streamingMessageIdRef.current = newId;
            latestMessageIdRef.current = newId;
            
            setMessages(prev => [...prev, {
              id: newId,
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              deliveryStatus: 'delivered',
              isStreaming: true
            }]);
          }
          
          // Append chunk directly to message
          if (data.content) {
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessageIdRef.current
                ? { ...msg, content: msg.content + data.content }
                : msg
            ));
          }
          break;
        }

        case 'bubble_done': {
          if (streamingMessageIdRef.current) {
            const finalContent = data.fullContent;
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessageIdRef.current
                ? { ...msg, content: finalContent || msg.content, isStreaming: false }
                : msg
            ));
            streamingMessageIdRef.current = null;
          }
          break;
        }

        case 'done': {
          setIsLoading(false);
          setIsGenerating(false);
          // Clear isStreaming on ALL messages to ensure no cursors remain
          setMessages(prev => prev.map(msg => 
            msg.isStreaming ? { ...msg, isStreaming: false } : msg
          ));
          streamingMessageIdRef.current = null;
          currentBubbleIndexRef.current = 0;
          break;
        }

        case 'generation_stopped': {
          setIsLoading(false);
          setIsGenerating(false);
          if (streamingMessageIdRef.current) {
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessageIdRef.current
                ? { ...msg, content: data.fullContent || msg.content, isStreaming: false }
                : msg
            ));
            streamingMessageIdRef.current = null;
          }
          currentBubbleIndexRef.current = 0;
          toast.info('Generation stopped');
          break;
        }

        case 'pong': {
          // Clear pong timeout
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
          }
          
          // Calculate latency
          if (pingStartTimeRef.current) {
            const roundTripLatency = Date.now() - pingStartTimeRef.current;
            updateLatency(roundTripLatency);
            pingStartTimeRef.current = null;
          }
          break;
        }

        case 'error': {
          console.error('WS error:', data.message);
          setIsLoading(false);
          setIsGenerating(false);
          toast.error(data.message || 'An error occurred');
          
          // Mark pending messages as failed
          setMessages(prev => prev.map(msg => 
            msg.deliveryStatus === 'sending'
              ? { ...msg, deliveryStatus: 'failed' as const }
              : msg
          ));
          break;
        }

        case 'session_ended': {
          sessionEndedRef.current = true;
          toast.info('Session ended');
          break;
        }

        case 'nudge_saved': {
          // Update the temporary nudge message with the real ID from the server
          if (data.messageId) {
            setMessages(prev => prev.map(msg => 
              msg.isNudge && msg.id.startsWith('nudge-') && msg.content === data.content
                ? { ...msg, id: data.messageId! }
                : msg
            ));
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error parsing WS message:', error);
    }
  }, [navigate, startHeartbeat, updateLatency]);

  const connect = useCallback((existingSessionId?: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Always use the stored session ID or the passed one
    const storedSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    const sessionToUse = existingSessionId || storedSessionId || undefined;

    setConnectionStatus('connecting');
    setConnectionQuality('unknown');

    const wsUrl = `wss://hmbywcikfelbqeaajkpo.supabase.co/functions/v1/chat-ws`;
    console.log('Connecting to WebSocket:', wsUrl, 'with session:', sessionToUse);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
      // Send init message with existing session ID to resume
      socket.send(JSON.stringify({
        type: 'init',
        sessionId: sessionToUse
      }));
    };

    socket.onmessage = handleMessage;

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      clearHeartbeat();
      setConnectionStatus('disconnected');
      setConnectionQuality('unknown');
      
      // Don't reconnect if session was intentionally ended
      if (sessionEndedRef.current) {
        console.log('Session ended intentionally, not reconnecting');
        sessionEndedRef.current = false;
        return;
      }
      
      // Attempt reconnection if not a clean close
      if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptsRef.current, RECONNECT_DELAYS.length - 1)];
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
        setConnectionStatus('reconnecting');
        toast.loading('Reconnecting...', { id: 'connection-status', duration: Infinity });
        
        // Always use stored session ID for reconnection
        const currentStoredSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connect(currentStoredSessionId || undefined);
        }, delay);
      } else if (event.code !== 1000) {
        toast.error('Connection lost. Please refresh the page.', { id: 'connection-status' });
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [handleMessage, clearHeartbeat]);

  const disconnect = useCallback(() => {
    clearHeartbeat();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close(1000, 'User disconnect');
      socketRef.current = null;
    }
    setConnectionStatus('disconnected');
    setConnectionQuality('unknown');
  }, [clearHeartbeat]);

  // Initialize connection
  useEffect(() => {
    const storedSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    const targetSessionId = urlSessionId || storedSessionId;
    
    connect(targetSessionId || undefined);

    return () => {
      disconnect();
    };
  }, []);

  const sendMessage = useCallback((content: string, isQuickReply?: boolean) => {
    if (!content.trim()) return;

    // Add optimistic user message
    const userMessageId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      deliveryStatus: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        content: content.trim(),
        isQuickReply
      }));

      // Mark message as sent (will be updated to delivered when we get ack)
      setMessages(prev => prev.map(msg => 
        msg.id === userMessageId
          ? { ...msg, deliveryStatus: 'sent' as const }
          : msg
      ));
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push({ content: content.trim(), isQuickReply });
      toast.warning('Message queued - reconnecting...');
    }
  }, []);

  const stopGeneration = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN && isGenerating) {
      socketRef.current.send(JSON.stringify({ type: 'stop_generation' }));
    }
  }, [isGenerating]);

  const retryMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'user') return;

    // Remove failed message
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    // Resend
    sendMessage(message.content);
  }, [messages, sendMessage]);

  const addNudgeMessage = useCallback((message: string) => {
    const nudgeMessage: Message = {
      id: `nudge-${Date.now()}`,
      role: 'assistant',
      content: message,
      timestamp: new Date(),
      deliveryStatus: 'delivered',
      isNudge: true
    };
    setMessages(prev => [...prev, nudgeMessage]);
    
    // Send nudge to server to persist
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'nudge',
        content: message
      }));
    }
  }, []);

  const endSession = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'end_session' }));
    }
    localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
  }, []);

  return {
    messages,
    isLoading,
    isGenerating,
    sessionId,
    connectionStatus,
    connectionQuality,
    latency,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    messagesEndRef,
    latestMessageId: latestMessageIdRef.current,
    sendMessage,
    stopGeneration,
    retryMessage,
    addNudgeMessage,
    endSession,
    reconnect: () => connect(sessionId || undefined)
  };
};
