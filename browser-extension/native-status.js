const status = document.getElementById('mcpStatus');
let sequence = 0;
async function check(type = 'mcpStatus') {
  const request = ++sequence;
  try {
    const result = await chrome.runtime.sendMessage({ type });
    if (request !== sequence) return;
    if (result?.error) throw new Error(result.error);
    const fresh = result?.connected && Date.now() - result.checkedAt < 45000;
    status.className = fresh ? 'ok' : 'pending';
    status.textContent = fresh ? '本机桥接程序在线' :
      result?.enabled === false ? '自动连接已暂停' : '本机服务尚未连接；持续失败时请运行 Start.cmd';
    document.getElementById('mcpDetail').textContent = fresh ?
      '这只表示本机程序在线；即使前端网页已关闭，也可能保持在线。页面状态请看上方，Agent 实际读取另行核验。' :
      result?.error || '无需配对码。';
  } catch (error) {
    if (request !== sequence) return;
    status.className = 'pending';
    status.textContent = error.message;
  }
}
document.getElementById('connect').addEventListener('click', () => void check('mcpConnect'));
document.getElementById('disconnect').addEventListener('click', () => void check('mcpDisconnect'));
void check();
setInterval(() => void check(), 2000);
