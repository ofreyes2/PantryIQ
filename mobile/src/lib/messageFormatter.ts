import { Linking } from 'react-native';

export interface FormattedTextSegment {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

/**
 * Parse a message into text and link segments
 * Detects URLs in format: http://, https://, www., or youtube.com
 */
export function parseMessageSegments(text: string): FormattedTextSegment[] {
  if (!text) return [];

  const segments: FormattedTextSegment[] = [];

  // Regex to match URLs
  // Matches: http(s)://, www., youtube.com, or general domain patterns
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|youtube\.com\/[^\s]*|\b[a-zA-Z0-9][\w-]*\.[a-zA-Z]{2,}\/[^\s]*)/g;

  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add the URL
    let url = match[0];
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('www.')) {
      // If it's a domain without www, add https
      if (url.includes('.')) {
        url = 'https://' + url;
      }
    } else if (url.startsWith('www.')) {
      url = 'https://' + url;
    }

    segments.push({
      type: 'link',
      content: match[0],
      url,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: 'text', content: text }];
}

/**
 * Open a URL in the browser
 */
export async function openURL(url: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      console.warn(`Cannot open URL: ${url}`);
    }
  } catch (error) {
    console.error('Error opening URL:', error);
  }
}

/**
 * Extract plain text from formatted segments (for copying)
 */
export function extractPlainText(segments: FormattedTextSegment[]): string {
  return segments.map((seg) => seg.content).join('');
}

/**
 * Detect if text contains images that should be shown
 * Looks for patterns like:
 * - [Image: description]
 * - Generated image: ...
 * - Image of ...
 */
export function detectImageReference(text: string): boolean {
  const imagePatterns = [
    /\[Image:.*?\]/i,
    /Generated image:/i,
    /Image of /i,
    /Here\'s an image/i,
    /I\'ve created an image/i,
  ];

  return imagePatterns.some((pattern) => pattern.test(text));
}

/**
 * Extract image description if present
 */
export function extractImageDescription(text: string): string | null {
  // Look for [Image: description] format
  const match = text.match(/\[Image:\s*([^\]]+)\]/i);
  if (match) {
    return match[1].trim();
  }

  // Look for other patterns
  const lines = text.split('\n');
  for (const line of lines) {
    if (/^Generated image:|^I\'ve created an image|^Here\'s an image/i.test(line)) {
      return line;
    }
  }

  return null;
}
