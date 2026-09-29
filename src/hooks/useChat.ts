import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { APP_CONFIG, STORAGE_KEYS } from '@/lib/constants';

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

// Create a content hash for deduplication
const createContentHash = (content: string, role: string): string => {
  return `${role}:${content.trim().toLowerCase().substring(0, 100)}`;
};

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [latestMessageId, setLatestMessageId] = useState<string | null>(null);
  const [isQuickReply, setIsQuickReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Deduplication set to track processed message IDs
  const processedMessageIds = useRef<Set<string>>(new Set());
  const processedContentHashes = useRef<Set<string>>(new Set());
  const sendingRef = useRef(false);
  const streamingMessageId = useRef<string | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      scrollToBottom();
    }
  }, [isLoading]);

  // Load session from URL or localStorage on mount
  useEffect(() => {
    const urlSessionId = window.location.pathname.split('/').pop();
    
    if (urlSessionId && urlSessionId !== 'chat') {
      setSessionId(urlSessionId);
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, urlSessionId);
      loadMessages(urlSessionId);
    } else {
      const savedSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      if (savedSessionId) {
        setSessionId(savedSessionId);
        loadMessages(savedSessionId);
      } else {
        // Show welcome message for new sessions
        const welcomeMessage: Message = {
          id: 'welcome-' + Date.now(),
          role: 'assistant',
          content: "Namaste 🙏, main Omkar hoon aapka astrologer. Batao, abhi aapke mann mein sabse bada sawaal kya chal raha hai career, love, marriage, ya life ke kisi aur part ke baare mein?",
          timestamp: new Date(),
          deliveryStatus: 'read',
          isNudge: false,
          reactions: []
        };
        setMessages([welcomeMessage]);
        processedMessageIds.current.add(welcomeMessage.id);
      }
    }
  }, []);

  const loadMessages = async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      if (data) {
        // Clear and rebuild deduplication sets
        processedMessageIds.current.clear();
        processedContentHashes.current.clear();
        
        const loadedMessages = data.map(msg => {
          processedMessageIds.current.add(msg.id);
          processedContentHashes.current.add(createContentHash(msg.content, msg.role));
          
          return {
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            deliveryStatus: (msg.delivery_status as Message['deliveryStatus']) || 'read',
            isNudge: msg.is_nudge || false,
            reactions: (msg.reactions as string[]) || []
          };
        });
        
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Parse SSE stream
  const parseSSEStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (content: string) => void,
    onDone: (fullContent: string, newSessionId: string) => void,
    onError: (error: Error) => void
  ) => {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream ended');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk' && data.content) {
                onChunk(data.content);
              } else if (data.type === 'done') {
                onDone(data.fullContent || '', data.sessionId || '');
              } else if (data.error) {
                onError(new Error(data.error));
              }
            } catch (e) {
              // Skip invalid JSON
              console.log('Skipping invalid SSE line');
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream parsing error:', error);
      onError(error as Error);
    }
  };

  const sendMessage = useCallback(async (content: string, isQuickReplyAction = false) => {
    if (!content.trim() || isLoading || sendingRef.current) return;

    sendingRef.current = true;
    setIsLoading(true);
    setIsQuickReply(isQuickReplyAction);

    // Add optimistic user message with 'sending' status
    const optimisticId = `temp-${Date.now()}`;
    const contentHash = createContentHash(content, 'user');
    
    // Check for duplicate content being sent
    if (processedContentHashes.current.has(contentHash)) {
      console.log('Duplicate message detected, skipping');
      setIsLoading(false);
      sendingRef.current = false;
      return;
    }
    
    processedContentHashes.current.add(contentHash);
    
    setMessages(prev => [...prev, {
      id: optimisticId,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      deliveryStatus: 'sending',
      isNudge: false,
      reactions: []
    }]);

    // Create streaming assistant message placeholder
    const streamingId = `streaming-${Date.now()}`;
    streamingMessageId.current = streamingId;

    try {
      // Use fetch directly for streaming support
      const response = await fetch(
        `https://hmbywcikfelbqeaajkpo.supabase.co/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYnl3Y2lrZmVsYnFlYWFqa3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MjkwMzksImV4cCI6MjA3OTEwNTAzOX0.YJnsGVfQOcIvEqO7I52KyOrMvDH_arqQv8uaVDdn_7M`,
          },
          body: JSON.stringify({
            sessionId,
            message: content.trim(),
            stream: true
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Update user message to sent
      setMessages(prev => prev.map(m => 
        m.id === optimisticId 
          ? { ...m, deliveryStatus: 'sent' as const }
          : m
      ));

      // Check if response is streaming (SSE)
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/event-stream')) {
        // Add streaming message placeholder
        setMessages(prev => [...prev, {
          id: streamingId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          deliveryStatus: 'read',
          isNudge: false,
          reactions: [],
          isStreaming: true
        }]);

        const reader = response.body!.getReader();
        
        await parseSSEStream(
          reader,
          // On chunk
          (chunk) => {
            setMessages(prev => prev.map(m => 
              m.id === streamingId 
                ? { ...m, content: m.content + chunk }
                : m
            ));
            scrollToBottom();
          },
          // On done
          (fullContent, newSessionId) => {
            console.log('Stream complete, full content length:', fullContent.length);
            
            // Update session ID if new
            if (newSessionId && newSessionId !== sessionId) {
              setSessionId(newSessionId);
              localStorage.setItem('omkar_session_id', newSessionId);
            }

            // Finalize the streaming message
            setMessages(prev => prev.map(m => 
              m.id === streamingId 
                ? { ...m, isStreaming: false }
                : m
            ));
            
            setLatestMessageId(streamingId);
            processedContentHashes.current.add(createContentHash(fullContent, 'assistant'));
            streamingMessageId.current = null;
            setIsLoading(false);
            setIsQuickReply(false);
            sendingRef.current = false;
          },
          // On error
          (error) => {
            console.error('Streaming error:', error);
            // Remove streaming message on error
            setMessages(prev => prev.filter(m => m.id !== streamingId));
            toast.error('Failed to receive response. Please try again.');
            setIsLoading(false);
            setIsQuickReply(false);
            sendingRef.current = false;
          }
        );
      } else {
        // Non-streaming response (fallback)
        const data = await response.json();
        
        // Update session ID if new
        if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem('omkar_session_id', data.sessionId);
        }

        // Add assistant message
        const assistantId = `assistant-${Date.now()}`;
        setMessages(prev => [...prev, {
          id: assistantId,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          deliveryStatus: 'read',
          isNudge: false,
          reactions: []
        }]);
        
        setLatestMessageId(assistantId);
        setIsLoading(false);
        setIsQuickReply(false);
        sendingRef.current = false;
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove from content hash so user can retry
      processedContentHashes.current.delete(contentHash);
      
      // Remove streaming message if exists
      if (streamingMessageId.current) {
        setMessages(prev => prev.filter(m => m.id !== streamingMessageId.current));
        streamingMessageId.current = null;
      }
      
      // Mark message as failed
      setMessages(prev => prev.map(m => 
        m.id === optimisticId 
          ? { ...m, deliveryStatus: 'failed' as const }
          : m
      ));

      if (error.message?.includes('Rate limit')) {
        toast.error('Too many requests. Please wait a moment.');
      } else if (error.message?.includes('credits')) {
        toast.error('AI credits exhausted. Please contact support.');
      } else if (!navigator.onLine) {
        toast.error('You are offline. Message will be sent when connection is restored.');
      } else {
        toast.error('Failed to send message. Tap to retry.');
      }
      setIsLoading(false);
      setIsQuickReply(false);
      sendingRef.current = false;
    }
  }, [isLoading, sessionId]);

  // Retry failed message
  const retryMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.deliveryStatus === 'failed') {
      // Remove the failed message
      setMessages(prev => prev.filter(m => m.id !== messageId));
      // Remove from content hash
      processedContentHashes.current.delete(createContentHash(message.content, 'user'));
      // Retry sending
      sendMessage(message.content);
    }
  }, [messages, sendMessage]);

  // Add nudge message (for inactivity nudges)
  const addNudgeMessage = useCallback((content: string) => {
    const nudgeId = `nudge-${Date.now()}`;
    
    // Prevent duplicate nudges
    if (processedMessageIds.current.has(nudgeId)) return;
    processedMessageIds.current.add(nudgeId);
    
    const nudgeMessage: Message = {
      id: nudgeId,
      role: 'assistant',
      content,
      timestamp: new Date(),
      deliveryStatus: 'read',
      isNudge: true,
      reactions: []
    };
    setMessages(prev => [...prev, nudgeMessage]);
    scrollToBottom();
  }, []);

  const clearChat = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setMessages([]);
      setSessionId(null);
      processedMessageIds.current.clear();
      processedContentHashes.current.clear();
      localStorage.removeItem('omkar_session_id');
      toast.success('Chat cleared');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat');
    }
  }, [sessionId]);

  const startNewSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    processedMessageIds.current.clear();
    processedContentHashes.current.clear();
    localStorage.removeItem('omkar_session_id');
    toast.success('New session started');
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    retryMessage,
    clearChat,
    startNewSession,
    messagesEndRef,
    sessionId,
    latestMessageId,
    addNudgeMessage
  };
};
