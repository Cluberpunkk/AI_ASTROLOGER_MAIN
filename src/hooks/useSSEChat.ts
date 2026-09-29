import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS } from '@/lib/constants';
import { getTypingDuration, simulateTypingWithHesitation, getInterBubbleDelay } from '@/lib/humanTyping';
import type { TypingState } from '@/lib/humanTyping';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isNudge?: boolean;
  reactions?: string[];
  isStreaming?: boolean;
  typingState?: TypingState;
  readAt?: Date;
}


const SUPABASE_URL = 'https://hmbywcikfelbqeaajkpo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYnl3Y2lrZmVsYnFlYWFqa3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MjkwMzksImV4cCI6MjA3OTEwNTAzOX0.YJnsGVfQOcIvEqO7I52KyOrMvDH_arqQv8uaVDdn_7M';

export const useSSEChat = () => {
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [latestMessageId, setLatestMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const dbMessageContents = useRef<Set<string>>(new Set()); // Track DB-loaded content for dedup
  const sendingRef = useRef(false);
  const streamingMessageId = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializingRef = useRef(false);
  const initializedSessionRef = useRef<string | null>(null);
  const welcomeShownRef = useRef(false); // Track if welcome message was shown

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load messages from database
  const loadMessages = useCallback(async (sid: string) => {
    // Don't reload if we're currently sending a message
    if (sendingRef.current) {
      console.log('Currently sending, skipping message reload');
      return;
    }
    
    try {
      console.log('Loading messages for session:', sid);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      if (data && data.length > 0) {
        // Check if these are the same messages we already have
        const alreadyLoaded = data.every(m => processedMessageIds.current.has(m.id));
        
        if (alreadyLoaded && processedMessageIds.current.size >= data.length) {
          console.log('Messages already loaded, skipping');
          return;
        }
        
        processedMessageIds.current.clear();
        dbMessageContents.current.clear();
        
        const loadedMessages = data.map(msg => {
          processedMessageIds.current.add(msg.id);
          // Store normalized content from DB for dedup
          dbMessageContents.current.add(msg.content.trim().toLowerCase());
          
          return {
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            deliveryStatus: (msg.delivery_status as Message['deliveryStatus']) || 'delivered',
            isNudge: msg.is_nudge || false,
            reactions: (msg.reactions as string[]) || []
          };
        });
        
        console.log('Loaded', loadedMessages.length, 'messages from database');
        setMessages(loadedMessages);
      } else {
        console.log('No messages in database for this session');
        // Only show welcome message if we haven't shown it yet
        if (!welcomeShownRef.current) {
          welcomeShownRef.current = true;
          const welcomeMessage: Message = {
            id: 'welcome-message', // Stable ID
            role: 'assistant',
            content: "Namaste 🙏, main Omkar hoon aapka astrologer. Batao, abhi aapke mann mein sabse bada sawaal kya chal raha hai career, love, marriage, ya life ke kisi aur part ke baare mein?",
            timestamp: new Date(),
            deliveryStatus: 'delivered',
            isNudge: false
          };
          processedMessageIds.current.add(welcomeMessage.id);
          setMessages([welcomeMessage]);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  // Initialize session - only runs once per session
  useEffect(() => {
    const initSession = async () => {
      // Use sessionStorage - persists on refresh, clears on new tab/window
      const storedSessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
      
      // Skip if already initializing
      if (initializingRef.current) {
        console.log('Already initializing, skipping');
        return;
      }
      
      // Determine target session: URL param takes priority, then sessionStorage
      const targetSessionId = urlSessionId || storedSessionId;
      
      // Skip if already initialized for this exact session
      if (targetSessionId && initializedSessionRef.current === targetSessionId) {
        console.log('Already initialized for session:', targetSessionId);
        return;
      }
      
      // Skip if already initialized for fresh session
      if (!targetSessionId && initializedSessionRef.current === 'fresh') {
        console.log('Already initialized fresh session');
        return;
      }
      
      initializingRef.current = true;
      
      if (targetSessionId) {
        // Resume existing session (page refresh)
        console.log('Resuming session:', targetSessionId);
        initializedSessionRef.current = targetSessionId;
        setSessionId(targetSessionId);
        sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, targetSessionId);
        
        // Update URL if not already showing session
        if (!urlSessionId) {
          navigate(`/chat/${targetSessionId}`, { replace: true });
        }
        
        await loadMessages(targetSessionId);
      } else {
        // New tab/window - start fresh session
        console.log('New tab - starting fresh session');
        initializedSessionRef.current = 'fresh';
        
        if (!welcomeShownRef.current) {
          welcomeShownRef.current = true;
          const welcomeMessage: Message = {
            id: 'welcome-message',
            role: 'assistant',
            content: "Namaste 🙏, main Omkar hoon aapka astrologer. Batao, abhi aapke mann mein sabse bada sawaal kya chal raha hai career, love, marriage, ya life ke kisi aur part ke baare mein?",
            timestamp: new Date(),
            deliveryStatus: 'delivered',
            isNudge: false
          };
          processedMessageIds.current.add(welcomeMessage.id);
          setMessages([welcomeMessage]);
        }
      }
      
      initializingRef.current = false;
    };

    initSession();
  }, [urlSessionId, navigate, loadMessages]);

  // Parse SSE stream with robust handling - read entire response first
  const parseSSEStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (content: string) => void,
    onDone: (fullContent: string, newSessionId: string, bubbles?: string[]) => void,
    onError: (error: Error) => void
  ) => {
    const decoder = new TextDecoder();
    let fullBuffer = '';
    let fullContent = '';
    let sessionIdFromStream = '';
    let doneReceived = false;

    try {
      // Read the ENTIRE response first (it's pre-built on backend)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullBuffer += decoder.decode(value, { stream: true });
      }
      // Flush remaining bytes
      fullBuffer += decoder.decode();
      
      console.log('Full SSE buffer received, length:', fullBuffer.length);
      
      // Now parse all events from the buffer
      const events = fullBuffer.split('\n\n');
      
      for (const eventBlock of events) {
        const trimmed = eventBlock.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        const jsonStr = trimmed.slice(6).trim();
        if (!jsonStr) continue;
        
        try {
          const data = JSON.parse(jsonStr);
          
          if (data.sessionId) sessionIdFromStream = data.sessionId;
          
          if (data.type === 'chunk' && data.content) {
            fullContent += data.content;
            onChunk(data.content);
          } else if (data.type === 'done') {
            doneReceived = true;
            console.log('Done event received, fullContent length:', (data.fullContent || fullContent).length);
            onDone(data.fullContent || fullContent, data.sessionId || sessionIdFromStream, data.bubbles);
            return;
          } else if (data.error) {
            onError(new Error(data.error));
            return;
          }
        } catch (e) {
          // Skip malformed JSON
          console.warn('Failed to parse SSE event:', jsonStr.substring(0, 50));
        }
      }
      
      // If we processed everything but no done event, use collected content
      if (!doneReceived && fullContent) {
        console.log('No done event received, using collected content, length:', fullContent.length);
        onDone(fullContent, sessionIdFromStream, undefined);
      } else if (!doneReceived && !fullContent) {
        console.error('Stream ended with no content and no done event');
        onError(new Error('No response received from server'));
      }
      
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Stream parsing error:', error);
        // If we have any content, still try to use it
        if (fullContent) {
          console.log('Error occurred but have partial content, using it');
          onDone(fullContent, sessionIdFromStream, undefined);
        } else {
          onError(error as Error);
        }
      }
    }
  };

  const sendMessage = useCallback(async (content: string, isQuickReply = false) => {
    if (!content.trim() || isLoading || sendingRef.current) return;

    sendingRef.current = true;
    setIsLoading(true);
    setIsGenerating(true);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add optimistic user message
    const optimisticId = `user-${Date.now()}`;
    const normalizedContent = content.trim().toLowerCase();
    
    // Check for duplicate user message
    if (dbMessageContents.current.has(normalizedContent)) {
      console.log('Duplicate message detected, skipping');
      setIsLoading(false);
      setIsGenerating(false);
      sendingRef.current = false;
      return;
    }
    
    dbMessageContents.current.add(normalizedContent);
    
    const userMessage: Message = {
      id: optimisticId,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      deliveryStatus: 'sending'
    };
    
    setMessages(prev => [...prev, userMessage]);
    scrollToBottom();

    // Transition to 'sent' status after short delay
    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.id === optimisticId && m.deliveryStatus === 'sending'
          ? { ...m, deliveryStatus: 'sent' as const }
          : m
      ));
    }, 350);

    // Create streaming assistant message placeholder
    const streamingId = `assistant-${Date.now()}`;
    streamingMessageId.current = streamingId;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            sessionId,
            message: content.trim(),
            stream: true
          }),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Update user message to delivered when we get response
      setMessages(prev => prev.map(m => 
        m.id === optimisticId 
          ? { ...m, deliveryStatus: 'delivered' as const }
          : m
      ));

      // Store optimisticId for read status update later
      const userMessageId = optimisticId;

      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/event-stream')) {
        // Add typing indicator placeholder (don't show streaming content)
        setMessages(prev => [...prev, {
          id: streamingId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          deliveryStatus: 'delivered',
          isStreaming: true,
          typingState: 'typing' as TypingState
        }]);

        const reader = response.body!.getReader();
        
        await parseSSEStream(
          reader,
          // Don't update content during streaming - just keep typing indicator
          () => {},
          async (fullContent, newSessionId, bubbles) => {
            console.log('Stream complete, bubbles:', bubbles?.length || 1);
            
            // Update session ID if new - mark as initialized to prevent reload
            if (newSessionId && newSessionId !== sessionId) {
              initializedSessionRef.current = newSessionId;
              setSessionId(newSessionId);
              sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, newSessionId);
              navigate(`/chat/${newSessionId}`, { replace: true });
            }

            // Get all bubbles to deliver
            const allBubbles = bubbles && bubbles.length > 0 ? bubbles : [fullContent];
            
            // Deliver bubbles one by one
            for (let i = 0; i < allBubbles.length; i++) {
              const bubbleContent = allBubbles[i];
              
              // Track this content to prevent duplicates on page reload
              const normalizedBubble = bubbleContent.trim().toLowerCase();
              dbMessageContents.current.add(normalizedBubble);
              
              // Calculate typing duration
              const typingDuration = getTypingDuration(bubbleContent);
              
              // For first bubble, use existing streamingId as typing indicator
              // For subsequent bubbles, add a new typing indicator
              const typingId = i === 0 ? streamingId : `typing-${Date.now()}-${i}`;
              
              if (i > 0) {
                // Add new typing indicator for subsequent bubbles
                setMessages(prev => [...prev, {
                  id: typingId,
                  role: 'assistant' as const,
                  content: '',
                  timestamp: new Date(),
                  deliveryStatus: 'delivered' as const,
                  isStreaming: true,
                  typingState: 'typing' as TypingState
                }]);
                scrollToBottom();
              }
              
              // Simulate human-like typing with hesitation
              await simulateTypingWithHesitation(
                typingDuration,
                () => {
                  setMessages(prev => prev.map(m => 
                    m.id === typingId ? { ...m, typingState: 'typing' as TypingState } : m
                  ));
                },
                () => {
                  setMessages(prev => prev.map(m => 
                    m.id === typingId ? { ...m, typingState: 'paused' as TypingState } : m
                  ));
                },
                () => {
                  setMessages(prev => prev.map(m => 
                    m.id === typingId ? { ...m, typingState: 'typing' as TypingState } : m
                  ));
                },
                () => {
                  setMessages(prev => prev.map(m => 
                    m.id === typingId ? { ...m, typingState: 'thinking' as TypingState } : m
                  ));
                }
              );
              
              // Replace typing indicator with actual message
              const bubbleId = i === 0 ? streamingId : `${streamingId}-bubble-${i}`;
              
              if (i === 0) {
                // Update existing streaming message with content
                setMessages(prev => prev.map(m => 
                  m.id === streamingId 
                    ? { ...m, content: bubbleContent, isStreaming: false, typingState: undefined }
                    : m
                ));
              } else {
                // Replace typing indicator with new message
                setMessages(prev => prev
                  .filter(m => m.id !== typingId)
                  .concat({
                    id: bubbleId,
                    role: 'assistant' as const,
                    content: bubbleContent,
                    timestamp: new Date(),
                    deliveryStatus: 'delivered' as const,
                    isStreaming: false
                  })
                );
              }
              scrollToBottom();
              
              // Brief pause between bubbles
              if (i < allBubbles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, getInterBubbleDelay()));
              }
            }
            
            setLatestMessageId(allBubbles.length > 1 ? `${streamingId}-bubble-${allBubbles.length - 1}` : streamingId);
            
            // Update user message to 'read' with animation after all bubbles delivered
            setTimeout(() => {
              const readTime = new Date();
              setMessages(prev => prev.map(m => 
                m.id === userMessageId && m.role === 'user'
                  ? { ...m, deliveryStatus: 'read' as const, readAt: readTime }
                  : m
              ));
            }, 600 + Math.random() * 400); // 600-1000ms delay for realistic read timing
            
            streamingMessageId.current = null;
            setIsLoading(false);
            setIsGenerating(false);
            sendingRef.current = false;
          },
          (error) => {
            console.error('Streaming error:', error);
            setMessages(prev => prev.filter(m => m.id !== streamingId));
            toast.error('Failed to receive response. Please try again.');
            setIsLoading(false);
            setIsGenerating(false);
            sendingRef.current = false;
          }
        );
      } else {
        // Non-streaming response (fallback)
        const data = await response.json();
        
        if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
          sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, data.sessionId);
          navigate(`/chat/${data.sessionId}`, { replace: true });
        }

        const assistantId = `assistant-${Date.now()}`;
        setMessages(prev => [...prev, {
          id: assistantId,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          deliveryStatus: 'delivered'
        }]);
        
        setLatestMessageId(assistantId);
        setIsLoading(false);
        setIsGenerating(false);
        sendingRef.current = false;
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      
      console.error('Error sending message:', error);
      dbMessageContents.current.delete(normalizedContent);
      
      if (streamingMessageId.current) {
        setMessages(prev => prev.filter(m => m.id !== streamingMessageId.current));
        streamingMessageId.current = null;
      }
      
      setMessages(prev => prev.map(m => 
        m.id === optimisticId 
          ? { ...m, deliveryStatus: 'failed' as const }
          : m
      ));

      if (error.message?.includes('Rate limit')) {
        toast.error('Too many requests. Please wait a moment.');
      } else if (!navigator.onLine) {
        toast.error('You are offline. Please check your connection.');
      } else {
        toast.error('Failed to send message. Tap to retry.');
      }
      
      setIsLoading(false);
      setIsGenerating(false);
      sendingRef.current = false;
    }
  }, [isLoading, sessionId, navigate, scrollToBottom]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current && isGenerating) {
      abortControllerRef.current.abort();
      
      // Finalize any streaming message
      if (streamingMessageId.current) {
        setMessages(prev => prev.map(m => 
          m.id === streamingMessageId.current
            ? { ...m, isStreaming: false }
            : m
        ));
        streamingMessageId.current = null;
      }
      
      setIsLoading(false);
      setIsGenerating(false);
      sendingRef.current = false;
      toast.info('Generation stopped');
    }
  }, [isGenerating]);

  const retryMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.deliveryStatus === 'failed') {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      dbMessageContents.current.delete(message.content.trim().toLowerCase());
      sendMessage(message.content);
    }
  }, [messages, sendMessage]);

  const addNudgeMessage = useCallback(async (content: string) => {
    const nudgeId = `nudge-${Date.now()}`;
    
    if (processedMessageIds.current.has(nudgeId)) return;
    processedMessageIds.current.add(nudgeId);
    
    const nudgeMessage: Message = {
      id: nudgeId,
      role: 'assistant',
      content,
      timestamp: new Date(),
      deliveryStatus: 'delivered',
      isNudge: true
    };
    
    setMessages(prev => [...prev, nudgeMessage]);
    scrollToBottom();

    // Save nudge to database if we have a session
    if (sessionId) {
      try {
        await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            role: 'assistant',
            content,
            delivery_status: 'delivered',
            is_nudge: true
          });
      } catch (error) {
        console.error('Error saving nudge:', error);
      }
    }
  }, [sessionId, scrollToBottom]);

  const endSession = useCallback(async () => {
    if (sessionId) {
      try {
        await supabase
          .from('chat_sessions')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString(),
            disconnect_reason: 'user_ended'
          })
          .eq('id', sessionId);
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }
  }, [sessionId]);

  const clearChat = useCallback(() => {
    // Clear local state
    setMessages([]);
    setSessionId(null);
    processedMessageIds.current.clear();
    dbMessageContents.current.clear();
    welcomeShownRef.current = false;
    initializedSessionRef.current = null;
    
    // Clear storage
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_START_TIME);
    
    // Navigate to root and reload to start fresh
    navigate('/', { replace: true });
    window.location.reload();
  }, [navigate]);

  // Connection status is always 'connected' for SSE (no persistent connection)
  const connectionStatus = 'connected' as const;

  return {
    messages,
    isLoading,
    isGenerating,
    sendMessage,
    stopGeneration,
    retryMessage,
    messagesEndRef,
    sessionId,
    latestMessageId,
    addNudgeMessage,
    connectionStatus,
    endSession,
    clearChat
  };
};
