// Runs in MAIN world to use the same public package as the observed page.
// No eval, no arbitrary URL, and no write methods are exposed.
export async function readEncryptedConfig() {
  const saved = false, published = false;
  try {
    const href = location.href;
    if (!['https://www.kujiale.com', 'https://beta.kujiale.com', 'https://yun.kujiale.com', 'https://yun-beta.kujiale.com'].includes(location.origin) ||
        !location.pathname.startsWith('/pub/saas/workbench/construction/drawing_config/')) throw new Error('Not a drawing configuration page');
    const status = () => document.querySelector('[class*="TopBarRightComponent-configDesc"]')?.textContent || '';
    const initialStatus = status();
    const identity = () => {
      const session = window.g_sessionAccount;
      return { accountId: session?.obsAccountId, userId: session?.obsUserId, rootAccountId: session?.obsRootAccount?.obsAccountId };
    };
    const initialIdentity = identity();
    if (Object.values(initialIdentity).some(id => !id)) throw new Error('Page session identity unavailable');
    const observed = performance.getEntriesByType('resource').map(e => new URL(e.name, location.origin))
      .filter(u => u.origin === location.origin && u.pathname === '/dcs-drawing/site/api/open/config/full/get' && u.searchParams.get('obsRootConfigId'));
    const ids = [...new Set(observed.map(u => u.searchParams.get('obsRootConfigId')))];
    if (ids.length !== 1) throw new Error('No unique observed root configuration; refresh target page');
    const pkg = window.pubCmnPackages?.['@qunhe/tools-common'];
    if (typeof pkg !== 'function' || typeof pkg.keys !== 'function') throw new Error('Page common package unavailable');
    const keys = pkg.keys();
    const key = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'].map(suffix => './http' + suffix).find(k => keys.includes(k));
    if (!key) throw new Error('Page HTTP module not found');
    const module = pkg(key);
    if (typeof module.getEncryptedClient !== 'function') throw new Error('Encrypted client unavailable');
    const client = module.getEncryptedClient([
      { request: { beforeSend(request) {
        request.headers = { ...request.headers, 'x-tool-name': 'diy', 'Content-Type': 'application/json', ...initialIdentity };
        return request;
      } } },
      { request: { beforeSend(request) { request.headers = { ...request.headers, 'content-type': 'text/x-tool-enc' }; return request; } } }
    ]);
    const response = await client.get('/dcs-drawing/site/api/open/config/full/get', { params: { obsRootConfigId: ids[0] }, timeout: 12000 });
    if (location.href !== href || status() !== initialStatus || JSON.stringify(identity()) !== JSON.stringify(initialIdentity)) throw new Error('Page or identity changed during read');
    const data = response?.data?.d;
    if (!data || data.obsRootConfigId !== ids[0] || !Array.isArray(data.configs)) throw new Error('Decoded response structure or root configuration ID mismatch');
    const configs = data.configs.map(config => ({ configType: config.configType,
      jsonDataType: config.jsonData === null ? 'null' : Array.isArray(config.jsonData) ? 'array' : typeof config.jsonData,
      jsonDataKeys: config.jsonData && typeof config.jsonData === 'object' ? Object.keys(config.jsonData).slice(0, 80) : [] }));
    return { source: 'page-encrypted-client', status: 'decoded-root-matched', configurationParsed: true,
      rootIdMatched: true, basicConfigOwnershipVerified: false, configCount: configs.length, configs, saved, published,
      limitation: 'Summary only; root configuration ID does not prove selected basic configuration or customer ownership.' };
  } catch (error) {
    return { source: 'page-encrypted-client', status: 'failed', configurationParsed: false,
      error: String(error.message).slice(0, 500), saved, published };
  }
}
