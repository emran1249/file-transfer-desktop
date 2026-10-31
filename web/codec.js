// Connection-code format shared with the Android and desktop apps (ShareCodes.kt).
'use strict';
const PREFIX = 'FT1.';
const STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes) {
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}
async function decodeCode(text) {
  const m = (text || '').match(/FT1\.[A-Za-z0-9_\-\s]+/);
  if (!m) return null;
  const lines = m[0].split(/[\r\n]+/).map(l => l.replace(/\s/g, '')).filter(Boolean);
  for (let n = lines.length; n >= 1; n--) {
    try {
      const raw = lines.slice(0, n).join('').slice(PREFIX.length);
      const json = new TextDecoder().decode(await pipe(b64urlToBytes(raw), new DecompressionStream('deflate')));
      return JSON.parse(json);
    } catch (e) { /* try shorter */ }
  }
  return null;
}
async function encodeCode(obj) {
  const z = await pipe(new TextEncoder().encode(JSON.stringify(obj)), new CompressionStream('deflate'));
  return PREFIX + bytesToB64url(z);
}
async function authCode(sdpA, sdpB) {
  const fp = s => ((s.split(/\r?\n/).find(l => l.startsWith('a=fingerprint:')) || '').trim());
  const joined = [fp(sdpA), fp(sdpB)].sort().join('|');
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(joined)));
  return String(((h[0] << 16) | (h[1] << 8) | h[2]) % 10000).padStart(4, '0');
}
function browserName() {
  const ua = navigator.userAgent;
  const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${b} on ${os}` : b;
}

