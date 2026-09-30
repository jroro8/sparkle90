import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_STATE, COLORS, mergeState, todayStr, addDays, daysBetween, clampDay, nice, parse, fmt,
  activeHabits, dayStats, overallStats, habitStats, pctText,
} from './data.js';
import { useGameState } from './sync.js';

// =====================================================
// SHELL
// =====================================================
export default function App() {
  const t = useGameState();
  if (t.phase === 'loading') return <Splash text="Sprinkling glitter…" />;
  if (t.phase === 'error') return <Splash text="Can't connect right now" sub="Check your internet and refresh the page." />;
  if (t.phase === 'locked') return <Lock onUnlock={t.unlock} error={t.lockError} />;
  return <Tracker {...t} />;
}

function Sparkles({ count = 22 }) {
  const s = useRef(Array.from({ length: count }, () => ({ x: Math.random() * 100, y: Math.random() * 100, z: 8 + Math.random() * 14, d: Math.random() * 3, c: ['#FFF', '#FFE14D', '#FFB3E0', '#B8F3FF'][Math.floor(Math.random() * 4)] })));
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {s.current.map((p, i) => (
        <svg key={i} width={p.z} height={p.z} viewBox="0 0 20 20" style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, animation: `twinkle 3s ${p.d}s infinite` }}>
          <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" fill={p.c} />
        </svg>
      ))}
    </div>
  );
}

// Original mascot: a little star who gets happier as the day fills up.
function Starry({ pct = 0, size = 64 }) {
  const perfect = pct >= 1;
  const happy = pct >= 0.5;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="bob" aria-hidden="true" style={{ filter: 'drop-shadow(0 4px 0 rgba(59,10,87,0.25))', flexShrink: 0 }}>
      <path d="M50 6 L61 35 L93 37 L68 57 L76 89 L50 71 L24 89 L32 57 L7 37 L39 35 Z" fill="#FFE14D" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="37" cy="58" r="5" fill="#FF8FCF" opacity="0.8" />
      <circle cx="63" cy="58" r="5" fill="#FF8FCF" opacity="0.8" />
      {perfect ? (
        <>
          <path d="M42 44 l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5z" fill="#FF3EA5" />
          <path d="M58 44 l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5z" fill="#FF3EA5" />
        </>
      ) : (
        <>
          <ellipse cx="42" cy="50" rx="3.5" ry={happy ? 4.5 : 3.5} fill="#3B0A57" />
          <ellipse cx="58" cy="50" rx="3.5" ry={happy ? 4.5 : 3.5} fill="#3B0A57" />
          <circle cx="43" cy="48.5" r="1.2" fill="#fff" /><circle cx="59" cy="48.5" r="1.2" fill="#fff" />
        </>
      )}
      {happy
        ? <path d="M42 60 Q50 70 58 60 Z" fill="#3B0A57" />
        : <path d="M44 62 Q50 66 56 62" fill="none" stroke="#3B0A57" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}

function Splash({ text, sub }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center', color: '#fff' }}>
      <Sparkles />
      <Starry pct={0.6} size={80} />
      <div className="display" style={{ fontSize: 28, textShadow: '0 3px 0 rgba(59,10,87,0.35)' }}>{text}</div>
      {sub && <div style={{ fontSize: 16 }}>{sub}</div>}
    </div>
  );
}

function Lock({ onUnlock, error }) {
  const [p, setP] = useState('');
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Sparkles />
      <form className="card pop" onSubmit={e => { e.preventDefault(); if (p.trim()) onUnlock(p); }} style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360, padding: 24, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Starry pct={0.6} size={76} /></div>
        <h1 className="display rainbow-text" style={{ fontSize: 40, margin: '6px 0 0' }}>Sparkle Sprint</h1>
        <div style={{ color: 'var(--muted)', marginBottom: 14 }}>Enter your passcode to open your tracker.</div>
        <input autoFocus type="password" aria-label="Passcode" value={p} onChange={e => setP(e.target.value)} placeholder="Passcode" style={{ ...inputS, textAlign: 'center', fontSize: 18 }} />
        {error && <div style={{ color: 'var(--pink)', marginTop: 8, fontWeight: 700 }}>{error}</div>}
        <button type="submit" className="display" style={{ ...bigBtn, marginTop: 12, width: '100%' }}>Let's go ✨</button>
      </form>
    </div>
  );
}

