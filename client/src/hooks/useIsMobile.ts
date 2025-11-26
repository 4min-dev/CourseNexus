import { useState, useEffect } from "react";

/**
 * Universal hook for mobile detection
 * Uses single shared resize listener to prevent memory leaks
 * Returns true if viewport width < 768px (md breakpoint)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize with correct value on mount
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    // Use matchMedia for better performance
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    handleChange(mediaQuery);

    // Modern browsers support addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return isMobile;
}
