import net from 'node:net';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const maxBytes = 262144;
const user = createHash('sha256').update(os.homedir()).digest('hex').slice(0, 20);
export const endpoint = process.platform === 'win32' ? '\\\\.\\pipe\\kujiale-drawing-v60-' + user : os.tmpdir() + '/drawing-v60-' + user + '.sock';

export function readLines(stream, consume) {
  let buffer = Buffer.alloc(0);
  stream.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    let index;
    while ((index = buffer.indexOf(10)) >= 0) {
      const line = buffer.subarray(0, index);
      buffer = buffer.subarray(index + 1);
      if (line.length > maxBytes) return stream.destroy(new Error('Message too large'));
      try { consume(JSON.parse(line.toString('utf8'))); }
      catch { stream.destroy(new Error('Invalid JSON message')); return; }
    }
    if (buffer.length > maxBytes) stream.destroy(new Error('Message too large'));
  });
}

export class IpcClient {
  constructor(socket) {
    this.socket = socket;
    this.pending = new Map();
    this.nextId = 0;
    readLines(socket, message => {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      message.error ? pending.reject(new Error(message.error)) : pending.resolve(message.value);
    });
    const rejectAll = () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Local bridge disconnected'));
      }
      this.pending.clear();
    };
    socket.on('error', rejectAll);
    socket.on('close', rejectAll);
  }
  call(route, input = {}) {
    if (this.socket.destroyed) return Promise.reject(new Error('Local bridge disconnected'));
    const id = ++this.nextId;
    const message = JSON.stringify({ id, route, input }) + '\n';
    if (Buffer.byteLength(message) > maxBytes) return Promise.reject(new Error('Message too large'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Local read timed out')); }, 42000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.write(message);
    });
  }
  close() { this.socket.destroy(); }
}

export function connect(address = endpoint) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(address);
    const timer = setTimeout(() => socket.destroy(new Error('Local connection timed out')), 1500);
    socket.once('error', error => { clearTimeout(timer); reject(error); });
    socket.once('connect', () => { clearTimeout(timer); resolve(new IpcClient(socket)); });
  });
}

export async function ensureDaemon() {
  try { return await connect(); } catch {}
  const daemon = spawn(process.execPath, [fileURLToPath(new URL('./native-server.mjs', import.meta.url)), '--daemon'], {
    detached: true, stdio: 'ignore', windowsHide: true
  });
  let launchError;
  daemon.on('error', error => { launchError = error; });
  daemon.unref();
  for (let attempt = 0; attempt < 30; attempt++) {
    if (launchError) throw launchError;
    await new Promise(resolve => setTimeout(resolve, 100));
    try { return await connect(); } catch {}
  }
  throw new Error('Cannot start local drawing bridge; run the installer again');
}

