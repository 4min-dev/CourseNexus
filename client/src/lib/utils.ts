import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const htmlToText = (html: string): string => {
  if (!html) return '';

  let text = html
    // First pass: block elements get double space for separation
    .replace(/<\/p>/gi, '  ')
    .replace(/<p[^>]*>/gi, '  ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/div>/gi, '  ')
    .replace(/<div[^>]*>/gi, '  ')
    .replace(/<\/?(h[1-6]|li|ul|ol|blockquote|table|tr|td)[^>]*>/gi, ' ')
    // Second pass: remove ALL other tags with single space
    .replace(/<[^>]*>/g, ' ')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();

  return text;
};