/**
 * Tiny, dependency-free User-Agent parser — enough to show a friendly
 * "Chrome · macOS" style device label in the audit log. No external library
 * (keeps the app portable) and no fingerprinting; just OS + browser family.
 */

export function parseUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'Unknown device';

  // Operating system
  let os = 'Unknown OS';
  if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Browser family (order matters — Edge/Chrome both contain "Chrome")
  let browser = 'Unknown browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/chrome\//i.test(ua)) browser = 'Chrome';
  else if (/safari\//i.test(ua)) browser = 'Safari';

  const mobile = /mobile|iphone|android/i.test(ua) ? ' · Mobile' : '';
  return `${browser} · ${os}${mobile}`;
}