const inputS = { width: '100%', padding: '10px 12px', borderRadius: 14, border: '2.5px solid #E5C8FF', background: '#fff', fontSize: 16, color: 'var(--ink)' };
const bigBtn = { padding: '12px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 20, background: 'linear-gradient(90deg, #FF3EA5, #C04BFF, #19C8FF)', boxShadow: '0 5px 0 rgba(59,10,87,0.3)' };
const pillBtn = (bg = '#F3E6FF', fg = 'var(--ink)') => ({ padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: bg, color: fg, fontWeight: 800, fontSize: 14 });

// =====================================================
// TRACKER
// =====================================================
function Tracker({ state, setState, mode, sync, notice, clearNotice, setupMissing, forgetDevice, saveNow }) {
  const today = todayStr();
  const [tab, setTab] = useState('today');
  const [day, setDay] = useState(clampDay(today, state));
  const [confetti, setConfetti] = useState(0);
  const [toast, setToast] = useState(null);
  const tt = useRef(null);

  const say = (msg) => { clearTimeout(tt.current); setToast({ msg, id: Date.now() }); tt.current = setTimeout(() => setToast(null), 2200); };
  useEffect(() => { if (notice) { say('🔄 Synced from your other device'); clearNotice(); } }, [notice]); // eslint-disable-line

  const toggle = (habitId) => {
    if (day > today) return;
    const before = dayStats(state, day);
    const done = new Set((state.days[day] || {}).done || []);
    done.has(habitId) ? done.delete(habitId) : done.add(habitId);
    setState(s => ({ ...s, days: { ...s.days, [day]: { ...(s.days[day] || {}), done: [...done] } } }));
    const after = before.done + (done.has(habitId) ? 1 : -1);
    if (after === before.total && before.total > 0) { setConfetti(c => c + 1); say('🌈 PERFECT DAY! 🌈'); }
  };

  const openDay = (d) => { setDay(d); setTab('today'); };
  const o = overallStats(state, today);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100, position: 'relative' }}>
      <Sparkles />
      <Header state={state} o={o} mode={mode} sync={sync} />
      {mode === 'local' && (
        <div className="card" style={{ maxWidth: 640, margin: '0 auto 12px', width: 'calc(100% - 28px)', padding: 10, fontSize: 14, position: 'relative', zIndex: 1 }}>
          ☁️ {setupMissing ? `Cloud save isn't set up yet (missing ${setupMissing.join(' and ')} in Vercel).` : 'Running without the cloud API.'} Progress is saved in this browser only for now.
        </div>
      )}
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '0 14px', position: 'relative', zIndex: 1 }}>
        {tab === 'today' && <TodayTab state={state} day={day} setDay={setDay} today={today} toggle={toggle} o={o} />}
        {tab === 'calendar' && <CalendarTab state={state} today={today} openDay={openDay} />}
        {tab === 'stats' && <StatsTab state={state} today={today} o={o} />}
        {tab === 'settings' && <SettingsTab state={state} setState={setState} mode={mode} sync={sync} forgetDevice={forgetDevice} saveNow={saveNow} say={say} today={today} />}
      </main>
      <BottomNav tab={tab} setTab={(t) => { setTab(t); if (t === 'today') setDay(clampDay(today, state)); }} />
      {confetti > 0 && <Confetti key={confetti} />}
      {toast && (
        <div role="status" style={{ position: 'fixed', left: 0, right: 0, bottom: 96, display: 'flex', justifyContent: 'center', zIndex: 60, pointerEvents: 'none' }}>
          <div key={toast.id} className="pop display card" style={{ padding: '10px 20px', fontSize: 20 }}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}

function Header({ state, o, mode, sync }) {
  const qPct = o.dayNum / o.allDays;
  const syncLabel = mode === 'local' ? 'Saved on this device only' : { saved: 'Saved ✓', saving: 'Saving…', offline: 'Offline — will retry', error: 'Retrying save…' }[sync];
  return (
    <header style={{ maxWidth: 640, margin: '0 auto', padding: '18px 14px 12px', position: 'relative', zIndex: 1, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 34, lineHeight: 1, textShadow: '0 3px 0 rgba(59,10,87,0.35)' }}>Sparkle Sprint</h1>
        <span style={{ fontSize: 12, fontWeight: 800, background: 'rgba(255,255,255,0.22)', padding: '3px 10px', borderRadius: 999 }}>{syncLabel}</span>
      </div>
      <div style={{ fontWeight: 700, marginTop: 4, fontSize: 15 }}>
        {state.settings.name ? `Go get it, ${state.settings.name}! · ` : ''}
        {o.dayNum === 0 ? `Starts ${nice(state.settings.start, { month: 'long', day: 'numeric' })}` : `Day ${o.dayNum} of ${o.allDays}`}
      </div>
      <div style={{ height: 10, background: 'rgba(255,255,255,0.3)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }} aria-label={`${pctText(qPct)} of the sprint done`}>
        <div style={{ height: '100%', width: `${qPct * 100}%`, background: 'var(--rainbow)', borderRadius: 99, transition: 'width .6s' }} />
      </div>
    </header>
  );
}

function BottomNav({ tab, setTab }) {
  const tabs = [['today', '✅', 'Today'], ['calendar', '📅', 'Calendar'], ['stats', '📊', 'Stats'], ['settings', '⚙️', 'Settings']];
  return (
    <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, padding: '8px 10px calc(8px + env(safe-area-inset-bottom))', background: 'rgba(255,255,255,0.95)', boxShadow: '0 -4px 20px rgba(59,10,87,0.2)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {tabs.map(([id, icon, label]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} aria-current={on ? 'page' : undefined} style={{ border: 'none', cursor: 'pointer', borderRadius: 16, padding: '6px 2px', background: on ? 'linear-gradient(135deg, #FF3EA5, #C04BFF)' : 'transparent', color: on ? '#fff' : 'var(--ink)', fontWeight: 800, fontSize: 13 }}>
              <div style={{ fontSize: 20 }} aria-hidden="true">{icon}</div>{label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Ring({ pct, size = 120, stroke = 14, label, sub, id }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} role="img" aria-label={`${label}: ${pctText(pct)}`}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF3EA5" /><stop offset="0.35" stopColor="#FFD000" /><stop offset="0.7" stopColor="#34E07A" /><stop offset="1" stopColor="#19C8FF" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1E3FF" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct))} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="display" style={{ fontSize: size * 0.26, lineHeight: 1 }}>{pctText(pct)}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', lineHeight: 1.1 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}

// =====================================================
// TODAY
// =====================================================
function TodayTab({ state, day, setDay, today, toggle, o }) {
  const ds = dayStats(state, day);
  const habits = activeHabits(state, day);
  const doneSet = new Set((state.days[day] || {}).done || []);
  const { start, end } = state.settings;
  const future = day > today;
  const isToday = day === today;
  return (
    <div className="rise">
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button aria-label="Previous day" disabled={day <= start} onClick={() => setDay(addDays(day, -1))} style={{ ...pillBtn(), opacity: day <= start ? 0.35 : 1, fontSize: 18, padding: '4px 14px' }}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div className="display" style={{ fontSize: 22 }}>{isToday ? 'Today' : nice(day, { weekday: 'long' })}</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 700 }}>{nice(day, { month: 'long', day: 'numeric' })}</div>
          </div>
          <button aria-label="Next day" disabled={day >= end || day >= today} onClick={() => setDay(addDays(day, 1))} style={{ ...pillBtn(), opacity: day >= end || day >= today ? 0.35 : 1, fontSize: 18, padding: '4px 14px' }}>›</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 8, flexWrap: 'wrap' }}>
          <Ring id="rd" pct={ds.pct} label="this day" sub={`${ds.done} of ${ds.total}`} size={128} />
          <Starry pct={ds.pct} size={70} />
          <Ring id="ro" pct={o.pct} label="overall" sub={o.dayNum ? `${o.dayNum} day${o.dayNum === 1 ? '' : 's'}` : 'not started'} size={104} stroke={12} />
        </div>
      </div>

      {future && (
        <div className="card" style={{ padding: 12, marginBottom: 12, textAlign: 'center', fontWeight: 700 }}>
          🌟 Your sprint starts {nice(start, { weekday: 'long', month: 'long', day: 'numeric' })}! Here's a sneak peek — check-ins open that morning.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {habits.map(h => {
          const on = doneSet.has(h.id);
          return (
            <button key={h.id} onClick={() => toggle(h.id)} disabled={future} aria-pressed={on} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 20, cursor: future ? 'default' : 'pointer', textAlign: 'left',
              border: `3px solid ${on ? '#fff' : 'transparent'}`,
              background: on ? `linear-gradient(120deg, ${h.color}, ${h.color}CC 60%, #ffffffaa)` : 'var(--card)',
              color: on ? '#fff' : 'var(--ink)', boxShadow: on ? `0 5px 0 ${h.color}88, 0 0 18px ${h.color}66` : '0 5px 0 rgba(59,10,87,0.15)',
              transition: 'all .2s', opacity: future ? 0.75 : 1,
            }}>
              <span style={{ width: 34, height: 34, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? '#fff' : `${h.color}22`, border: `2.5px solid ${h.color}`, fontSize: 18, color: h.color, fontWeight: 900 }}>
                {on ? '✓' : ''}
              </span>
              <span style={{ fontSize: 24 }} aria-hidden="true">{h.emoji}</span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 17, textShadow: on ? '0 1px 2px rgba(59,10,87,0.35)' : 'none' }}>{h.name}</span>
              {on && <span aria-hidden="true" style={{ fontSize: 18 }}>✨</span>}
            </button>
          );
        })}
      </div>
      {!future && !isToday && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button onClick={() => setDay(today > end ? end : today)} style={pillBtn('#fff')}>Back to today</button>
        </div>
      )}
    </div>
  );
}

