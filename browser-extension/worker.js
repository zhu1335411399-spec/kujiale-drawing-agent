import { bridgeStatus, connectBridge, disconnectBridge, pollBridge } from './native-bridge.js';
import { pageRole } from './pages.js';

const sites = ['https://www.kujiale.com/*', 'https://beta.kujiale.com/*', 'https://yun.kujiale.com/*', 'https://yun-beta.kujiale.com/*'];

async function checkPage(tab) {
  const expectedRole = pageRole(tab.url);
  try {
    const [probe] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        url: location.origin + location.pathname,
        title: document.title,
        ready: document.readyState,
        hasContent: Boolean(document.body?.children.length)
      })
    });
    const result = probe?.result;
    if (!result || pageRole(result.url) !== expectedRole) throw new Error('页面已跳转，请重新检测');
    const connected = result.ready !== 'loading' && result.hasContent;
    return {
      role: expectedRole, tabId: tab.id, title: result.title,
      url: result.url, connected,
      detail: connected ? '已成功读取页面' : '页面正在加载，请稍后重试'
    };
  } catch (error) {
    return { role: expectedRole, tabId: tab.id, connected: false, title: tab.title || '', detail: error.message };
  }
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.url !== chrome.runtime.getURL('popup.html')) return;
  const actions = { mcpStatus: () => bridgeStatus(), mcpConnect: () => connectBridge(message.token), mcpDisconnect: () => disconnectBridge() };
  if (actions[message.type]) {
    actions[message.type]().then(reply, error => reply({ error: error.message }));
    return true;
  }
  if (message.type !== 'check') return;
  chrome.tabs.query({ url: sites })
    .then(tabs => Promise.all(tabs.filter(tab => pageRole(tab.url)).map(checkPage)))
    .then(pages => reply({ pages }), error => reply({ error: error.message }));
  return true;
});

void pollBridge();

