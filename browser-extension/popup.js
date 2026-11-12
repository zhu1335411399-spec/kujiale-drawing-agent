const refresh = document.getElementById('refresh');
const status = document.getElementById('status');

function render(role, pages) {
  const box = document.getElementById(role);
  box.replaceChildren();
  const matches = pages.filter(page => page.role === role);
  const connected = matches.filter(page => page.connected);
  const label = document.createElement('p');
  label.className = connected.length ? 'ok' : 'pending';
  label.textContent = connected.length ? '已连接 · ' + connected.length + ' 个页面' :
    matches.length ? '连接未成功' : '未找到页面，请先打开';
  box.append(label);
  for (const page of matches) {
    const detail = document.createElement('p');
    detail.className = 'detail';
    detail.textContent = [page.title, page.connected ? page.url : page.detail].filter(Boolean).join(' · ');
    box.append(detail);
  }
  return connected.length > 0;
}

async function check() {
  refresh.disabled = true;
  status.textContent = '正在检测…';
  try {
    const result = await chrome.runtime.sendMessage({ type: 'check' });
    if (result?.error || !Array.isArray(result?.pages)) throw new Error(result?.error || '扩展未响应，请在扩展管理页重新加载');
    const config = render('config', result.pages);
    const design = render('design', result.pages);
    status.textContent = config && design ? '两个页面均可访问' : '请打开缺少的页面，或刷新页面后重试';
  } catch (error) {
    render('config', []);
    render('design', []);
    status.textContent = error.message;
  } finally {
    refresh.disabled = false;
  }
}

refresh.addEventListener('click', check);
void check();


