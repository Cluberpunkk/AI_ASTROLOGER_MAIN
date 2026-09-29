import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceInputOptions {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

export const useVoiceInput = ({ onResult, onError, language = 'en-IN' }: UseVoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    console.log('[Voice] Initializing speech recognition...');
    
    if (!SpeechRecognition) {
      console.warn('[Voice] Speech Recognition API not supported in this browser');
      setIsSupported(false);
      return;
    }
    
    console.log('[Voice] Speech Recognition API is supported');
    setIsSupported(true);
    
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[Voice] Speech recognition started successfully');
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        console.log('[Voice] Speech recognized:', transcript);
        
        // Haptic feedback: success pattern
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 50, 30]);
        }
        
        // Call the callback passed from the component
        if (recognitionRef.current) {
          const currentOnResult = (recognitionRef.current as any)._onResult;
          if (currentOnResult) {
            currentOnResult(transcript);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[Voice] Speech recognition error:', event.error);
        setIsListening(false);
        
        const errorMessage = event.error === 'no-speech' 
          ? 'No speech detected. Please try speaking again.'
          : event.error === 'not-allowed'
          ? 'Microphone permission denied. Please allow microphone access in your browser settings.'
          : event.error === 'aborted'
          ? 'Voice input was cancelled.'
          : event.error === 'network'
          ? 'Network error. Please check your connection and try again.'
          : `Voice input error: ${event.error}. Please try again.`;
        
        // Call the error callback if set
        if (recognitionRef.current) {
          const currentOnError = (recognitionRef.current as any)._onError;
          if (currentOnError) {
            currentOnError(errorMessage);
          }
        }
      };

      recognition.onend = () => {
        console.log('[Voice] Speech recognition ended');
        setIsListening(false);
        
        // Haptic feedback: completion pattern
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 100, 50]);
        }
      };

      recognitionRef.current = recognition;
      console.log('[Voice] Speech recognition initialized successfully');
    } catch (error) {
      console.error('[Voice] Error initializing speech recognition:', error);
      setIsSupported(false);
      onError?.('Voice input not available on this device');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Silent cleanup
        }
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    console.log('[Voice] startListening called, isListening:', isListening);
    
    if (!recognitionRef.current) {
      console.error('[Voice] Recognition not initialized');
      return;
    }
    
    if (isListening) {
      console.log('[Voice] Already listening, ignoring start request');
      return;
    }
    
    // Store callbacks on the recognition object
    (recognitionRef.current as any)._onResult = onResult;
    (recognitionRef.current as any)._onError = onError;
    
    try {
      console.log('[Voice] Starting speech recognition...');
      recognitionRef.current.start();
    } catch (error) {
      console.error('[Voice] Error starting recognition:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to start voice input';
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [isListening, onResult, onError]);

  const stopListening = useCallback(() => {
    console.log('[Voice] stopListening called, isListening:', isListening);
    
    if (recognitionRef.current && isListening) {
      try {
        console.log('[Voice] Stopping speech recognition...');
        recognitionRef.current.stop();
      } catch (error) {
        console.error('[Voice] Error stopping recognition:', error);
      }
    }
  }, [isListening]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening
  };
};

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList extends ArrayLike<SpeechRecognitionResult> {}

  interface SpeechRecognitionResult extends ArrayLike<SpeechRecognitionAlternative> {
    readonly isFinal: boolean;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
}
