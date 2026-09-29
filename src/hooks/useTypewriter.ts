import { useState, useEffect, useRef, useCallback } from 'react';

// Human-like typing with variable speed
const getVariableDelay = (char: string, baseSpeed: number): number => {
  // Pause longer after punctuation
  if (['.', '!', '?'].includes(char)) {
    return baseSpeed * 8 + Math.random() * 150;
  }
  if ([',', ';', ':'].includes(char)) {
    return baseSpeed * 4 + Math.random() * 80;
  }
  // Slight pause after spaces (thinking between words)
  if (char === ' ') {
    return baseSpeed * 1.5 + Math.random() * 30;
  }
  // Faster for common letter combinations
  if (/[aeiou]/.test(char.toLowerCase())) {
    return baseSpeed * 0.8 + Math.random() * 15;
  }
  // Regular characters with slight randomness
  return baseSpeed + Math.random() * 20;
};

export const useTypewriter = (text: string, speed: number = 25, enabled: boolean = true) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const typeNextChar = useCallback(() => {
    if (indexRef.current < text.length) {
      const currentChar = text[indexRef.current];
      setDisplayedText(text.slice(0, indexRef.current + 1));
      indexRef.current++;
      
      const delay = getVariableDelay(currentChar, speed);
      timeoutRef.current = setTimeout(typeNextChar, delay);
    } else {
      setIsComplete(true);
    }
  }, [text, speed]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If not enabled, show full text immediately
    if (!enabled) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    // Reset for new text
    setDisplayedText('');
    setIsComplete(false);
    indexRef.current = 0;

    if (!text) return;

    // Start typing with a small initial delay
    timeoutRef.current = setTimeout(typeNextChar, speed);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, enabled, typeNextChar]);

  return { displayedText, isComplete };
};
