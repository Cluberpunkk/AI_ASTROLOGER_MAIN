import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { isSameDay } from 'date-fns';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { DateSeparator } from '@/components/DateSeparator';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { TypingIndicator } from '@/components/TypingIndicator';
import type { TypingState } from '@/lib/humanTyping';
import { useSSEChat } from '@/hooks/useSSEChat';
import { useAstrologerStatus } from '@/hooks/useAstrologerStatus';
import { useInactivityNudges } from '@/hooks/useInactivityNudges';
import { useHaptics } from '@/hooks/useHaptics';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { APP_CONFIG, UI_TEXT, STORAGE_KEYS } from '@/lib/constants';
import { FeedbackForm } from '@/components/FeedbackForm';
import { MobileWrapper } from '@/components/MobileWrapper';
import { RefreshCw } from 'lucide-react';



const Chat = () => {
  const {
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
    clearChat,
  } = useSSEChat();
  
  // Calculate initial values ONCE outside of state initializers to prevent hook order issues
  const initialTimeRemaining = useMemo(() => {
    const storedStartTime = sessionStorage.getItem(STORAGE_KEYS.SESSION_START_TIME);
    if (storedStartTime) {
      const elapsed = Math.floor((Date.now() - parseInt(storedStartTime, 10)) / 1000);
      const remaining = APP_CONFIG.SESSION_DURATION_SECONDS - elapsed;
      return remaining > 0 ? remaining : 0;
    }
    return APP_CONFIG.SESSION_DURATION_SECONDS;
  }, []);
  
  const [timeRemaining, setTimeRemaining] = useState<number>(initialTimeRemaining);
  const [sessionEnded, setSessionEnded] = useState(initialTimeRemaining <= 0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackShown, setFeedbackShown] = useState(initialTimeRemaining <= 0);
  const [feedbackCompleted, setFeedbackCompleted] = useState(false);
  
  // Track if a quick reply is being processed to prevent duplicates
  const quickReplyProcessingRef = useRef(false);

  // Hooks
  const { impact } = useHaptics();
  const isMobile = useIsMobile();

  // Astrologer status hook
  const { isOnline: astrologerOnline, displayText, setOnline } = useAstrologerStatus(isLoading);

  // Inactivity nudges
  const handleNudge = useCallback((message: string) => {
    addNudgeMessage(message);
  }, [addNudgeMessage]);

  const { resetActivity } = useInactivityNudges({
    onNudge: handleNudge,
    isEnabled: !!sessionId && messages.length > 0 && !sessionEnded,
    isLoading
  });

  // Reset activity and set online when user sends a message
  const handleSendMessage = useCallback((content: string, isQuickReply?: boolean) => {
    if (connectionStatus !== 'connected') {
      toast.error('Connecting... Please wait.');
      return;
    }
    resetActivity();
    setOnline();
    impact('light'); // Subtle haptic feedback on send
    sendMessage(content, isQuickReply);
  }, [resetActivity, setOnline, sendMessage, connectionStatus, impact]);

  const handleRetryMessage = useCallback((messageId: string) => {
    if (connectionStatus !== 'connected') {
      toast.error('Connecting... Please wait.');
      return;
    }
    retryMessage(messageId);
  }, [retryMessage, connectionStatus]);

  const handleEndSession = () => {
    console.log('End session clicked');
    // Show feedback form instead of immediately ending
    setShowFeedback(true);
  };

  // Actually end the session and redirect (called after feedback)
  const performSessionEnd = () => {
    toast.success(UI_TEXT.SESSION_ENDING);
    endSession();
    
    // Clear all session data
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_START_TIME);
    
    // Reload to start completely fresh
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  // Prevent duplicate quick reply messages with ref-based lock
  const handleQuickReply = useCallback((message: string) => {
    if (quickReplyProcessingRef.current || isLoading) {
      console.log('Quick reply blocked - already processing or loading');
      return;
    }
    quickReplyProcessingRef.current = true;
    handleSendMessage(message, true);
    
    // Reset after a short delay to allow for new quick replies later
    setTimeout(() => {
      quickReplyProcessingRef.current = false;
    }, 2000);
  }, [handleSendMessage, isLoading]);

  // Initialize session start time when session starts
  useEffect(() => {
    if (sessionId && !sessionStorage.getItem(STORAGE_KEYS.SESSION_START_TIME)) {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_START_TIME, Date.now().toString());
    }
  }, [sessionId]);

  // Timer countdown - syncs with persisted start time
  useEffect(() => {
    if (!sessionId || sessionEnded) return;

    const timer = setInterval(() => {
      const storedStartTime = sessionStorage.getItem(STORAGE_KEYS.SESSION_START_TIME);
      if (!storedStartTime) return;
      
      const elapsed = Math.floor((Date.now() - parseInt(storedStartTime, 10)) / 1000);
      const remaining = APP_CONFIG.SESSION_DURATION_SECONDS - elapsed;
      
      if (remaining <= 0) {
        clearInterval(timer);
        setTimeRemaining(0);
        setSessionEnded(true);
        setShowFeedback(true);
        setFeedbackShown(true);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId, sessionEnded]);

  const handleFeedbackClose = () => {
    setShowFeedback(false);
    // If session was ended via button (not timeout), perform the actual end
    if (!sessionEnded) {
      performSessionEnd();
    }
  };

  const handleFeedbackSubmit = () => {
    setShowFeedback(false);
    setFeedbackCompleted(true);
    // Always end session after feedback submission
    performSessionEnd();
  };

  const handleStartNewSession = () => {
    // Clear session storage and reload to start fresh
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_START_TIME);
    window.location.href = '/';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isConnected = connectionStatus === 'connected';
  
  // Delayed typing indicator state
  const [delayedTyping, setDelayedTyping] = useState(false);
  
  // Show typing indicator when loading but no streaming message exists yet
  const shouldShowTyping = useMemo(() => {
    if (!isLoading) return false;
    const hasStreamingMessage = messages.some(m => m.isStreaming);
    return !hasStreamingMessage;
  }, [isLoading, messages]);
  
  // Add delay before showing typing indicator
  useEffect(() => {
    if (shouldShowTyping) {
      const timer = setTimeout(() => {
        setDelayedTyping(true);
      }, 600); // 600ms delay before showing
      return () => clearTimeout(timer);
    } else {
      setDelayedTyping(false);
    }
  }, [shouldShowTyping]);
  const showTypingIndicator = shouldShowTyping && delayedTyping;
  
  // Use ref to track message IDs to prevent unnecessary re-renders
  const messageIdsRef = useRef<string>('');
  const currentIds = messages.map(m => m.id).join(',');
  if (messageIdsRef.current !== currentIds) {
    messageIdsRef.current = currentIds;
  }

  return (
    <MobileWrapper>
      <div className="min-h-screen min-h-[100dvh] bg-page-bg flex flex-col relative max-w-md mx-auto">
        {/* New Chat Header with Profile */}
        <ChatHeader 
          isOnline={astrologerOnline} 
          statusText={displayText} 
          isTyping={isLoading}
        />
        
        {/* Timer and End Session - fixed top right */}
        <div className="fixed top-0 right-0 h-14 flex items-center gap-2 z-50 pr-4">
          {sessionId && !sessionEnded && (
            <div className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium",
              timeRemaining <= APP_CONFIG.SESSION_WARNING_THRESHOLD 
                ? "bg-destructive/10 text-destructive animate-pulse" 
                : "bg-muted text-muted-foreground"
            )}>
              {formatTime(timeRemaining)}
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            className="text-muted-foreground hover:text-foreground h-8 px-3 text-xs touch-manipulation"
          >
            End Session
          </Button>
        </div>

        {/* Feedback Form - Drawer on mobile, Modal on desktop */}
        {sessionId && (
          isMobile ? (
            <Drawer open={showFeedback} onOpenChange={setShowFeedback}>
              <DrawerContent className="max-h-[92vh] bg-card">
                <div className="overflow-y-auto max-h-[85vh]">
                  <FeedbackForm
                    sessionId={sessionId}
                    onClose={handleFeedbackClose}
                    onSubmit={handleFeedbackSubmit}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            showFeedback && (
              <div className="fixed inset-0 bg-background/98 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto">
                <div className="w-full max-w-md mx-auto my-4 max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border/50 bg-card animate-in fade-in-0 zoom-in-95 duration-300">
                  <FeedbackForm
                    sessionId={sessionId}
                    onClose={handleFeedbackClose}
                    onSubmit={handleFeedbackSubmit}
                  />
                </div>
              </div>
            )
          )
        )}

        <main className="flex-1 px-2 pt-16 pb-safe flex flex-col relative z-10">
          <div className="flex-1 flex flex-col bg-card/95 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 overflow-hidden"
            style={{
              boxShadow: '0 4px 20px -5px hsl(var(--accent) / 0.15)'
            }}
          >
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {messages.map((message, index) => {
                  const isFirstAssistantMessage = message.role === 'assistant' && index === 0;
                  const prevMessage = messages[index - 1];
                  const showDateSeparator = index === 0 || 
                    (prevMessage && !isSameDay(message.timestamp, prevMessage.timestamp));
                  
                  // Check if this is a typing indicator message (streaming with no content)
                  const isTypingMessage = message.isStreaming && !message.content;
                  
                  return (
                    <div key={message.id}>
                      {showDateSeparator && (
                        <DateSeparator date={message.timestamp} />
                      )}
                      <div className="relative">
                        {isTypingMessage ? (
                          <TypingIndicator 
                            state={message.typingState || 'typing'}
                          />
                        ) : (
                          <ChatMessage
                            messageId={message.id}
                            role={message.role}
                            content={message.content}
                            timestamp={message.timestamp}
                            shouldAnimate={message.role === 'assistant' && message.id === latestMessageId}
                            onQuickReply={handleQuickReply}
                            showQuickReplies={
                              message.role === 'assistant' && 
                              index === messages.length - 1 &&
                              !isLoading
                            }
                            isLoading={isLoading}
                            isFirstMessage={isFirstAssistantMessage}
                            deliveryStatus={message.deliveryStatus}
                            isNudge={message.isNudge}
                            reactions={message.reactions}
                            readAt={message.readAt}
                          />
                        )}
                        {/* Retry button for failed messages */}
                        {message.deliveryStatus === 'failed' && (
                          <button
                            onClick={() => handleRetryMessage(message.id)}
                            className="absolute -right-2 -bottom-1 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:bg-destructive/90 transition-colors touch-manipulation"
                            aria-label="Retry sending message"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing indicator - only render when needed */}
                {showTypingIndicator && (
                  <div className="animate-in fade-in duration-200">
                    <TypingIndicator />
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-border/40 p-2 bg-background/60 backdrop-blur-sm pb-safe">
              <ChatInput
                onSend={handleSendMessage}
                onStopGeneration={stopGeneration}
                disabled={!isConnected}
                isGenerating={isGenerating}
                placeholder={isConnected ? "Type your message..." : "Connecting..."}
              />
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-2 mb-3 text-center text-[9px] text-muted-foreground space-x-2">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <span>•</span>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          </footer>
        </main>
      </div>
    </MobileWrapper>
  );
};

export default Chat;
