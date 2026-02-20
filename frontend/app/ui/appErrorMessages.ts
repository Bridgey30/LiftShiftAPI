export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  return 'Failed to import CSV. Please try again.';
};

export const getHevyErrorMessage = (err: unknown, cooldownSeconds?: number): string => {
  if (err instanceof Error && err.message) {
    const msg = err.message;
    // Rate limit error - show dynamic countdown
    if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('429') || msg.toLowerCase().includes('too many requests')) {
      if (cooldownSeconds && cooldownSeconds > 0) {
        return `Too many login attempts. Please wait ${cooldownSeconds}s before trying again.`;
      }
      return 'Too many login attempts. Please wait 60s before trying again.';
    }
    // "Load failed" is a Safari-specific error, often caused by content blockers, VPNs, or network issues
    if (msg.toLowerCase().includes('load failed') || msg.toLowerCase().includes('failed to fetch')) {
      return `Network error: ${msg}. This is often caused by content blockers, VPNs,  or network issues. Try disabling ad blockers or switching browsers.`;
    }
    return msg;
  }
  return 'Failed to fetch Hevy data. Please try again.';
};

export const getLyfatErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) {
    const msg = err.message;
    if (
      msg.toLowerCase().includes('401') ||
      msg.toLowerCase().includes('unauthorized') ||
      msg.toLowerCase().includes('invalid')
    ) {
      return 'Invalid API key. Please check your Lyfta API key and try again.';
    }
    if (msg.toLowerCase().includes('load failed') || msg.toLowerCase().includes('failed to fetch')) {
      return `Network error: ${msg}. This is often caused by content blockers, VPNs, or network issues. Try disabling ad blockers or switching browsers.`;
    }
    return msg;
  }
  return 'Failed to fetch Lyfta data. Please try again.';
};
