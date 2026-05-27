import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * @reusable
 * @description Merge Tailwind class names with stable precedence.
 * @keywords class names, classes, clsx, tailwind, merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
