import { bridgeStatus, connectBridge, disconnectBridge, pollBridge } from './native-bridge.js';
import { collectPages, browserProfileScope } from './page-check.js';

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.url !== chrome.runtime.getURL('popup.html')) return;
  const actions = { mcpStatus: () => bridgeStatus(), mcpConnect: () => connectBridge(), mcpDisconnect: () => disconnectBridge() };
  if (actions[message.type]) {
    actions[message.type]().then(reply, error => reply({ error: error.message }));
    return true;
  }
  if (message.type !== 'check') return;
  collectPages().then(result => reply({ ...result, ...browserProfileScope(), detectorProtocol: 2 }), error => reply({ error: error.message }));
  return true;
});

void pollBridge();
