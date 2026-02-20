import type { Request } from 'express';

interface GeoLocationResponse {
  countryCode?: string;
  country?: string;
  status?: string;
}

export const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  return req.ip || '';
};

export const getCountryFromIP = async (ip: string): Promise<string | null> => {
  if (
    !ip ||
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.')
  ) {
    return null;
  }

  try {
    const cleanIp = ip.replace('::ffff:', '');
    const res = await fetch(`https://ip-api.com/json/${cleanIp}?fields=countryCode`);
    const data = (await res.json()) as GeoLocationResponse;
    return data.countryCode || null;
  } catch {
    return null;
  }
};
