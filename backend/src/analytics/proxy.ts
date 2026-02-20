import { createProxyMiddleware } from 'http-proxy-middleware';

const API_HOST = process.env.POSTHOG_HOST?.replace(/^https?:\/\//, '') || 'us.i.posthog.com';
const ASSET_HOST = process.env.POSTHOG_REGION === 'eu' ? 'eu-assets.i.posthog.com' : 'us-assets.i.posthog.com';

const setCorsHeaders = (res: any, origin?: string | string[]) => {
  const resolvedOrigin = Array.isArray(origin) ? origin[0] : origin;
  res.setHeader('Access-Control-Allow-Origin', resolvedOrigin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
};

export const createPosthogProxy = (prefix: string) => {
  return createProxyMiddleware({
    target: `https://${API_HOST}`,
    changeOrigin: true,
    secure: true,
    pathRewrite: {
      [`^${prefix}`]: '',
    },
    onProxyReq: (proxyReq: any, req: any) => {
      proxyReq.setHeader('host', API_HOST);
      proxyReq.setHeader('X-Real-IP', req.ip || '');
      proxyReq.setHeader('X-Forwarded-For', req.headers['x-forwarded-for'] || req.ip || '');
    },
    onProxyRes: (_proxyRes: any, req: any, res: any) => {
      setCorsHeaders(res, req.headers.origin);
    },
  } as any);
};

export const createPosthogAssetProxy = (assetPrefix: string) => {
  return createProxyMiddleware({
    target: `https://${ASSET_HOST}`,
    changeOrigin: true,
    secure: true,
    pathRewrite: (path: string) => `${assetPrefix}${path}`,
    onProxyReq: (proxyReq: any, req: any) => {
      proxyReq.setHeader('host', ASSET_HOST);
      proxyReq.setHeader('X-Real-IP', req.ip || '');
      proxyReq.setHeader('X-Forwarded-For', req.headers['x-forwarded-for'] || req.ip || '');
    },
    onProxyRes: (_proxyRes: any, req: any, res: any) => {
      setCorsHeaders(res, req.headers.origin);
    },
  } as any);
};

const proxyPath = String(process.env.POSTHOG_PROXY_PATH ?? '/ingest').trim() || '/ingest';
export const posthogProxyPath = proxyPath.startsWith('/') ? proxyPath : `/${proxyPath}`;
