import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionButtonProps {
  isActive: boolean;
  isConnecting: boolean;
  onClick: () => void;
  className?: string;
}

export const SessionButton = ({ 
  isActive, 
  isConnecting, 
  onClick,
  className 
}: SessionButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={isConnecting}
      className={cn(
        "h-14 px-8 text-lg font-medium rounded-full transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive 
          ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" 
          : "bg-primary text-primary-foreground hover:bg-secondary hover:text-secondary-foreground",
        className
      )}
    >
      {isConnecting ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Connecting...
        </>
      ) : isActive ? (
        'End Session'
      ) : (
        'Start Your Session'
      )}
    </Button>
  );
};
