// LiftShift runtime config. Overwritten at container startup by
// /docker-entrypoint.d/40-liftshift-env.sh from BACKEND_URL env.
// Built-in default is empty = same-origin /api via Nginx proxy.
window.__LIFTSHIFT_ENV__ = window.__LIFTSHIFT_ENV__ || {
  VITE_BACKEND_URL: ""
};
