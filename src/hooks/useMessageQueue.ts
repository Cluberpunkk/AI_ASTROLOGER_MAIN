import { useState, useCallback, useEffect, useRef } from 'react';

interface QueuedMessage {
  id: string;
  content: string;
  timestamp: Date;
  retryCount: number;
  isQuickReply?: boolean;
}

const STORAGE_KEY = 'omkar_pending_messages';
const MAX_RETRIES = 3;

export const useMessageQueue = () => {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const processingRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setQueue(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })));
      }
    } catch (e) {
      console.error('Error loading message queue:', e);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      if (queue.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error saving message queue:', e);
    }
  }, [queue]);

  const addToQueue = useCallback((content: string, isQuickReply = false): string => {
    const id = `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message: QueuedMessage = {
      id,
      content,
      timestamp: new Date(),
      retryCount: 0,
      isQuickReply,
    };

    setQueue(prev => [...prev, message]);
    return id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const incrementRetry = useCallback((id: string): boolean => {
    let shouldRemove = false;
    
    setQueue(prev => prev.map(msg => {
      if (msg.id === id) {
        if (msg.retryCount >= MAX_RETRIES - 1) {
          shouldRemove = true;
          return msg;
        }
        return { ...msg, retryCount: msg.retryCount + 1 };
      }
      return msg;
    }));

    if (shouldRemove) {
      removeFromQueue(id);
      return false; // Exceeded max retries
    }
    
    return true; // Can still retry
  }, [removeFromQueue]);

  const getNextMessage = useCallback((): QueuedMessage | null => {
    return queue[0] || null;
  }, [queue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    processingRef.current = processing;
  }, []);

  return {
    queue,
    queueLength: queue.length,
    hasQueuedMessages: queue.length > 0,
    addToQueue,
    removeFromQueue,
    incrementRetry,
    getNextMessage,
    clearQueue,
    isProcessing: processingRef.current,
    setProcessing,
  };
};
