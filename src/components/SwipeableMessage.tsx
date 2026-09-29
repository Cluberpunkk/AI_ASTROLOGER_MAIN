import { useState, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reply } from 'lucide-react';

interface SwipeableMessageProps {
  children: ReactNode;
  onSwipeReply?: () => void;
  disabled?: boolean;
  isUserMessage?: boolean;
}

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE = 80;

export const SwipeableMessage = ({ 
  children, 
  onSwipeReply,
  disabled = false,
  isUserMessage = false
}: SwipeableMessageProps) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || !onSwipeReply) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !onSwipeReply) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;
    
    // Only swipe right (for reply)
    if (diffX > 0 && Math.abs(diffX) > Math.abs(diffY)) {
      isSwipingRef.current = true;
      const newSwipeX = Math.min(diffX, MAX_SWIPE);
      setSwipeX(newSwipeX);
      setIsActive(newSwipeX >= SWIPE_THRESHOLD);
      
      // Prevent scrolling when swiping
      if (diffX > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (disabled || !onSwipeReply) return;
    
    if (swipeX >= SWIPE_THRESHOLD && onSwipeReply) {
      onSwipeReply();
    }
    
    setSwipeX(0);
    setIsActive(false);
    isSwipingRef.current = false;
  };

  return (
    <div className="relative overflow-hidden">
      {/* Reply indicator */}
      <div 
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-150",
          isActive ? "opacity-100 scale-110" : "opacity-40 scale-100"
        )}
        style={{ 
          transform: `translateX(${Math.max(0, swipeX - 40)}px) translateY(-50%)`,
        }}
      >
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          <Reply className="w-4 h-4" />
        </div>
      </div>
      
      {/* Message content */}
      <div
        className="transition-transform duration-150 ease-out touch-pan-y"
        style={{ 
          transform: `translateX(${swipeX}px)`,
          transition: isSwipingRef.current ? 'none' : undefined
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};
