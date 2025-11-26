import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import type { Request } from 'express';
import crypto from 'crypto';

export interface VisitorMetadata {
  ip: string | null;
  country: string | null;
  city: string | null;
  browser: string | null;
  device: string | null;
  os: string | null;
  userAgent: string | null;
  fingerprint: string;
}

/**
 * Extract visitor metadata from Express request
 * Includes IP, geo location, browser/device/OS info, and fingerprint
 */
export function extractVisitorMetadata(req: Request): VisitorMetadata {
  // Get IP address (handle proxies and Replit forwarding)
  const ip = (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.socket.remoteAddress ||
    ''
  ).split(',')[0].trim();

  // Get geo location from IP
  const geo = ip ? geoip.lookup(ip) : null;
  
  // Parse User-Agent
  const userAgent = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();

  // Create fingerprint from stable request properties
  const fingerprintData = [
    ip,
    userAgent,
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
  ].join('|');
  
  const fingerprint = crypto
    .createHash('sha256')
    .update(fingerprintData)
    .digest('hex')
    .substring(0, 32);

  return {
    ip: ip || null,
    country: geo?.country || null,
    city: geo?.city || null,
    browser: uaResult.browser.name || null,
    device: uaResult.device.type || 'desktop',
    os: uaResult.os.name || null,
    userAgent: userAgent || null,
    fingerprint,
  };
}

/**
 * Extract UTM parameters from request query
 */
export function extractUtmParams(req: Request): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
} {
  return {
    utmSource: (req.query.utm_source as string) || null,
    utmMedium: (req.query.utm_medium as string) || null,
    utmCampaign: (req.query.utm_campaign as string) || null,
  };
}
