import { useState, useEffect, useCallback, useRef } from 'react';

// Hinglish nudges matching Omkar's personality
const NUDGES = {
  tier1: [ // 25 seconds
    "Koi baat nahi, apna time lo... main yahan hoon 🙏",
    "Sochne mein time lagta hai, bilkul theek hai. Batao jab mann kare.",
    "Kuch aur poochna hai? Ya bas soch rahe ho?",
    "Main wait kar raha hoon, no rush... 🌟"
  ],
  tier2: [ // 35 seconds
    "Mann mein kya chal raha hai? Career, love, ya kuch personal?",
    "Agar koi sawaal hai toh freely poocho, I'm here to help.",
    "Aaj ka mood kaisa hai? Sometimes stars affect our energy too...",
    "Kuch specific baat karni hai? Ya general guidance chahiye?"
  ],
  tier3: [ // 45 seconds
    "Chalo ek quick check-in - love life ya career, kya discuss karein?",
    "Tumhari kundli ke hisaab se yeh phase interesting hai... kuch specific jaanna hai?",
    "Planets ke transit se mood swing hota hai sometimes. Batao kya scene hai life mein? 🌟",
    "Agar confused ho kya poochein, toh batao main guide kar deta hoon."
  ]
};

interface UseInactivityNudgesProps {
  onNudge: (message: string) => void;
  isEnabled: boolean;
  isLoading: boolean;
}

export const useInactivityNudges = ({ 
  onNudge, 
  isEnabled, 
  isLoading 
}: UseInactivityNudgesProps) => {
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Use ref to track nudges sent to persist across re-renders
  const nudgesSentRef = useRef<Set<number>>(new Set());
  // Track if a nudge is currently being processed
  const nudgeProcessingRef = useRef(false);

  const getRandomNudge = (tier: 'tier1' | 'tier2' | 'tier3'): string => {
    const nudges = NUDGES[tier];
    return nudges[Math.floor(Math.random() * nudges.length)];
  };

  const resetActivity = useCallback(() => {
    setLastActivityTime(Date.now());
    nudgesSentRef.current.clear();
    nudgeProcessingRef.current = false;
  }, []);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivityTime(Date.now());
    };

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  // Check for nudge timing
  useEffect(() => {
    if (!isEnabled || isLoading) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      // Skip if already processing a nudge
      if (nudgeProcessingRef.current) return;
      
      const elapsed = (Date.now() - lastActivityTime) / 1000;

      // Tier 1: 25 seconds
      if (elapsed >= 25 && elapsed < 35 && !nudgesSentRef.current.has(1)) {
        nudgeProcessingRef.current = true;
        nudgesSentRef.current.add(1);
        onNudge(getRandomNudge('tier1'));
        setTimeout(() => { nudgeProcessingRef.current = false; }, 1000);
      }
      // Tier 2: 35 seconds
      else if (elapsed >= 35 && elapsed < 45 && !nudgesSentRef.current.has(2)) {
        nudgeProcessingRef.current = true;
        nudgesSentRef.current.add(2);
        onNudge(getRandomNudge('tier2'));
        setTimeout(() => { nudgeProcessingRef.current = false; }, 1000);
      }
      // Tier 3: 45 seconds
      else if (elapsed >= 45 && !nudgesSentRef.current.has(3)) {
        nudgeProcessingRef.current = true;
        nudgesSentRef.current.add(3);
        onNudge(getRandomNudge('tier3'));
        setTimeout(() => { nudgeProcessingRef.current = false; }, 1000);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isEnabled, isLoading, lastActivityTime, onNudge]);

  return {
    resetActivity,
    lastActivityTime
  };
};
