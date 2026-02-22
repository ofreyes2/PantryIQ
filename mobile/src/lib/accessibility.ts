import { AccessibilityInfo } from 'react-native';

export interface AccessibilitySettings {
  boldText: boolean;
  screenReaderEnabled: boolean;
  reduceMotion: boolean;
  screenReaderVolume: number;
}

/**
 * Get current accessibility settings from device
 */
export async function getAccessibilitySettings(): Promise<Partial<AccessibilitySettings>> {
  try {
    const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
    const boldText = await AccessibilityInfo.isBoldTextEnabled();
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();

    return {
      screenReaderEnabled,
      boldText,
      reduceMotion,
    };
  } catch (error) {
    console.warn('Failed to get accessibility settings:', error);
    return {};
  }
}

/**
 * Announce text to screen reader (VoiceOver)
 */
export async function announceForAccessibility(text: string): Promise<void> {
  try {
    await AccessibilityInfo.announceForAccessibility(text);
  } catch (error) {
    console.warn('Failed to announce for accessibility:', error);
  }
}

/**
 * Set accessibility label for a view
 * Use this when button text alone doesn't describe action
 */
export function createAccessibilityLabel(
  primary: string,
  secondary?: string,
  hint?: string
): string {
  const parts = [primary];
  if (secondary) parts.push(secondary);
  if (hint) parts.push(`Hint: ${hint}`);
  return parts.join('. ');
}

/**
 * Format large numbers for accessibility
 * "1000" becomes "one thousand" for screen readers
 */
export function formatNumberAccessible(num: number): string {
  if (num < 1000) return num.toString();

  const units = [
    { value: 1000000, name: 'million' },
    { value: 1000, name: 'thousand' },
  ];

  for (const unit of units) {
    if (num >= unit.value) {
      const divided = (num / unit.value).toFixed(1);
      return `${divided} ${unit.name}`;
    }
  }

  return num.toString();
}

/**
 * Create screen-reader-only text for additional context
 */
export function createA11yHintText(hint: string): string {
  // This text will be announced to screen readers but not visible
  return hint;
}

/**
 * Check if a color has sufficient contrast for accessibility
 * Returns luminance value (0-1)
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;

  const luminance =
    (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance;
}

/**
 * Check if contrast between two colors meets WCAG AA standard
 * @param foreground Foreground color hex
 * @param background Background color hex
 * @returns true if contrast ratio is >= 4.5:1 (AA standard)
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  const fgLum = getRelativeLuminance(foreground);
  const bgLum = getRelativeLuminance(background);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  const contrast = (lighter + 0.05) / (darker + 0.05);

  return contrast >= 4.5; // AA standard for normal text
}

/**
 * Check if a string might be confusing for screen reader users
 * (e.g., uses color as only indicator)
 */
export function hasColorOnlyIndicator(description: string): boolean {
  const colorOnlyPattern = /only (red|blue|green|yellow|orange|purple|pink|gray|grey)/i;
  return colorOnlyPattern.test(description);
}
