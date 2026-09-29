import { STORAGE_KEYS, APP_CONFIG } from './constants';

/**
 * Check if a link has been used before
 * @returns Always returns false - link tracking disabled for open access
 */
export const isLinkUsed = (): boolean => {
  return false; // Disabled - allow everyone to access
};

/**
 * Mark a link as used in localStorage
 * Disabled for open access
 */
export const markLinkAsUsed = (): void => {
  // Disabled - no longer tracking
};

/**
 * Clear link usage tracking (useful for testing or reset)
 */
export const clearLinkUsage = (): void => {
  localStorage.removeItem(STORAGE_KEYS.LINK_USED);
};

/**
 * Handle link click with single-use behavior
 * Disabled - always executes onFirstUse callback
 */
export const handleSingleUseLink = (
  onFirstUse: () => void,
  redirectUrl: string = APP_CONFIG.APP_REDIRECT_URL
): void => {
  // Always allow access - link tracking disabled
  onFirstUse();
};
