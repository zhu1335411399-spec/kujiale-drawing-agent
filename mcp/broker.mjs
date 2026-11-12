import { randomUUID } from 'node:crypto';

export class Broker {
  constructor(timeoutMs = 35000) {
    this.clients = new Map();
    this.pending = new Map();
    this.timeoutMs = timeoutMs;
  }

  register(id, instanceId) {
    if (!/^[a-f0-9-]{36}$/.test(id || '') || !/^[a-f0-9-]{36}$/.test(instanceId || '')) throw new Error('Invalid browser identity');
    const old = this.clients.get(id);
    if (old && old.instanceId !== instanceId) {
      for (const task of this.pending.values()) if (task.clientId === id) task.reject(new Error('Browser restarted; read again'));
    }
    if (!old && this.clients.size >= 16) {
      for (const [key, client] of this.clients) if (Date.now() - client.seenAt > 60000) this.clients.delete(key);
      if (this.clients.size >= 16) throw new Error('Too many browser profiles');
    }
    this.clients.set(id, { seenAt: Date.now(), instanceId });
  }

  submit(clientId, operation, args) {
    if (this.pending.size >= 64) return Promise.reject(new Error('Too many pending reads'));
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const finish = (error, value) => {
        clearTimeout(timer);
        this.pending.delete(id);
        error ? reject(error) : resolve(value);
      };
      const timer = setTimeout(() => finish(new Error('Browser read timed out; open extension and reconnect')), this.timeoutMs);
      this.pending.set(id, {
        id, clientId, operation, args, delivered: false,
        resolve: value => finish(null, value), reject: error => finish(error)
      });
    });
  }

  poll(clientId, instanceId) {
    this.register(clientId, instanceId);
    const task = [...this.pending.values()].find(item => item.clientId === clientId && !item.delivered);
    if (!task) return null;
    task.delivered = true;
    return { id: task.id, operation: task.operation, args: task.args };
  }

  complete(clientId, id, value, error) {
    const task = this.pending.get(id);
    if (!task || task.clientId !== clientId || !task.delivered) throw new Error('Unknown or expired read request');
    error ? task.reject(new Error(String(error).slice(0, 300))) : task.resolve(value);
  }

  async context() {
    const live = [...this.clients].filter(([, value]) => Date.now() - value.seenAt < 45000);
    if (!live.length) throw new Error('请在施工图扩展中连接本机 MCP');
    const results = await Promise.all(live.map(async ([id]) => {
      try {
        const pages = await this.submit(id, 'context', {});
        if (!Array.isArray(pages)) throw new Error('Invalid page response');
        return { clientId: id, pages: pages.map(page => ({ ...page, pageId: id + ':' + page.tabId })) };
      } catch (error) {
        return { clientId: id, pages: [], error: error.message };
      }
    }));
    return {
      readAt: new Date().toISOString(),
      browsers: results,
      limitations: ['每个浏览器用户配置独立列出，多个同类页面时需明确 pageId。', '显示名称和网页可访问不能证明双账号或客户配置归属。']
    };
  }

  async page(pageId, operation, args) {
    const match = /^([a-f0-9-]{36}):(\d+)$/.exec(pageId);
    if (!match) throw new Error('Invalid pageId; get context first');
    const client = this.clients.get(match[1]);
    if (!client || Date.now() - client.seenAt >= 45000) throw new Error('浏览器连接已过期，请重新连接');
    return this.submit(match[1], operation, { ...args, tabId: Number(match[2]) });
  }

  close() {
    for (const task of [...this.pending.values()]) task.reject(new Error('MCP service stopped'));
  }
}

