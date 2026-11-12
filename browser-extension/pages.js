const hosts = new Set(['www.kujiale.com', 'beta.kujiale.com', 'yun.kujiale.com', 'yun-beta.kujiale.com']);

export function pageRole(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.port) return null;
    if (url.pathname.startsWith('/pub/saas/workbench/construction/drawing_config/')) return 'config';
    if (/^\/(?:cloud\/)?tool\/h5\/bim\/?$/.test(url.pathname) ||
        /^\/pub\/tool\/bim\/cloud\/?$/.test(url.pathname)) return 'design';
    return null;
  } catch {
    return null;
  }
}

