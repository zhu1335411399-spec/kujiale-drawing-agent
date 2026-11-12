import { pageRole } from './pages.js';
import { readDrawingPage } from './read-page.js';

const hostName = 'com.kujiale.construction_drawing';
const alarmName = 'drawingMcp';
const sites = ['https://www.kujiale.com/*', 'https://beta.kujiale.com/*', 'https://yun.kujiale.com/*', 'https://yun-beta.kujiale.com/*'];
const instanceId = crypto.randomUUID();
let port, polling = false, sequence = 0, generation = 0;
const pending = new Map();

function openPort() {
  if (port) return port;
  const opened = chrome.runtime.connectNative(hostName);
  port = opened;
  opened.onMessage.addListener(message => {
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    clearTimeout(task.timer);
    message.error ? task.reject(new Error(message.error)) : task.resolve(message.value);
  });
  opened.onDisconnect.addListener(() => {
    const detail = chrome.runtime.lastError?.message || '本机桥接已断开';
    if (port === opened) port = null;
    for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error(detail)); }
    pending.clear();
    void chrome.storage.session.set({ bridgeStatus: { connected: false, error: detail, checkedAt: Date.now() } });
  });
  return opened;
}

function post(route, input) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('本机桥接响应超时')); }, 10000);
    pending.set(id, { resolve, reject, timer });
    try { openPort().postMessage({ id, route, input }); }
    catch (error) { pending.delete(id); clearTimeout(timer); reject(error); }
  });
}

async function readTab(tabId, kind, options = {}) {
  const tab = await chrome.tabs.get(tabId);
  const role = pageRole(tab.url);
  if (!role || (kind !== 'context' && role !== 'config')) throw new Error('目标页面类型不匹配，请重新读取上下文');
  const [probe] = await chrome.scripting.executeScript({
    target: { tabId }, func: readDrawingPage,
    args: [{ kind, name: options.name, offset: options.offset, limit: options.limit }]
  });
  const current = await chrome.tabs.get(tabId);
  if (current.url !== tab.url || pageRole(current.url) !== role) throw new Error('页面已关闭或跳转，请重新读取上下文');
  if (!probe?.result || pageRole(probe.result.url) !== role) throw new Error('页面读取失败或已跳转');
  return { tabId, ...probe.result };
}

async function perform(task) {
  if (task.operation === 'context') {
    const tabs = (await chrome.tabs.query({ url: sites })).filter(tab => pageRole(tab.url));
    const pages = await Promise.all(tabs.map(async tab => {
      try { return await readTab(tab.id, 'context'); }
      catch (error) { return { tabId: tab.id, role: pageRole(tab.url), error: error.message }; }
    }));
    const live = new Map((await chrome.tabs.query({ url: sites })).map(tab => [tab.id, tab]));
    return pages.filter(page => {
      const current = live.get(page.tabId);
      const initial = tabs.find(tab => tab.id === page.tabId);
      return current && current.url === initial.url && pageRole(current.url) === page.role;
    });
  }
  if (task.operation === 'config' || task.operation === 'styles') return readTab(task.args.tabId, task.operation, task.args);
  throw new Error('Unsupported readonly operation');
}

export async function bridgeStatus() {
  const { bridgeEnabled } = await chrome.storage.local.get('bridgeEnabled');
  const { bridgeStatus } = await chrome.storage.session.get('bridgeStatus');
  return { enabled: bridgeEnabled !== false, transport: 'native-messaging', ...bridgeStatus };
}

export async function connectBridge() {
  await chrome.storage.local.set({ bridgeEnabled: true });
  await chrome.alarms.create(alarmName, { periodInMinutes: 0.5 });
  void pollBridge();
  return bridgeStatus();
}

export async function disconnectBridge() {
  generation++;
  await chrome.storage.local.set({ bridgeEnabled: false });
  await chrome.alarms.clear(alarmName);
  port?.disconnect();
  port = null;
  for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error('连接已暂停')); }
  pending.clear();
  await chrome.storage.session.set({ bridgeStatus: { connected: false, checkedAt: Date.now() } });
  return bridgeStatus();
}

export async function pollBridge() {
  if (polling) return;
  polling = true;
  const current = generation;
  try {
    // The old development pairing secret is no longer used or retained.
    await chrome.storage.local.remove('bridgeToken');
    const saved = await chrome.storage.local.get(['clientId', 'bridgeEnabled']);
    if (saved.bridgeEnabled === false) return;
    const clientId = saved.clientId || crypto.randomUUID();
    await chrome.storage.local.set({ clientId });
    await chrome.alarms.create(alarmName, { periodInMinutes: 0.5 });
    while (current === generation) {
      if ((await chrome.storage.local.get('bridgeEnabled')).bridgeEnabled === false) return;
      const { task } = await post('/poll', { clientId, instanceId });
      await chrome.storage.session.set({ bridgeStatus: { connected: true, checkedAt: Date.now() } });
      if (task) {
        let value, error;
        try { value = await perform(task); } catch (failure) { error = failure.message; }
        if (current !== generation) return;
        await post('/result', { clientId, id: task.id, value, error });
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  } catch (error) {
    await chrome.storage.session.set({ bridgeStatus: { connected: false, error: error.message, checkedAt: Date.now() } });
  } finally { polling = false; }
}

chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === alarmName) void pollBridge(); });
chrome.runtime.onStartup.addListener(() => { void pollBridge(); });
chrome.runtime.onInstalled.addListener(() => { void pollBridge(); });

