import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useHaptics } from '@/hooks/useHaptics';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStopGeneration?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  placeholder?: string;
}

export const ChatInput = ({ 
  onSend,
  onStopGeneration,
  disabled = false,
  isGenerating = false,
  placeholder = "Share what's on your mind..."
}: ChatInputProps) => {
  const [input, setInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { impact, notification } = useHaptics();
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle mobile keyboard resize using visualViewport API
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // Calculate keyboard height from viewport difference
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const newKeyboardHeight = windowHeight - viewportHeight;
      
      setKeyboardHeight(newKeyboardHeight > 50 ? newKeyboardHeight : 0);
      
      // Scroll the textarea into view when keyboard opens
      if (newKeyboardHeight > 50 && textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, [isMobile]);

  const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
    onResult: (transcript) => {
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      // Auto-send the message after voice input is captured
      setTimeout(() => {
        if (transcript.trim()) {
          impact('medium');
          onSend(transcript);
          setInput('');
        }
      }, 100);
    },
    onError: (error) => {
      notification('error');
      toast.error(error);
    }
  });

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    
    const trimmedInput = input.trim();
    if (trimmedInput && !disabled) {
      impact('light');
      onSend(trimmedInput);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoiceInput = () => {
    console.log('[ChatInput] Toggle voice input, isListening:', isListening);
    
    if (!isListening) {
      impact('medium');
      startListening();
      toast.info('🎤 Listening... Speak now', {
        description: 'Your message will be sent automatically'
      });
    }
  };

  const handleStopGeneration = () => {
    impact('medium');
    onStopGeneration?.();
  };

  // Handle blur to reset keyboard height
  const handleBlur = () => {
    // Small delay to allow for button clicks before resetting
    setTimeout(() => {
      setKeyboardHeight(0);
    }, 150);
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className="relative"
      style={{
        // Add padding when keyboard is open on mobile to keep input visible
        paddingBottom: isMobile && keyboardHeight > 0 ? '8px' : undefined,
      }}
    >
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={isListening ? "Listening..." : placeholder}
        disabled={isListening}
        className={cn(
          "min-h-[52px] max-h-[100px] resize-none pr-24",
          "focus-visible:ring-2 focus-visible:ring-ring",
          "bg-background/80 backdrop-blur-sm border-border/60 shadow-sm",
          "text-base", // Prevent iOS zoom on focus (min 16px)
          isListening && "border-primary/50 bg-primary/5"
        )}
        rows={1}
        // Prevent iOS auto-zoom
        style={{ fontSize: '16px' }}
      />
      
      {/* Voice input button - hidden during generation */}
      {isSupported && (
        <div className={cn(
          "absolute right-12 bottom-2 transition-opacity duration-200",
          isGenerating ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          {isListening && (
            <>
              <div className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-destructive/20 animate-pulse" 
                   style={{ animationDuration: '1.5s' }} />
            </>
          )}
          <Button
            type="button"
            size="icon"
            onClick={toggleVoiceInput}
            disabled={disabled || isListening || isGenerating}
            className={cn(
              "relative z-10 h-10 w-10 sm:h-8 sm:w-8 rounded-full touch-manipulation",
              "transition-all duration-200 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]",
              isListening 
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-[0_0_20px_rgba(239,68,68,0.5)]" 
                : "bg-secondary hover:bg-accent text-secondary-foreground"
            )}
          >
            {isListening ? (
              <MicOff className="w-5 h-5 sm:w-4 sm:h-4 animate-pulse" />
            ) : (
              <Mic className="w-5 h-5 sm:w-4 sm:h-4" />
            )}
            <span className="sr-only">
              {isListening ? 'Listening...' : 'Press to speak'}
            </span>
          </Button>
        </div>
      )}

      {/* Send/Stop button - smooth transition between states */}
      <div className="absolute right-2 bottom-2 z-10">
        <Button
          type={isGenerating ? "button" : "submit"}
          size="icon"
          onClick={isGenerating ? handleStopGeneration : undefined}
          disabled={!isGenerating && (!input.trim() || isListening)}
          className={cn(
            "h-10 w-10 sm:h-8 sm:w-8 rounded-full touch-manipulation",
            "transition-all duration-300 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]",
            isGenerating 
              ? "bg-muted hover:bg-muted/80 text-muted-foreground border border-border" 
              : "bg-primary hover:bg-secondary hover:text-secondary-foreground"
          )}
        >
          {isGenerating ? (
            <Square className="w-3.5 h-3.5 sm:w-3 sm:h-3 fill-current" />
          ) : (
            <Send className="w-5 h-5 sm:w-4 sm:h-4" />
          )}
          <span className="sr-only">{isGenerating ? 'Stop generation' : 'Send message'}</span>
        </Button>
      </div>
    </form>
  );
};
