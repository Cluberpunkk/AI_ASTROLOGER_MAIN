import { supabase } from '@/integrations/supabase/client';

const VISITOR_ID_KEY = 'astrolokal_visitor_id';
const SESSION_ID_KEY = 'astrolokal_session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const UPDATE_INTERVAL = 5000; // 5 seconds

let sessionUpdateInterval: number | null = null;
let currentPageAnalyticsId: string | null = null;
let maxScrollDepth = 0;
let interactionCount = 0;

// Helper function to get cookie
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// Helper function to set cookie (1 year expiry)
const setCookie = (name: string, value: string) => {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
};

// Get or create visitor ID with cookie fallback for better persistence
export const getVisitorId = (): string => {
  // Try localStorage first
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  
  // Fallback to cookie if localStorage is empty
  if (!visitorId) {
    visitorId = getCookie(VISITOR_ID_KEY);
  }
  
  // Generate new ID if both are empty
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    console.log('🆔 New visitor ID generated:', visitorId);
  }
  
  // Store in both localStorage and cookie for redundancy
  try {
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
    setCookie(VISITOR_ID_KEY, visitorId);
  } catch (error) {
    console.warn('Failed to persist visitor ID:', error);
  }
  
  return visitorId;
};

// Get or create session ID
export const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Extract UTM parameters from URL
const getUTMParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
  };
};

// Capture UTM parameters
export const captureUTMParameters = async () => {
  const utmParams = getUTMParams();
  const hasUTM = Object.values(utmParams).some(val => val !== null);
  
  if (!hasUTM) return;

  const visitorId = getVisitorId();
  
  try {
    await supabase.from('utm_tracking').insert({
      visitor_id: visitorId,
      ...utmParams,
      page_url: window.location.href,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to capture UTM parameters:', error);
  }
};

// Initialize session
export const initializeSession = async () => {
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const utmParams = getUTMParams();

  try {
    const { data } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (!data) {
      await supabase.from('user_sessions').insert({
        visitor_id: visitorId,
        session_id: sessionId,
        session_start: new Date().toISOString(),
        page_url: window.location.href,
        device_type: getDeviceType(),
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
      });
    }

    // Start session duration updates
    if (sessionUpdateInterval) clearInterval(sessionUpdateInterval);
    sessionUpdateInterval = window.setInterval(updateSessionDuration, UPDATE_INTERVAL);
  } catch (error) {
    console.error('Failed to initialize session:', error);
  }
};

// Update session duration
const updateSessionDuration = async () => {
  const sessionId = getSessionId();
  
  try {
    const { data } = await supabase
      .from('user_sessions')
      .select('session_start')
      .eq('session_id', sessionId)
      .single();

    if (data) {
      const duration = Math.floor((Date.now() - new Date(data.session_start).getTime()) / 1000);
      await supabase
        .from('user_sessions')
        .update({ 
          total_duration_seconds: duration,
          session_end: new Date().toISOString(),
        })
        .eq('session_id', sessionId);
    }
  } catch (error) {
    console.error('Failed to update session duration:', error);
  }
};

// Track page view
export const trackPageView = async () => {
  const visitorId = getVisitorId();
  const sessionId = getSessionId();

  try {
    const { data } = await supabase.from('page_analytics').insert({
      visitor_id: visitorId,
      session_id: sessionId,
      page_url: window.location.href,
      entry_time: new Date().toISOString(),
    }).select().single();

    currentPageAnalyticsId = data?.id || null;
    maxScrollDepth = 0;
    interactionCount = 0;

    // Setup scroll tracking
    setupScrollTracking();
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

// Setup scroll tracking
const setupScrollTracking = () => {
  const updateScrollDepth = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.floor((scrollTop / docHeight) * 100);
    maxScrollDepth = Math.max(maxScrollDepth, scrollPercent || 0);
  };

  window.addEventListener('scroll', updateScrollDepth, { passive: true });
  updateScrollDepth();
};

// Track page exit
export const trackPageExit = async () => {
  if (!currentPageAnalyticsId) return;

  const exitTime = new Date().toISOString();
  const { data } = await supabase
    .from('page_analytics')
    .select('entry_time')
    .eq('id', currentPageAnalyticsId)
    .single();

  if (data) {
    const timeOnPage = Math.floor((Date.now() - new Date(data.entry_time).getTime()) / 1000);
    
    await supabase
      .from('page_analytics')
      .update({
        exit_time: exitTime,
        time_on_page_seconds: timeOnPage,
        scroll_depth_percent: maxScrollDepth,
        interactions_count: interactionCount,
      })
      .eq('id', currentPageAnalyticsId);
  }
};

// Setup exit tracking
export const setupExitTracking = () => {
  window.addEventListener('beforeunload', trackPageExit);
};

// Track generic event
export const trackEvent = async (
  eventType: string,
  eventName: string,
  eventData?: Record<string, any>
) => {
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  
  interactionCount++;

  try {
    await supabase.from('user_events').insert({
      visitor_id: visitorId,
      session_id: sessionId,
      event_type: eventType,
      event_name: eventName,
      event_data: eventData || null,
      page_url: window.location.href,
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

// Track button click
export const trackButtonClick = (buttonName: string, additionalData?: Record<string, any>) => {
  trackEvent('click', `button_${buttonName}`, additionalData);
};

// Track link click
export const trackLinkClick = (linkName: string, href: string) => {
  trackEvent('click', `link_${linkName}`, { href });
};

// Initialize analytics on load
export const initAnalytics = async () => {
  await captureUTMParameters();
  await initializeSession();
  await trackPageView();
  setupExitTracking();
};
