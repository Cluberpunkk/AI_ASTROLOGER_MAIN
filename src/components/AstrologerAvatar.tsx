import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AstrologerAvatarProps {
  state: 'idle' | 'listening' | 'speaking';
  className?: string;
}

export const AstrologerAvatar = ({ state, className }: AstrologerAvatarProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // In a real implementation, we'd load different video assets based on state
    // For now, we'll use a placeholder that responds to state changes
    if (videoRef.current) {
      videoRef.current.playbackRate = state === 'speaking' ? 1 : 0.8;
    }
  }, [state]);

  return (
    <div className={cn("relative w-full max-w-md mx-auto", className)}>
      {/* Radial glow background */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle at center, hsl(var(--avatar-glow-center)) 0%, transparent 70%)`
          }}
        />
      </div>

      {/* Avatar container */}
      <div className="relative aspect-[3/4] rounded-2xl border border-border overflow-hidden bg-gradient-to-b from-avatar-glow-center/20 to-transparent">
        {/* Placeholder avatar - in production, use video elements */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 to-transparent">
          <div className="text-center space-y-4 p-8">
            <div className={cn(
              "w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg",
              state === 'speaking' && "animate-pulse-gentle"
            )}>
              <span className="text-5xl">🕉️</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-foreground">Omkar</h3>
              <p className="text-sm text-muted-foreground">Your Astrologer</p>
            </div>
          </div>
        </div>

        {/* Video element (hidden for now, would be used in production) */}
        <video
          ref={videoRef}
          className="hidden w-full h-full object-cover"
          loop
          muted
          playsInline
        />
      </div>

      {/* Waveform halo - only visible during listening */}
      {state === 'listening' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-waveform-primary/40 animate-waveform-pulse"
              style={{
                width: `${100 + i * 15}%`,
                height: `${100 + i * 15}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Speaking indicator shimmer */}
      {state === 'speaking' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
          <div 
            className="h-full w-full bg-gradient-to-r from-transparent via-accent to-transparent animate-shimmer"
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}
    </div>
  );
};
