const status = document.getElementById('mcpStatus');
async function check(type = 'mcpStatus') {
  try {
    const result = await chrome.runtime.sendMessage({ type });
    if (result?.error) throw new Error(result.error);
    const fresh = result?.connected && Date.now() - result.checkedAt < 45000;
    status.className = fresh ? 'ok' : 'pending';
    status.textContent = fresh ? '本机桥接已连接 · 等待 Agent 调用只读工具' :
      result?.enabled === false ? '自动连接已暂停' : '正在自动连接；若持续失败，请运行安装程序';
    document.getElementById('mcpDetail').textContent = fresh ?
      '页面访问、桥接连接和 Agent 实际读取分别验证。' : result?.error || '无需配对码，无需手动启动服务。';
  } catch (error) { status.className = 'pending'; status.textContent = error.message; }
}
document.getElementById('connect').addEventListener('click', () => void check('mcpConnect'));
document.getElementById('disconnect').addEventListener('click', () => void check('mcpDisconnect'));
void check();
setInterval(() => void check(), 2000);

