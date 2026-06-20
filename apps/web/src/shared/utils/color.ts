function toLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Returns the WCAG 2.1 relative luminance of a hex color string. */
export function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Returns a legible text color (#2b221a or #ffffff) for the given hex
 * background, based on WCAG 2.1 relative luminance.
 */
export function hexTextColor(hex: string): string {
  return hexLuminance(hex) > 0.179 ? '#2b221a' : '#ffffff';
}
