import { useState, useEffect } from 'react';

interface ReferralData {
  code: string;
  source: 'url' | 'storage';
  capturedAt: number;
}

const REFERRAL_STORAGE_KEY = 'landingReferral';
const REFERRAL_TTL_DAYS = 7;

// Validate referral code format (alphanumeric, 4-12 characters)
function validateReferralCode(code: string): boolean {
  return /^[A-Z0-9]{4,12}$/.test(code);
}

// Check if stored referral has expired (older than 7 days)
function isReferralExpired(capturedAt: number): boolean {
  const expirationTime = REFERRAL_TTL_DAYS * 24 * 60 * 60 * 1000; // 7 days in ms
  return Date.now() - capturedAt > expirationTime;
}

/**
 * Hook for tracking and persisting referral codes across navigation
 * 
 * Features:
 * - Captures ref parameter from URL
 * - Validates code format before storing
 * - Persists to localStorage with TTL (7 days)
 * - Handles precedence: URL > fresh storage > legacy storage
 * - Provides helper to build registration URLs with ref
 */
export function useReferralTracking() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralSource, setReferralSource] = useState<'url' | 'storage' | null>(null);

  useEffect(() => {
    try {
      // Priority 1: Check URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const urlRef = urlParams.get('ref');

      if (urlRef) {
        const normalizedCode = urlRef.toUpperCase();
        
        if (validateReferralCode(normalizedCode)) {
          // Valid URL ref - save to storage and use it
          const referralData: ReferralData = {
            code: normalizedCode,
            source: 'url',
            capturedAt: Date.now(),
          };
          localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(referralData));
          setReferralCode(normalizedCode);
          setReferralSource('url');
          
          console.log('[Referral] Captured from URL:', normalizedCode);
          return;
        } else {
          console.warn('[Referral] Invalid ref code format from URL:', urlRef);
        }
      }

      // Priority 2: Check localStorage
      const storedData = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (storedData) {
        const parsed: ReferralData = JSON.parse(storedData);
        
        // Check if expired
        if (isReferralExpired(parsed.capturedAt)) {
          console.log('[Referral] Stored code expired, clearing...');
          localStorage.removeItem(REFERRAL_STORAGE_KEY);
          return;
        }
        
        // Valid stored ref
        setReferralCode(parsed.code);
        setReferralSource('storage');
        console.log('[Referral] Restored from storage:', parsed.code, `(${parsed.source})`);
      }
    } catch (error) {
      console.error('[Referral] Error loading referral code:', error);
    }
  }, []);

  // Helper to build registration URL with ref parameter
  const getRegisterUrl = () => {
    if (referralCode) {
      return `/register?ref=${referralCode}`;
    }
    return '/register';
  };

  // Clear referral code from storage (call after successful registration)
  const clearReferral = () => {
    try {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      setReferralCode(null);
      setReferralSource(null);
      console.log('[Referral] Cleared referral code');
    } catch (error) {
      console.error('[Referral] Error clearing referral:', error);
    }
  };

  return {
    referralCode,
    referralSource,
    getRegisterUrl,
    clearReferral,
    hasReferral: !!referralCode,
  };
}
