const el = id => document.getElementById(id);
const send = message => chrome.runtime.sendMessage(message);
async function capture(action) {
  const tabId = Number(el('pages').value);
  if (!tabId) { el('status').textContent = '请先选择后台页面'; return; }
  try {
    const data = await send({ type: 'captureApiUi', tabId, action });
    el('result').textContent = JSON.stringify(data, null, 2);
    el('status').textContent = data.error ? data.error : data.active ? '正在采集，可以正常操作网页' : '采集已停止';
  } catch (error) { el('status').textContent = error.message; }
}
el('captureStart').onclick = () => void capture('start');
el('captureStop').onclick = () => void capture('stop');
async function connection() {
  try { const state = await send({ type: 'mcpStatus' }); el('connection').textContent = state.connected ? '桥接已连接 · 127.0.0.1:8788' : '尚未连接：' + (state.error || '请启动本机 HTTP 服务'); }
  catch (error) { el('connection').textContent = error.message; }
}
async function pages() {
  const selected = el('pages').value;
  const data = await send({ type: 'check' });
  el('pages').replaceChildren();
  for (const page of (data.pages || []).filter(p => p.role === 'config' && p.connected)) {
    const option = document.createElement('option'); option.value = page.tabId; option.textContent = (page.title || '施工图后台') + ' · ' + page.tabId; el('pages').append(option);
  }
  if ([...el('pages').options].some(p => p.value === selected)) el('pages').value = selected;
  if (!el('pages').options.length) el('status').textContent = '请先打开施工图后台配置页面。';
}
async function read(resource) {
  const tabId = Number(el('pages').value);
  if (!tabId) { el('status').textContent = '请先选择后台页面。'; return; }
  el('observe').disabled = el('templates').disabled = true;
  el('status').textContent = '正在只读获取…';
  try {
    const data = await send({ type: 'apiReadUi', resource, tabId });
    el('result').textContent = JSON.stringify(data, null, 2);
    el('status').textContent = data.error ? '读取失败，请查看下方具体原因。' : resource === 'templates' ? '已取得接口响应；业务内容仍需核验。' : '接口记录已读取，不包含响应正文。';
  } catch (error) { el('status').textContent = error.message; }
  finally { el('observe').disabled = el('templates').disabled = false; }
}
el('observe').onclick = () => void read('observed-requests');
el('templates').onclick = () => void read('templates');
el('fullconfig').onclick = () => void read('full-config');
el('refresh').onclick = () => void pages().catch(e => el('status').textContent = e.message);
el('reconnect').onclick = async () => { await send({ type: 'mcpConnect' }); await connection(); };
void pages().catch(e => el('status').textContent = e.message);
void connection(); setInterval(() => void connection(), 3000);
