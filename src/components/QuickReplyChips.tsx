import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Briefcase, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickReplyChipsProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
  variant?: 'initial' | 'conversation';
}

interface ReplyWithIcon {
  icon: LucideIcon;
  label: string;
  message: string;
}

interface ReplyWithoutIcon {
  label: string;
  message: string;
}

const initialReplies: ReplyWithIcon[] = [
  { 
    icon: Heart, 
    label: "Love/Relationships", 
    message: "I want to talk about love and relationships" 
  },
  { 
    icon: Briefcase, 
    label: "Career", 
    message: "I want to know about my career" 
  },
  { 
    icon: Users, 
    label: "Marriage", 
    message: "I want to discuss marriage" 
  }
];

const conversationReplies: ReplyWithoutIcon[] = [
  { 
    label: "Tell me more", 
    message: "Can you tell me more about this?" 
  },
  { 
    label: "Give remedies", 
    message: "What remedies or steps should I take?" 
  },
  { 
    label: "What's next", 
    message: "What should I focus on next?" 
  }
];

export const QuickReplyChips = ({ onSelect, disabled, variant = 'conversation' }: QuickReplyChipsProps) => {
  const [clicked, setClicked] = useState(false);
  const clickedRef = useRef(false);
  
  const handleSelect = useCallback((message: string) => {
    // Use ref for immediate check to prevent any race conditions
    if (clickedRef.current || disabled) {
      console.log('QuickReply blocked by ref guard');
      return;
    }
    clickedRef.current = true;
    setClicked(true);
    onSelect(message);
  }, [disabled, onSelect]);
  
  const isDisabled = disabled || clicked;
  
  // Hide chips after selection for cleaner UX
  if (clicked) {
    return null;
  }
  
  if (variant === 'initial') {
    return (
      <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
        {initialReplies.map((reply) => {
          const IconComponent = reply.icon;
          return (
            <Button
              key={reply.label}
              variant="outline"
              size="sm"
              onClick={() => handleSelect(reply.message)}
              disabled={isDisabled}
              className={cn(
                "text-xs gap-1.5 hover:bg-accent/50 hover:text-accent-foreground",
                "border-border/60 bg-background/40 backdrop-blur-sm",
                "transition-all duration-200 hover:scale-105",
                "min-h-[44px] touch-manipulation px-4",
                isDisabled && "opacity-50 pointer-events-none"
              )}
            >
              <IconComponent className="w-4 h-4" />
              {reply.label}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
      {conversationReplies.map((reply) => {
        return (
          <Button
            key={reply.label}
            variant="outline"
            size="sm"
            onClick={() => handleSelect(reply.message)}
            disabled={isDisabled}
            className={cn(
              "text-xs gap-1.5 hover:bg-accent/50 hover:text-accent-foreground",
              "border-border/60 bg-background/40 backdrop-blur-sm",
              "transition-all duration-200 hover:scale-105",
              "min-h-[44px] touch-manipulation px-4",
              isDisabled && "opacity-50 pointer-events-none"
            )}
          >
            {reply.label}
          </Button>
        );
      })}
    </div>
  );
};
