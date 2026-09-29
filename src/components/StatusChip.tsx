import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface StatusChipProps {
  message: string;
  autoHide?: boolean;
  duration?: number;
  className?: string;
}

export const StatusChip = ({ 
  message, 
  autoHide = false, 
  duration = 3000,
  className 
}: StatusChipProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration]);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium",
        "bg-accent/20 text-muted-foreground border border-border",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      {message}
    </div>
  );
};
