import { pageRole } from './pages.js';

export const supportedSites = ['https://www.kujiale.com/*', 'https://beta.kujiale.com/*', 'https://yun.kujiale.com/*', 'https://yun-beta.kujiale.com/*'];

export function browserProfileScope(userAgent = navigator.userAgent) {
  return { browser: userAgent.includes('Edg/') ? 'Edge' : userAgent.includes('Chrome/') ? 'Chrome' : '当前浏览器', scope: 'current-browser-profile' };
}

export async function collectPages(api = chrome) {
  const tabs = (await api.tabs.query({ url: supportedSites })).filter(tab => pageRole(tab.url));
  const pages = await Promise.all(tabs.map(async tab => {
    const role = pageRole(tab.url);
    const base = { role, tabId: tab.id, windowId: tab.windowId, title: tab.title || '', url: cleanUrl(tab.url), connected: false, constructionWorkspaceVerified: false };
    if (tab.discarded) return { ...base, detail: '标签页已休眠，尚未验证访问' };
    try {
      const [probe] = await api.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          href: location.href,
          title: document.title,
          ready: document.readyState,
          hasContent: Boolean(document.body?.children.length)
        })
      });
      const result = probe?.result;
      const current = await api.tabs.get(tab.id);
      if (!result || result.href !== tab.url || current.url !== tab.url || pageRole(result.href) !== role) {
        return { ...base, detail: '页面已跳转，等待重新检测' };
      }
      const connected = result.ready !== 'loading' && result.hasContent && !current.discarded;
      return { ...base, title: result.title, connected,
        detail: connected ? role === 'design' ? '设计器可访问；“图纸&清单”是否打开尚未核验' : '配置页面可访问；账号及配置归属尚需核对' : '页面正在加载或内容不可用' };
    } catch {
      return { ...base, detail: '页面已关闭或无法访问' };
    }
  }));
  // A tab can disappear or navigate while another page is still being probed.
  const finalTabs = new Map((await api.tabs.query({ url: supportedSites })).map(tab => [tab.id, tab]));
  return { checkedAt: Date.now(), pages: pages.filter(page => {
    const final = finalTabs.get(page.tabId);
    const initial = tabs.find(tab => tab.id === page.tabId);
    return final && final.url === initial.url && pageRole(final.url) === page.role;
  }) };
}

function cleanUrl(value) {
  try { const url = new URL(value); return url.origin + url.pathname; }
  catch { return ''; }
}
