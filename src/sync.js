import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_STATE, mergeState } from './data.js';

// Cloud save with an on-device cache.
// - The passcode is typed once per browser and remembered.
// - Every change is written to this browser immediately, then pushed to the
//   database a moment later. If the network drops, it retries.
// - When the app comes back into view it pulls any newer save from another device.

const LS_PASS = 'ss_passcode';
const LS_CACHE = 'ss_cache';
const API = '/api/state';

const readCache = () => { try { return JSON.parse(localStorage.getItem(LS_CACHE)) || null; } catch { return null; } };
const writeCache = (c) => { try { localStorage.setItem(LS_CACHE, JSON.stringify(c)); } catch {} };
const getPass = () => { try { return localStorage.getItem(LS_PASS) || ''; } catch { return ''; } };
const setPass = (p) => { try { p ? localStorage.setItem(LS_PASS, p) : localStorage.removeItem(LS_PASS); } catch {} };

async function call(method, pass, body) {
  const res = await fetch(API, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-passcode': pass },
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const json = isJson ? await res.json().catch(() => null) : null;
  return { status: res.status, isJson, json };
}

export function useGameState() {
  const [state, setStateRaw] = useState(null);
  const [phase, setPhase] = useState('loading');   // loading | locked | ready | error
  const [mode, setMode] = useState('cloud');        // cloud | local
  const [sync, setSync] = useState('saved');        // saved | saving | offline | error
  const [lockError, setLockError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [setupMissing, setSetupMissing] = useState(null);

  const stateRef = useRef(null);
  const versionRef = useRef(0);
  const dirtyRef = useRef(false);
  const inflightRef = useRef(false);
  const timerRef = useRef(null);
  const modeRef = useRef('cloud');
  const passRef = useRef(getPass());

  const persistCache = useCallback(() => {
    if (stateRef.current) writeCache({ state: stateRef.current, version: versionRef.current, dirty: dirtyRef.current });
  }, []);

  const adopt = useCallback((data, version, dirty = false) => {
    const merged = mergeState(data);
    stateRef.current = merged;
    versionRef.current = version;
    dirtyRef.current = dirty;
    setStateRaw(merged);
    persistCache();
  }, [persistCache]);

  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    if (modeRef.current !== 'cloud' || inflightRef.current || !dirtyRef.current) return;
    inflightRef.current = true;
    dirtyRef.current = false;
    setSync('saving');
    try {
      const r = await call('PUT', passRef.current, { data: stateRef.current, version: versionRef.current });
      if (r.status === 200 && r.json) {
        versionRef.current = r.json.version;
        setSync(dirtyRef.current ? 'saving' : 'saved');
      } else if (r.status === 409 && r.json) {
        adopt(r.json.data, r.json.version);
        setNotice('Pulled newer progress from another device. If your last tap is missing, tap it again.');
        setSync('saved');
      } else if (r.status === 401) {
        dirtyRef.current = true;
        setPass(''); passRef.current = '';
        setPhase('locked');
      } else {
        dirtyRef.current = true;
        setSync('error');
      }
    } catch {
      dirtyRef.current = true;
      setSync('offline');
    } finally {
      inflightRef.current = false;
      persistCache();
      if (dirtyRef.current) timerRef.current = setTimeout(flush, 5000);
    }
  }, [adopt, persistCache]);

  // Drop-in replacement for React's setState used everywhere in the app.
  const setState = useCallback((updater) => {
    const prev = stateRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (next === prev) return;
    stateRef.current = next;
    dirtyRef.current = true;
    setStateRaw(next);
    persistCache();
    if (modeRef.current === 'cloud') {
      setSync('saving');
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 700);
    }
  }, [flush, persistCache]);

  const goLocal = useCallback((missing = null) => {
    modeRef.current = 'local';
    setMode('local');
    setSetupMissing(missing);
    const cache = readCache();
    adopt(cache ? cache.state : DEFAULT_STATE, cache ? cache.version : 0, cache ? cache.dirty : false);
    setPhase('ready');
  }, [adopt]);

  const load = useCallback(async (pass) => {
    passRef.current = pass;
    const cache = readCache();
    let r;
    try { r = await call('GET', pass); }
    catch {
      if (cache) { adopt(cache.state, cache.version, cache.dirty); setSync('offline'); setPhase('ready'); }
      else setPhase('error');
      return;
    }
    if (!r.isJson || r.status === 404) return goLocal();                                   // no API (plain `vite` dev)
    if (r.status === 500 && r.json?.error === 'not_configured') return goLocal(r.json.missing);
    if (r.status === 401) {
      setPass(''); passRef.current = '';
      setLockError(pass ? 'That passcode didn\'t work. Try again.' : null);
      setPhase('locked');
      return;
    }
    if (r.status !== 200 || !r.json) {
      if (cache) { adopt(cache.state, cache.version, cache.dirty); setSync('error'); setPhase('ready'); }
      else setPhase('error');
      return;
    }

    setPass(pass);
    modeRef.current = 'cloud';
    setMode('cloud');
    setLockError(null);
    const { data, version } = r.json;
    if (!data) {
      // Empty database: seed it with this browser's copy if there is one.
      adopt(cache ? cache.state : DEFAULT_STATE, 0, true);
    } else if (cache && cache.dirty && cache.version === version) {
      // Offline edits made on top of the latest server copy — keep and push them.
      adopt(cache.state, version, true);
    } else {
      adopt(data, version);
    }
    setPhase('ready');
    setSync('saved');
    if (dirtyRef.current) flush();
  }, [adopt, flush, goLocal]);

  // First load
  useEffect(() => { load(passRef.current); }, [load]);

  // Pull newer progress when the app comes back into view; push when back online.
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || modeRef.current !== 'cloud' || !passRef.current) return;
      if (dirtyRef.current || inflightRef.current) { flush(); return; }
      try {
        const r = await call('GET', passRef.current);
        if (r.status === 200 && r.json && r.json.data && r.json.version > versionRef.current && !dirtyRef.current && !inflightRef.current) {
          adopt(r.json.data, r.json.version);
        }
        if (r.status === 200) setSync(s => (s === 'offline' || s === 'error' ? 'saved' : s));
      } catch { setSync('offline'); }
    };
    const onOnline = () => flush();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', onOnline);
    const flushOnHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', flushOnHide);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', flushOnHide);
    };
  }, [adopt, flush]);

  const unlock = (pass) => { setPhase('loading'); load(pass.trim()); };
  const forgetDevice = () => {
    setPass(''); passRef.current = '';
    try { localStorage.removeItem(LS_CACHE); } catch {}
    window.location.reload();
  };

  return { state, setState, phase, mode, sync, unlock, lockError, notice, clearNotice: () => setNotice(null), setupMissing, forgetDevice, saveNow: flush };
}
