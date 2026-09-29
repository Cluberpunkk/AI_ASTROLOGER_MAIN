import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AstrologerProfile } from './AstrologerProfile';
import { Button } from './ui/button';
import astrologerAvatar from '@/assets/astrologer-omkar.png';

interface ChatHeaderProps {
  isOnline: boolean;
  statusText: string;
  isTyping: boolean;
}

export const ChatHeader = ({ isOnline, statusText, isTyping }: ChatHeaderProps) => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40 safe-area-inset">
        <div className="px-3 max-w-md mx-auto">
          <div className="flex items-center h-14 gap-2">
            {/* Back button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0 h-10 w-10 touch-manipulation"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Avatar - clickable for profile */}
            <button
              onClick={() => setShowProfile(true)}
              className="relative shrink-0 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary/20">
                <img
                  src={astrologerAvatar}
                  alt="Omkar"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Online indicator */}
              {isOnline && !isTyping && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
              )}
            </button>

            {/* Name and status */}
            <div className="flex flex-col min-w-0 flex-1">
              <button
                onClick={() => setShowProfile(true)}
                className="text-left focus:outline-none"
              >
                <h1 className="font-semibold text-foreground flex items-center gap-1 text-sm">
                  <span>Omkar</span>
                  <span className="text-xs">🕉️</span>
                </h1>
              </button>
              <p className={cn(
                "text-[11px] truncate",
                isTyping 
                  ? "text-primary animate-pulse" 
                  : isOnline 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-muted-foreground"
              )}>
                {isTyping ? "typing..." : statusText}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Sheet */}
      <AstrologerProfile 
        open={showProfile} 
        onOpenChange={setShowProfile} 
      />
    </>
  );
};
