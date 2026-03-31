import { useState, useEffect } from 'react';

const STORAGE_KEY = 'landing_visit_id';

interface LandingVisitState {
  visitId: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

interface StoredVisit {
  visitId: string;
  timestamp: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Hook to track landing page visits and manage visitId in sessionStorage.
 * 
 * - Checks sessionStorage for existing visitId on mount
 * - If not found, POSTs to /api/landing/track-visit (server extracts metadata)
 * - Includes UTM parameters from URL query string
 * - Returns visitId for use in registration flow
 * 
 * @example
 * const { visitId, status } = useLandingVisit();
 * 
 * if (status === 'success' && visitId) {
 *   // Include visitId in registration payload
 * }
 */
export function useLandingVisit() {
  const [state, setState] = useState<LandingVisitState>({
    visitId: null,
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const trackVisit = async () => {
      try {
        // Check sessionStorage first
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed: StoredVisit = JSON.parse(stored);
            const isValidVisitId = typeof parsed.visitId === 'string' && UUID_REGEX.test(parsed.visitId);
            if (isValidVisitId && mounted) {
              setState({
                visitId: parsed.visitId,
                status: 'success',
                error: null,
              });
              return;
            }
            // Corrupted/legacy value: remove and request a fresh id.
            sessionStorage.removeItem(STORAGE_KEY);
          } catch (parseError) {
            console.warn('[useLandingVisit] Failed to parse stored visit, will fetch new:', parseError);
            sessionStorage.removeItem(STORAGE_KEY);
          }
        }

        // No valid cached visitId, fetch from server
        if (mounted) {
          setState(prev => ({ ...prev, status: 'loading' }));
        }

        // Build URL with UTM parameters from current location
        const urlParams = new URLSearchParams(window.location.search);
        const utmParams = new URLSearchParams();
        
        // Preserve UTM parameters if they exist
        const utmSource = urlParams.get('utm_source');
        const utmMedium = urlParams.get('utm_medium');
        const utmCampaign = urlParams.get('utm_campaign');
        
        if (utmSource) utmParams.set('utm_source', utmSource);
        if (utmMedium) utmParams.set('utm_medium', utmMedium);
        if (utmCampaign) utmParams.set('utm_campaign', utmCampaign);

        const queryString = utmParams.toString();
        const url = `/api/landing/track-visit${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to track visit: ${response.status}`);
        }

        const data = await response.json();
        const visitId = data.visitId;

        if (!visitId || !UUID_REGEX.test(visitId)) {
          throw new Error('No visitId returned from server');
        }

        // Store in sessionStorage
        const toStore: StoredVisit = {
          visitId,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));

        if (mounted) {
          setState({
            visitId,
            status: 'success',
            error: null,
          });
        }
      } catch (error: any) {
        console.error('[useLandingVisit] Error tracking visit:', error);
        if (mounted) {
          setState({
            visitId: null,
            status: 'error',
            error: error.message || 'Failed to track visit',
          });
        }
      }
    };

    trackVisit();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Clear the cached visitId (useful after successful registration)
   */
  const clearVisitId = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({
      visitId: null,
      status: 'idle',
      error: null,
    });
  };

  return {
    visitId: state.visitId,
    status: state.status,
    error: state.error,
    clearVisitId,
  };
}
