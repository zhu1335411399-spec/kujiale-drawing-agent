import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { ensureDaemon, maxBytes } from './ipc.mjs';

export function extensionId(key) {
  return [...createHash('sha256').update(Buffer.from(key, 'base64')).digest().subarray(0, 16)]
    .map(byte => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join('');
}

export function readFrames(stream, consume, fail) {
  let buffer = Buffer.alloc(0);
  stream.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE(0);
      if (length > maxBytes) { fail(new Error('Native message too large')); return; }
      if (buffer.length < length + 4) return;
      const payload = buffer.subarray(4, 4 + length);
      buffer = buffer.subarray(4 + length);
      try { consume(JSON.parse(payload.toString('utf8'))); }
      catch { fail(new Error('Invalid native message')); return; }
    }
  });
}

export function writeFrame(stream, value) {
  const body = Buffer.from(JSON.stringify(value));
  if (body.length > maxBytes) throw new Error('Native response too large');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  stream.write(Buffer.concat([header, body]));
}

export async function runNativeHost() {
  const manifest = JSON.parse(fs.readFileSync(new URL('../browser-extension/manifest.json', import.meta.url), 'utf8'));
  const expected = 'chrome-extension://' + extensionId(manifest.key) + '/';
  if (process.argv[2] !== expected) throw new Error('Unregistered extension origin');
  const client = await ensureDaemon();
  process.stdin.on('end', () => client.close());
  process.stdin.on('error', () => client.close());
  const fail = error => { process.stderr.write(error.message + '\n'); client.close(); process.exit(1); };
  readFrames(process.stdin, message => {
    if (!Number.isInteger(message.id) || !['/hello', '/poll', '/result'].includes(message.route)) {
      writeFrame(process.stdout, { id: message.id, error: 'Unsupported browser read operation' });
      return;
    }
    client.call(message.route, message.input).then(
      value => writeFrame(process.stdout, { id: message.id, value }),
      error => writeFrame(process.stdout, { id: message.id, error: error.message })
    ).catch(fail);
  }, fail);
}

if (process.argv[1]?.endsWith('native-host.mjs')) {
  runNativeHost().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}

