# Network capture, build network-capture-2

Chrome debugger Network events replace the page-memory fetch/XHR hook.
The MCP start/read/stop/clear contract is unchanged. Start attaches only to the
selected configuration tab. Repeated start while active does not attach twice.
Read and stop retrieve archived evidence after navigation or tab closure.

Records are stored in chrome.storage.session, retaining evidence through page
reloads and service-worker restarts. Full browser restart, extension disable,
update or reload clears records. Start after stop retains records until clear.
Each session expires after ten minutes via an alarm and per-operation checks.
No requests are replayed; no website configuration is modified.

Only same-origin /construction-cms/api/ and /dcs-drawing/site/api/ paths are stored.
Cookies, authentication/request headers and raw encoded bodies are not stored.
Known secret key names are redacted; arbitrary business data may still be sensitive.
JSON bodies have a 16,000-character limit plus depth/key/array limits.
Encoded, binary, oversized and unavailable bodies are explicitly marked.
Buffers retain at most 20 records and 80,000 UTF-8 bytes per tab, reporting drops.
Request evidence is persisted before the response. Unfinished evidence is marked
incomplete on stop/detach. DevTools can detach capture; stopReason reports this.

Deployment needs one extension reload for the debugger permission. Close DevTools
before capture. Live acceptance can use normal read/navigation traffic followed by
a refresh and readback; it does not need a save. Only refresh after confirming
there are no unsaved edits. Mock tests are not live-browser acceptance.
