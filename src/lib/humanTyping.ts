// Human-like typing simulation utilities

export type TypingState = 'typing' | 'paused' | 'thinking';

/**
 * Calculate natural typing duration based on message length
 * Longer messages = longer typing time, but with diminishing returns
 */
export const getTypingDuration = (text: string): number => {
  const charCount = text.length;
  
  // Short messages (< 50 chars): 1-1.5 seconds
  if (charCount < 50) {
    return 1000 + Math.random() * 500;
  }
  
  // Medium messages (50-120 chars): 1.5-2.5 seconds
  if (charCount < 120) {
    return 1500 + (charCount - 50) * 10 + Math.random() * 400;
  }
  
  // Long messages (120-200 chars): 2.5-3.5 seconds
  if (charCount < 200) {
    return 2500 + (charCount - 120) * 8 + Math.random() * 400;
  }
  
  // Very long messages: cap at 3.5-4 seconds
  return 3500 + Math.random() * 500;
};

/**
 * Simulate human-like typing with natural hesitation patterns
 * 40% chance of hesitation, 25% chance of "stopped typing"
 */
export const simulateTypingWithHesitation = async (
  duration: number,
  onStart: () => void,
  onPause: () => void,
  onResume: () => void,
  onThinking?: () => void
): Promise<void> => {
  return new Promise((resolve) => {
    onStart();
    
    // Reduced probability for faster feel
    const shouldHesitate = Math.random() < 0.25 && duration > 1500;
    const shouldThink = Math.random() < 0.1 && duration > 2000;
    
    if (shouldThink && onThinking) {
      // Brief "consulting stars" moment
      const thinkAt = duration * 0.5;
      const thinkDuration = 600 + Math.random() * 400;
      
      setTimeout(() => {
        onThinking();
        setTimeout(() => {
          onResume();
          setTimeout(resolve, duration - thinkAt - thinkDuration);
        }, thinkDuration);
      }, thinkAt);
    } else if (shouldHesitate) {
      // Brief hesitation - subtle pause
      const hesitateAt = duration * 0.5;
      const hesitationDuration = 400 + Math.random() * 300;
      
      setTimeout(() => {
        onPause();
        setTimeout(() => {
          onResume();
          setTimeout(resolve, duration * 0.3);
        }, hesitationDuration);
      }, hesitateAt);
    } else {
      // Normal typing - no interruption
      setTimeout(resolve, duration);
    }
  });
};

/**
 * Get delay between multiple message bubbles - feels like reading + preparing next message
 */
export const getInterBubbleDelay = (): number => {
  return 500 + Math.random() * 700; // 500-1200ms between bubbles
};
