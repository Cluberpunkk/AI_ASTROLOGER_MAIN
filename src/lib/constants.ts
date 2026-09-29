// App Configuration Constants
export const APP_CONFIG = {
  // Session settings
  SESSION_DURATION_SECONDS: 300, // 5 minutes
  SESSION_WARNING_THRESHOLD: 60, // Show warning when 60 seconds remain
  
  // Message timing - reduced delays for faster UX
  ASSISTANT_MESSAGE_DELAY: 500, // 500ms delay for assistant messages (was 2000)
  QUICK_REPLY_DELAY: 0, // No delay for quick replies
  
  // Network settings
  REQUEST_TIMEOUT_MS: 30000, // 30 second timeout for network requests
  MAX_RETRY_ATTEMPTS: 3, // Max retries for failed messages
  
  // Deep links
  DEEP_LINK_URL: 'astrolokal://HomeScreen',
  DEEP_LINK_FALLBACK_DELAY: 1000, // 1 second fallback delay
  
  // Session redirect behavior
  SESSION_END_REDIRECT_DELAY: 1000, // 1 second before redirecting after session ends
  
  // Link usage tracking (for single-use links)
  LINK_USED_STORAGE_KEY: 'omkar_link_used',
  APP_REDIRECT_URL: '/', // Redirect URL when link is already used
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  SESSION_ID: 'omkar_session_id',
  SESSION_START_TIME: 'omkar_session_start_time',
  LINK_USED: 'omkar_link_used',
} as const;

// Default messages
export const DEFAULT_MESSAGES = {
  GREETING: "Namaste 🙏, main Omkar hoon aapka astrologer. Batao, abhi aapke mann mein sabse bada sawaal kya chal raha hai career, love, marriage, ya life ke kisi aur part ke baare mein?",
  SESSION_TITLE: 'New Chat',
} as const;

// UI Text
export const UI_TEXT = {
  SESSION_ENDED: 'Session Ended',
  REDIRECTING: 'Redirecting to app...',
  END_SESSION: 'End Session',
  SESSION_ENDING: 'Session ending...',
} as const;