// =====================================================
// CALENDAR
// =====================================================
function CalendarTab({ state, today, openDay }) {
  const { start, end } = state.settings;
  const months = [];
  for (let d = parse(start); fmt(d) <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(new Date(d.getFullYear(), d.getMonth(), 1));
  return (
    <div className="rise">
      {months.map(m => {
        const first = new Date(m), days = [];
        const pad = first.getDay();
        const last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        for (let i = 0; i < pad; i++) days.push(null);
        for (let i = 1; i <= last; i++) days.push(fmt(new Date(m.getFullYear(), m.getMonth(), i)));
        return (
          <div key={fmt(m)} className="card" style={{ padding: 14, marginBottom: 14 }}>
            <h2 className="display" style={{ margin: '0 0 8px', fontSize: 26, textAlign: 'center' }}>{m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>{w}</div>)}
              {days.map((d, i) => {
                if (!d) return <div key={i} />;
                const inRange = d >= start && d <= end;
                const past = d <= today;
                const s = dayStats(state, d);
                const perfect = past && s.total && s.done === s.total;
                const bg = !inRange || !past ? '#F6EEFF'
                  : perfect ? 'linear-gradient(135deg, #FF3EA5, #FFD000, #34E07A, #19C8FF)'
                  : s.done === 0 ? '#EFE3FA'
                  : `rgba(192, 75, 255, ${0.2 + s.pct * 0.7})`;
                return (
                  <button key={d} disabled={!inRange || !past} onClick={() => openDay(d)} aria-label={`${nice(d)}: ${past && inRange ? pctText(s.pct) : 'upcoming'}`} style={{
                    aspectRatio: '1', border: d === today ? '3px solid var(--pink)' : 'none', borderRadius: 12, cursor: inRange && past ? 'pointer' : 'default',
                    background: bg, color: perfect || s.pct > 0.55 ? '#fff' : 'var(--ink)', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    opacity: inRange ? 1 : 0.35, fontWeight: 800,
                  }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{parse(d).getDate()}</span>
                    {inRange && past && <span style={{ fontSize: 10, lineHeight: 1.2 }}>{perfect ? '🌈' : pctText(s.pct)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="card" style={{ padding: 10, fontSize: 13, textAlign: 'center', fontWeight: 700 }}>Tap any past day to check off habits you forgot. 🌈 = perfect day</div>
    </div>
  );
}

// =====================================================
// STATS
// =====================================================
function StatsTab({ state, today, o }) {
  const rows = state.habits.filter(h => h.start <= (today > state.settings.end ? state.settings.end : today))
    .map(h => ({ h, s: habitStats(state, h, today) }))
    .sort((a, b) => b.s.pct - a.s.pct);
  const Stat = ({ label, value }) => (
    <div style={{ background: '#F6EEFF', borderRadius: 16, padding: '10px 6px', textAlign: 'center' }}>
      <div className="display" style={{ fontSize: 26, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>{label}</div>
    </div>
  );
  return (
    <div className="rise">
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Ring id="rs" pct={o.pct} label="overall" size={140} stroke={16} />
          <div style={{ flex: 1, minWidth: 190, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Stat label="days in" value={`${o.dayNum}/${o.allDays}`} />
            <Stat label="perfect days" value={`🌈 ${o.perfect}`} />
            <Stat label="check-ins" value={o.done.toLocaleString()} />
            <Stat label="possible" value={o.total.toLocaleString()} />
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginTop: 10, fontWeight: 700 }}>
          Overall = every habit checked ÷ every habit possible, from {nice(state.settings.start, { month: 'short', day: 'numeric' })} through today.
        </div>
      </div>
      <h2 className="display" style={{ color: '#fff', fontSize: 26, margin: '4px 4px 8px', textShadow: '0 3px 0 rgba(59,10,87,0.35)' }}>Habit by habit</h2>
      {o.dayNum === 0 && <div className="card" style={{ padding: 14, textAlign: 'center', fontWeight: 700 }}>Stats start filling in on day 1. 💫</div>}
      {o.dayNum > 0 && rows.map(({ h, s }) => (
        <div key={h.id} className="card" style={{ padding: 12, marginBottom: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }} aria-hidden="true">{h.emoji}</span>
            <span style={{ flex: 1, fontWeight: 800 }}>{h.name}{h.end ? <span style={{ color: 'var(--muted)', fontWeight: 600 }}> (retired)</span> : ''}</span>
            <span className="display" style={{ fontSize: 22, color: h.color }}>{pctText(s.pct)}</span>
          </div>
          <div style={{ height: 10, background: '#F1E3FF', borderRadius: 99, margin: '6px 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${s.pct * 100}%`, background: `linear-gradient(90deg, ${h.color}, ${h.color}AA)`, borderRadius: 99, transition: 'width .6s' }} />
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
            <span>{s.done} of {s.total} days</span><span>🔥 streak {s.streak}</span><span>⭐ best {s.best}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// SETTINGS
// =====================================================
function SettingsTab({ state, setState, mode, sync, forgetDevice, saveNow, say, today }) {
  const [section, setSection] = useState('habits');
  const secs = [['habits', 'Habits'], ['me', 'Me'], ['backup', 'Backup'], ['sync', 'Sync'], ['reset', 'Reset']];
  return (
    <div className="rise">
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
        {secs.map(([id, l]) => <button key={id} onClick={() => setSection(id)} style={pillBtn(section === id ? 'var(--ink)' : '#fff', section === id ? '#fff' : 'var(--ink)')}>{l}</button>)}
      </div>
      {section === 'habits' && <HabitEditor state={state} setState={setState} today={today} say={say} />}
      {section === 'me' && (
        <div className="card" style={{ padding: 16 }}>
          <label style={{ fontWeight: 800 }}>Your name (for the cheer at the top)
            <input value={state.settings.name} maxLength={24} onChange={e => setState(s => ({ ...s, settings: { ...s.settings, name: e.target.value } }))} style={{ ...inputS, marginTop: 6 }} />
          </label>
        </div>
      )}
      {section === 'backup' && <Backup state={state} setState={setState} say={say} />}
      {section === 'sync' && <SyncPanel mode={mode} sync={sync} forgetDevice={forgetDevice} saveNow={saveNow} />}
      {section === 'reset' && <Reset setState={setState} />}
    </div>
  );
}

function HabitEditor({ state, setState, today, say }) {
  const { start, end } = state.settings;
  const current = state.habits.filter(h => !h.end);
  const retired = state.habits.filter(h => h.end);
  const upd = (id, patch) => setState(s => ({ ...s, habits: s.habits.map(h => (h.id === id ? { ...h, ...patch } : h)) }));
  const move = (id, dir) => setState(s => {
    const list = [...s.habits]; const i = list.findIndex(h => h.id === id); const j = i + dir;
    if (j < 0 || j >= list.length) return s;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...s, habits: list };
  });
  const hasHistory = (id) => Object.values(state.days).some(d => (d.done || []).includes(id));
  const remove = (h) => {
    if (!hasHistory(h.id)) { setState(s => ({ ...s, habits: s.habits.filter(x => x.id !== h.id) })); say('Habit removed'); return; }
    // Keep the history but stop counting it from today on.
    const stop = addDays(today < start ? start : today, -1);
    upd(h.id, { end: stop < h.start ? h.start : stop });
    say('Habit retired — past check-ins kept');
  };
  const add = () => {
    const startDay = today < start ? start : today > end ? end : today;
    const h = { id: `h_${Date.now()}`, name: 'New habit', emoji: '🌟', color: COLORS[state.habits.length % COLORS.length], start: startDay, end: null };
    setState(s => ({ ...s, habits: [...s.habits, h] }));
  };
  return (
    <div>
      <div className="card" style={{ padding: 10, marginBottom: 10, fontSize: 13, fontWeight: 700 }}>
        New habits count from the day you add them. Removing a habit keeps its past check-ins, so your earlier percentages don't change.
      </div>
      {current.map((h, i) => (
        <div key={h.id} className="card" style={{ padding: 12, marginBottom: 9 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input aria-label="Emoji" value={h.emoji} onChange={e => upd(h.id, { emoji: e.target.value.slice(0, 4) })} style={{ ...inputS, width: 54, textAlign: 'center', fontSize: 20, padding: 6 }} />
            <input aria-label="Habit name" value={h.name} onChange={e => upd(h.id, { name: e.target.value })} style={{ ...inputS, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => <button key={c} aria-label={`Color ${c}`} onClick={() => upd(h.id, { color: c })} style={{ width: 26, height: 26, borderRadius: 99, background: c, border: h.color === c ? '3px solid var(--ink)' : '3px solid #fff', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />)}
            <span style={{ flex: 1 }} />
            <button aria-label="Move up" onClick={() => move(h.id, -1)} disabled={i === 0} style={pillBtn()}>↑</button>
            <button aria-label="Move down" onClick={() => move(h.id, 1)} disabled={i === current.length - 1} style={pillBtn()}>↓</button>
            <button onClick={() => remove(h)} style={pillBtn('#FFE0EF', '#D1146E')}>Remove</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="display" style={{ ...bigBtn, width: '100%', marginTop: 4 }}>+ Add a habit</button>
      {retired.length > 0 && (
        <div className="card" style={{ padding: 12, marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Retired habits</div>
          {retired.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <span>{h.emoji}</span><span style={{ flex: 1 }}>{h.name}</span>
              <button onClick={() => { upd(h.id, { end: null }); say('Habit is back! 💖'); }} style={pillBtn()}>Bring back</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Backup({ state, setState, say }) {
  const [pending, setPending] = useState(null);
  const [err, setErr] = useState(null);
  const ref = useRef(null);
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `sparkle_sprint_${todayStr()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    say('Backup downloaded 💾');
  };
  const pick = (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setErr(null);
    f.text().then(t => {
      try {
        const d = JSON.parse(t);
        if (!Array.isArray(d.habits) || !d.days) throw new Error();
        setPending(mergeState(d));
      } catch { setErr("That doesn't look like a Sparkle Sprint backup."); }
    });
  };
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>💾 Download a backup</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>Everything saves to the cloud on its own. This is just an extra safety copy.</div>
      <button onClick={download} style={pillBtn('var(--ink)', '#fff')}>Download backup</button>
      <hr style={{ border: 'none', borderTop: '2px dashed #E5C8FF', margin: '16px 0' }} />
      <div style={{ fontWeight: 800, marginBottom: 8 }}>📂 Restore a backup</div>
      <input ref={ref} type="file" accept=".json,application/json" onChange={pick} style={{ display: 'none' }} />
      <button onClick={() => ref.current?.click()} style={pillBtn()}>Choose file…</button>
      {err && <div style={{ color: '#D1146E', fontWeight: 700, marginTop: 8 }}>{err}</div>}
      {pending && (
        <div className="pop" style={{ marginTop: 10, padding: 12, borderRadius: 14, background: '#FFF7D1' }}>
          {pending.habits.length} habits · {Object.keys(pending.days).length} days of check-ins. This replaces what's here now on every device.
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => { setState(pending); setPending(null); say('Restored ✨'); }} style={pillBtn('var(--pink)', '#fff')}>Yes, restore</button>
            <button onClick={() => setPending(null)} style={pillBtn()}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SyncPanel({ mode, sync, forgetDevice, saveNow }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>☁️ Cloud sync</div>
      <div style={{ marginBottom: 8 }}>{mode === 'local' ? 'Not set up yet — saving on this device only.' : { saved: 'Everything is saved.', saving: 'Saving…', offline: 'Offline — will upload when you reconnect.', error: "Couldn't save — retrying." }[sync]}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>Open the same address on your phone or computer and enter your passcode to see the same tracker.</div>
      {mode === 'cloud' && <button onClick={saveNow} style={{ ...pillBtn('var(--ink)', '#fff'), marginRight: 8 }}>Sync now</button>}
      {!confirm ? <button onClick={() => setConfirm(true)} style={pillBtn()}>Sign out this device</button> : (
        <span><button onClick={forgetDevice} style={{ ...pillBtn('var(--pink)', '#fff'), marginRight: 6 }}>Sign out</button><button onClick={() => setConfirm(false)} style={pillBtn()}>Cancel</button></span>
      )}
    </div>
  );
}

function Reset({ setState }) {
  const [c, setC] = useState(false);
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Start over</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 10 }}>Clears every check-in and puts the original 13 habits back. Download a backup first.</div>
      {!c ? <button onClick={() => setC(true)} style={pillBtn('#FFE0EF', '#D1146E')}>Reset everything</button> : (
        <span><button onClick={() => { setState(structuredClone(DEFAULT_STATE)); setC(false); }} style={{ ...pillBtn('#D1146E', '#fff'), marginRight: 6 }}>Yes, reset</button><button onClick={() => setC(false)} style={pillBtn()}>Cancel</button></span>
      )}
    </div>
  );
}

// =====================================================
// CONFETTI
// =====================================================
function Confetti() {
  const bits = useRef(Array.from({ length: 70 }, () => ({
    x: Math.random() * 100, d: Math.random() * 0.8, t: 1.8 + Math.random() * 1.6, s: 8 + Math.random() * 10,
    c: ['#FF3EA5', '#FF7A1A', '#FFD000', '#34E07A', '#19C8FF', '#7B61FF', '#C04BFF', '#fff'][Math.floor(Math.random() * 8)],
    star: Math.random() < 0.4,
  })));
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 70, overflow: 'hidden' }}>
      {bits.current.map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: `${b.x}%`, top: 0, animation: `fall ${b.t}s ${b.d}s ease-in both` }}>
          {b.star
            ? <svg width={b.s * 1.4} height={b.s * 1.4} viewBox="0 0 20 20"><path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" fill={b.c} /></svg>
            : <div style={{ width: b.s, height: b.s * 0.5, background: b.c, borderRadius: 2 }} />}
        </div>
      ))}
    </div>
  );
}
