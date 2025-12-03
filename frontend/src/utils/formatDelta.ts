/**
 * Format egg delta for display
 */
export const formatDelta = (before: number, after: number): string => {
  const delta = after - before;
  
  if (delta === 0) {
    return 'No change';
  }
  
  const action = delta < 0 ? 'taken' : 'added';
  const count = Math.abs(delta);
  
  return `${count} egg${count !== 1 ? 's' : ''} ${action}`;
};

/**
 * Format delta with before/after counts
 */
export const formatDeltaFull = (before: number, after: number): string => {
  const delta = after - before;
  const sign = delta > 0 ? '+' : '';
  
  return `${before} → ${after} (${sign}${delta})`;
};

/**
 * Get delta status for styling
 */
export const getDeltaStatus = (delta: number): 'positive' | 'negative' | 'neutral' => {
  if (delta > 0) return 'positive';
  if (delta < 0) return 'negative';
  return 'neutral';
};

/**
 * Format egg count with proper grammar
 */
export const formatEggCount = (count: number): string => {
  return `${count} egg${count !== 1 ? 's' : ''}`;
};
