import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import astrologerAvatar from '@/assets/astrologer-omkar.png';

export type TypingState = 'typing' | 'paused' | 'thinking';

interface TypingIndicatorProps {
  className?: string;
  name?: string;
  state?: TypingState;
}

// Persona-specific typing messages
const TYPING_MESSAGES = {
  typing: [
    "Omkar is typing",
    "Omkar likh rahe hain",
  ],
  paused: [
    "Omkar paused",
    "Omkar ruke hain",
  ],
  thinking: [
    "Consulting the stars",
    "Checking your chart",
    "Stars se pooch rahe hain",
  ],
};

export const TypingIndicator = ({ 
  className, 
  name = "Omkar",
  state = 'typing'
}: TypingIndicatorProps) => {
  // Stable random index per state - only changes when state changes
  const [messageIndex, setMessageIndex] = useState(() => 
    Math.floor(Math.random() * TYPING_MESSAGES[state].length)
  );
  
  useEffect(() => {
    setMessageIndex(Math.floor(Math.random() * TYPING_MESSAGES[state].length));
  }, [state]);
  
  const displayMessage = TYPING_MESSAGES[state][messageIndex] || TYPING_MESSAGES[state][0];

  return (
    <div className={cn(
      "flex w-full mb-4 justify-start animate-in fade-in slide-in-from-bottom-3 duration-500",
      className
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0 mr-2 mt-1">
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-orange-200 shadow-sm">
          <img 
            src={astrologerAvatar} 
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Typing bubble */}
      <div 
        className="px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e5e5',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm transition-colors duration-300",
            state === 'paused' ? "text-gray-400" : "text-gray-500"
          )}>
            {displayMessage}
          </span>
          
          {state === 'typing' && (
            <div className="flex gap-1 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" />
            </div>
          )}
          
          {state === 'thinking' && (
            <div className="flex gap-1 items-center">
              <span className="text-orange-400 animate-pulse">✨</span>
            </div>
          )}
          
          {state === 'paused' && (
            <div className="flex gap-1 items-center opacity-50">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
