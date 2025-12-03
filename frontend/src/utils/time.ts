/**
 * Format a date to GMT-3 (Brasilia time)
 */
export const formatBrasiliaTime = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    ...options,
  });
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else {
    return formatBrasiliaTime(d, { dateStyle: 'short' });
  }
};

/**
 * Format date for display
 */
export const formatDate = (date: string | Date): string => {
  return formatBrasiliaTime(date, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

/**
 * Check if a date has expired
 */
export const isExpired = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < Date.now();
};
