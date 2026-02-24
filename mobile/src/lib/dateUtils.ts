/**
 * Centralized date utility functions for consistent date handling across PantryIQ
 * All dates are stored as YYYY-MM-DD strings using device local timezone
 */

/**
 * Get local date string (YYYY-MM-DD) accounting for device timezone
 */
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dateUtils = {
  /**
   * Get today's date as YYYY-MM-DD string
   */
  today: (): string => {
    return getLocalDateString(new Date());
  },

  /**
   * Get yesterday's date as YYYY-MM-DD string
   */
  yesterday: (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  },

  /**
   * Get date N days ago as YYYY-MM-DD string
   */
  daysAgo: (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return getLocalDateString(d);
  },

  /**
   * Get date N days from now as YYYY-MM-DD string
   */
  daysFromNow: (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return getLocalDateString(d);
  },

  /**
   * Check if a date string is today
   */
  isToday: (date: string): boolean => {
    return date === dateUtils.today();
  },

  /**
   * Check if a date string is yesterday
   */
  isYesterday: (date: string): boolean => {
    return date === dateUtils.yesterday();
  },

  /**
   * Check if a date string is in the future
   */
  isFuture: (date: string): boolean => {
    return date > dateUtils.today();
  },

  /**
   * Check if a date string is in the past
   */
  isPast: (date: string): boolean => {
    return date < dateUtils.today();
  },

  /**
   * Check if two dates are the same day
   */
  isSameDay: (date1: string, date2: string): boolean => {
    return date1 === date2;
  },

  /**
   * Get the difference in days between two dates (negative if date1 is before date2)
   */
  daysDifference: (date1: string, date2: string): number => {
    const [y1, m1, d1] = date1.split('-').map(Number);
    const [y2, m2, d2] = date2.split('-').map(Number);
    const d1Date = new Date(y1, m1 - 1, d1);
    const d2Date = new Date(y2, m2 - 1, d2);
    const diffTime = d1Date.getTime() - d2Date.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Get human-readable label for a date
   * Today → "Today"
   * Yesterday → "Yesterday"
   * Other dates → "Monday, February 24"
   */
  displayLabel: (date: string): string => {
    if (dateUtils.isToday(date)) return 'Today';
    if (dateUtils.isYesterday(date)) return 'Yesterday';

    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  },

  /**
   * Get short date label (Mon Feb 24)
   */
  shortLabel: (date: string): string => {
    if (dateUtils.isToday(date)) return 'Today';
    if (dateUtils.isYesterday(date)) return 'Yesterday';

    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  },

  /**
   * Get full date and time string
   */
  fullDateTime: (date: string): string => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /**
   * Get current time of day
   * Returns: 'morning' (before 12pm), 'afternoon' (12pm-5pm), 'evening' (after 5pm)
   */
  timeOfDay: (): 'morning' | 'afternoon' | 'evening' => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  },

  /**
   * Get current day of week name
   */
  dayOfWeek: (): string => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  },

  /**
   * Get the last 7 days as date strings (from 7 days ago to today)
   */
  last7Days: (): string[] => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(dateUtils.daysAgo(i));
    }
    return days;
  },

  /**
   * Get the last 30 days as date strings
   */
  last30Days: (): string[] => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      days.push(dateUtils.daysAgo(i));
    }
    return days;
  },

  /**
   * Parse a date string and return day, month, year
   */
  parse: (dateStr: string): { year: number; month: number; day: number } => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return { year, month, day };
  },

  /**
   * Create a date string from year, month, day
   */
  format: (year: number, month: number, day: number): string => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },
};
