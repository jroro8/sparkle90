// =====================================================
// DATA + MATH for the Q4 habit tracker
// =====================================================
export const START = '2026-10-01';
export const END = '2026-12-31';

const H = (id, name, emoji, color) => ({ id, name, emoji, color, start: START, end: null });

export const COLORS = ['#FF3EA5', '#FF7A1A', '#FFD000', '#34E07A', '#19C8FF', '#7B61FF', '#C04BFF'];

export const DEFAULT_STATE = {
  app: 'sparkle-sprint',
  settings: { name: '', start: START, end: END, waterGoal: 128, bottles: [8, 12, 16, 20, 32] },
  habits: [
    H('h_free',    'Freewriting',                  '✍️', '#FF3EA5'),
    H('h_bridget', 'Bridget – 1 Hour/Contests',    '🏆', '#FF7A1A'),
    H('h_wine',    'Pop Wine Shop post',           '🍷', '#C04BFF'),
    H('h_coconut', 'Coconut Pull',                 '🥥', '#34E07A'),
    H('h_steps',   '10,000 Steps / WeWard Log',    '👟', '#19C8FF'),
    H('h_strength','Strength Training',            '💪', '#FF3EA5'),
    H('h_cardio',  'Cardio',                       '🏃‍♀️', '#FF7A1A'),
    H('h_dog',     'Dog Training',                 '🐶', '#FFD000'),
    H('h_manifest','Manifest Journal',             '✨', '#7B61FF'),
    H('h_water',   '1 Gallon Water',               '💧', '#19C8FF'),
    H('h_read',    'Read: 20 minutes',             '📚', '#34E07A'),
    H('h_spanish', 'Spanish – 15 minutes',         '🇪🇸', '#FF7A1A'),
    H('h_meds',    'Meds/Vitamins',                '💊', '#C04BFF'),
  ],
  days: {}, // 'YYYY-MM-DD': { done: [habitId, ...], water: [{ oz, t: 'HH:MM' }, ...] }
};

// The habit that the water tab checks off automatically at the goal.
export const WATER_HABIT = 'h_water';
export const waterOz = (st, day) => ((st.days[day] || {}).water || []).reduce((sum, w) => sum + w.oz, 0);

export const mergeState = (p = {}) => ({
  ...DEFAULT_STATE, ...p,
  app: 'sparkle-sprint',
  settings: { ...DEFAULT_STATE.settings, ...(p.settings || {}) },
  habits: Array.isArray(p.habits) ? p.habits : DEFAULT_STATE.habits,
  days: { ...(p.days || {}) },
});

// ---------- dates (always local time) ----------
export const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayStr = () => fmt(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
export const daysBetween = (a, b) => { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; };
export const clampDay = (s, st) => (s < st.settings.start ? st.settings.start : s > st.settings.end ? st.settings.end : s);
export const nice = (s, opts = { weekday: 'long', month: 'long', day: 'numeric' }) => parse(s).toLocaleDateString(undefined, opts);

// ---------- percentages ----------
export const activeOn = (h, day) => h.start <= day && (!h.end || day <= h.end);
export const activeHabits = (st, day) => st.habits.filter(h => activeOn(h, day));

export function dayStats(st, day) {
  const active = activeHabits(st, day);
  const doneSet = new Set((st.days[day] || {}).done || []);
  const done = active.filter(h => doneSet.has(h.id)).length;
  return { done, total: active.length, pct: active.length ? done / active.length : 0 };
}

// Days counted so far: start → today (or the end date, if past it).
export const countedDays = (st, today = todayStr()) => {
  const last = today > st.settings.end ? st.settings.end : today;
  return last < st.settings.start ? [] : daysBetween(st.settings.start, last);
};

export function overallStats(st, today = todayStr()) {
  let done = 0, total = 0, perfect = 0;
  const days = countedDays(st, today);
  for (const d of days) {
    const s = dayStats(st, d);
    done += s.done; total += s.total;
    if (s.total && s.done === s.total) perfect++;
  }
  const all = daysBetween(st.settings.start, st.settings.end).length;
  return { done, total, pct: total ? done / total : 0, perfect, dayNum: days.length, allDays: all };
}

export function habitStats(st, h, today = todayStr()) {
  const days = countedDays(st, today).filter(d => activeOn(h, d));
  const has = (d) => ((st.days[d] || {}).done || []).includes(h.id);
  const done = days.filter(has).length;
  let best = 0, run = 0;
  for (const d of days) { run = has(d) ? run + 1 : 0; best = Math.max(best, run); }
  // Current streak: today counts if done; an unchecked today doesn't break it yet.
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (has(days[i])) streak++;
    else if (days[i] === today && i === days.length - 1) continue;
    else break;
  }
  return { done, total: days.length, pct: days.length ? done / days.length : 0, streak, best };
}

export const pctText = (p) => `${Math.round(p * 100)}%`;
