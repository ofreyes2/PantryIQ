/**
 * Centralized date utility functions for consistent date handling across PantryIQ
 * All dates are stored as YYYY-MM-DD strings and derived from UTC to avoid timezone issues
 */

export const dateUtils = {
  /**
   * Get today's date as YYYY-MM-DD string
   */
  today: (): string => {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Get yesterday's date as YYYY-MM-DD string
   */
  yesterday: (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  },

  /**
   * Get date N days ago as YYYY-MM-DD string
   */
  daysAgo: (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  },

  /**
   * Get date N days from now as YYYY-MM-DD string
   */
  daysFromNow: (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
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
    const d1 = new Date(date1 + 'T12:00:00');
    const d2 = new Date(date2 + 'T12:00:00');
    const diffTime = d1.getTime() - d2.getTime();
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

    return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
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

    return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  },

  /**
   * Get full date and time string
   */
  fullDateTime: (date: string): string => {
    return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
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
