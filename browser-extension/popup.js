const refresh = document.getElementById('refresh');
const status = document.getElementById('status');
let sequence = 0;
let timer;

function render(role, pages) {
  const box = document.getElementById(role);
  box.replaceChildren();
  const matches = pages.filter(page => page.role === role);
  const connected = matches.filter(page => page.connected);
  const label = document.createElement('p');
  label.className = connected.length ? 'ok' : 'pending';
  label.textContent = connected.length ? '页面可访问 · ' + connected.length + ' 个标签页' :
    matches.length ? '检测到页面，访问尚未通过' : '未检测到本浏览器中的对应页面';
  box.append(label);
  for (const page of matches) {
    const detail = document.createElement('p');
    detail.className = 'detail';
    detail.textContent = [page.title || '未命名页面', '标签页 ' + page.tabId, page.url, page.detail].filter(Boolean).join(' · ');
    box.append(detail);
  }
  return connected.length > 0;
}

function pending() {
  for (const role of ['config', 'design']) {
    const box = document.getElementById(role);
    box.replaceChildren();
    const label = document.createElement('p');
    label.className = 'pending';
    label.textContent = '页面发生变化，重新检测中…';
    box.append(label);
  }
}

async function check() {
  const request = ++sequence;
  refresh.disabled = true;
  status.textContent = '正在重新检测当前浏览器…';
  try {
    const result = await chrome.runtime.sendMessage({ type: 'check' });
    if (request !== sequence) return;
    if (result?.detectorProtocol !== 3) throw new Error('扩展后台仍是旧版，请在扩展管理页点击重新加载（↻）');
    if (result?.error || !Array.isArray(result?.pages)) throw new Error(result?.error || '扩展未响应，请重新加载');
    render('config', result.pages);
    render('design', result.pages);
    document.getElementById('scope').textContent = '检测范围：' + (result.browser || '当前浏览器') + ' 的当前用户配置；不包含另一浏览器';
    status.textContent = '检测时间：' + new Date(result.checkedAt || Date.now()).toLocaleTimeString() + ' · 每 2 秒刷新';
  } catch (error) {
    if (request !== sequence) return;
    render('config', []);
    render('design', []);
    status.textContent = '检测失败：' + error.message;
  } finally {
    if (request === sequence) refresh.disabled = false;
  }
}

function changed() {
  ++sequence;
  pending();
  clearTimeout(timer);
  timer = setTimeout(() => void check(), 100);
}

refresh.addEventListener('click', () => { pending(); void check(); });
for (const event of ['onRemoved', 'onCreated', 'onReplaced']) chrome.tabs[event]?.addListener(changed);
chrome.tabs.onUpdated?.addListener((_id, change) => {
  if ('url' in change || 'status' in change || 'discarded' in change) changed();
});
chrome.windows.onRemoved?.addListener(changed);
window.addEventListener('focus', changed);
const interval = setInterval(() => void check(), 2000);
window.addEventListener('unload', () => { clearInterval(interval); clearTimeout(timer); ++sequence; });
void check();
