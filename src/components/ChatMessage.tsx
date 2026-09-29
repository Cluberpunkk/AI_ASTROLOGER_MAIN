import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';
import { QuickReplyChips } from './QuickReplyChips';
import astrologerAvatar from '@/assets/astrologer-omkar.png';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  shouldAnimate?: boolean;
  onQuickReply?: (message: string) => void;
  showQuickReplies?: boolean;
  isLoading?: boolean;
  isFirstMessage?: boolean;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isNudge?: boolean;
  reactions?: string[];
  onReaction?: (emoji: string) => void;
  messageId?: string;
  readAt?: Date;
}

const REACTION_EMOJIS = ['🙏', '❤️', '🌟'];

export const ChatMessage = ({ 
  role, 
  content, 
  timestamp, 
  shouldAnimate = false,
  onQuickReply,
  showQuickReplies = false,
  isLoading = false,
  isFirstMessage = false,
  deliveryStatus = 'read',
  isNudge = false,
  reactions = [],
  onReaction,
  messageId,
  readAt
}: ChatMessageProps) => {
  const isUser = role === 'user';
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [localReactions, setLocalReactions] = useState<string[]>(reactions);
  const [showSeenTooltip, setShowSeenTooltip] = useState(false);
  const [animateRead, setAnimateRead] = useState(false);
  const prevStatusRef = useRef<string | undefined>(deliveryStatus);

  // Detect status transition to 'read' and trigger animation
  useEffect(() => {
    if (prevStatusRef.current !== 'read' && deliveryStatus === 'read') {
      setAnimateRead(true);
      const timer = setTimeout(() => setAnimateRead(false), 700);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = deliveryStatus;
  }, [deliveryStatus]);

  const handleReaction = (emoji: string) => {
    const hasReaction = localReactions.includes(emoji);
    
    if (hasReaction) {
      setLocalReactions(prev => prev.filter(r => r !== emoji));
    } else {
      setLocalReactions(prev => [...prev, emoji]);
    }
    
    setShowReactionPicker(false);
    onReaction?.(emoji);
  };

  const renderReadReceipts = () => {
    if (!isUser) return null;

    switch (deliveryStatus) {
      case 'sending':
        return (
          <span className="text-white/50 flex items-center gap-0.5 transition-all duration-200">
            <Check className="w-3 h-3 animate-check-appear" />
          </span>
        );
      case 'sent':
        return (
          <span className="text-white/70 flex items-center gap-0.5 transition-all duration-200">
            <Check className="w-3 h-3" />
          </span>
        );
      case 'delivered':
        return (
          <span className="text-muted-foreground flex items-center gap-0.5 transition-all duration-200">
            <CheckCheck className="w-3 h-3 animate-check-appear" />
          </span>
        );
      case 'read':
        return (
          <span 
            className={cn(
              "text-blue-400 flex items-center gap-0.5 cursor-pointer relative",
              animateRead && "animate-check-to-blue"
            )}
            onMouseEnter={() => setShowSeenTooltip(true)}
            onMouseLeave={() => setShowSeenTooltip(false)}
            onTouchStart={() => setShowSeenTooltip(true)}
            onTouchEnd={() => setTimeout(() => setShowSeenTooltip(false), 1500)}
          >
            <CheckCheck className="w-3 h-3" />
            {/* Seen tooltip */}
            {showSeenTooltip && readAt && (
              <span className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded shadow-lg whitespace-nowrap animate-fade-in z-10">
                Seen at {readAt.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            )}
          </span>
        );
      case 'failed':
        return (
          <span className="text-destructive flex items-center gap-0.5 text-[10px]">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="flex-shrink-0 mr-2 mt-1">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-orange-200 shadow-sm">
            <img 
              src={astrologerAvatar} 
              alt="Omkar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      <div className={cn(
        "flex flex-col",
        isUser ? "max-w-[80%] sm:max-w-[70%]" : "max-w-[85%] sm:max-w-[75%]"
      )}>
        <div 
          className={cn(
            "relative px-4 py-3 group",
            isUser 
              ? "rounded-2xl rounded-br-sm" 
              : "rounded-2xl rounded-bl-sm",
            !isUser && shouldAnimate && "animate-message-glow"
          )}
          style={isUser ? {
            background: 'linear-gradient(135deg, #1b1b1b 0%, #2d2d2d 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          } : {
            backgroundColor: '#ffffff',
            border: '1px solid #e5e5e5',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
          onMouseEnter={() => !isUser && !isNudge && setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
        >
          <p className={cn(
            "text-[15px] leading-relaxed whitespace-pre-wrap break-words",
            isUser ? "text-white" : "text-foreground"
          )}
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            {content}
          </p>

          {/* Reaction picker for assistant messages */}
          {!isUser && !isNudge && (
            <div 
              className={cn(
                "absolute -bottom-3 right-2 flex gap-0.5 bg-white rounded-full px-1.5 py-0.5 shadow-lg border border-gray-200 transition-all duration-200",
                showReactionPicker 
                  ? "opacity-100 translate-y-0 scale-100" 
                  : "opacity-0 translate-y-1 scale-95 pointer-events-none"
              )}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm transition-all duration-150 hover:scale-125 active:scale-100",
                    localReactions.includes(emoji) && "bg-orange-100"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Reactions display */}
        {!isUser && localReactions.length > 0 && (
          <div className="flex gap-1 mt-1 px-1">
            {localReactions.map((emoji, index) => (
              <span 
                key={`${emoji}-${index}`}
                className="text-sm animate-scale-in cursor-pointer hover:scale-110 transition-transform"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp and read receipts */}
        <div className={cn(
          "flex items-center gap-1.5 mt-1.5 px-1",
          isUser ? "justify-end" : "justify-start"
        )}>
        {timestamp && (
            <span className="text-[10px] text-muted-foreground">
              {timestamp.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </span>
          )}
          {renderReadReceipts()}
        </div>
        
        {!isUser && showQuickReplies && onQuickReply && isFirstMessage && (
          <QuickReplyChips 
            onSelect={onQuickReply} 
            disabled={isLoading}
            variant="initial"
          />
        )}
      </div>
    </div>
  );
};
