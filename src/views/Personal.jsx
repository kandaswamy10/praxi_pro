// src/views/Personal.jsx
// Personal tab — Habits (list + weekly summary), Reminders (calendar), Journal

import { useState, useEffect } from 'react';
import { Text, SectionLabel, Surface, Btn, Input, Textarea } from '../components/ui';

// ── UTILS ─────────────────────────────────────────────────────────────────────

const uid       = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
const toDateKey = (d) => d.toISOString().slice(0, 10);
const TODAY     = () => toDateKey(new Date());
const isoToDate = (s) => new Date(s + 'T00:00:00');

const MOOD_OPTIONS = [
  { value: 1, label: 'Awful', emoji: '😞' },
  { value: 2, label: 'Bad',   emoji: '😕' },
  { value: 3, label: 'Okay',  emoji: '😐' },
  { value: 4, label: 'Good',  emoji: '🙂' },
  { value: 5, label: 'Great', emoji: '😄' },
];

const lastNDays = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
  return toDateKey(d);
});

// ── STORAGE (IndexedDB-style via localStorage, keyed internally) ──────────────

const DB_KEY = 'praxi:personal:v1'; // single key, no userId dependency

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : { habits: [], habitLogs: {}, moodLogs: {}, journal: [], reminders: [] };
  } catch { return { habits: [], habitLogs: {}, moodLogs: {}, journal: [], reminders: [] }; }
}
function save(data) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch {}
}

// ── HABITS TAB ────────────────────────────────────────────────────────────────

function HabitTab({ g, data, persist, triggerAdd }) {
  const [adding,    setAdding]   = useState(false);
  const [newName,   setNewName]  = useState('');
  const [newEmoji,  setNewEmoji] = useState('');

  const today  = TODAY();
  const now    = new Date();
  const days7  = lastNDays(7);
  const labels = days7.map(dk =>
    dk === today ? 'Today' : isoToDate(dk).toLocaleDateString([], { weekday: 'short' })
  );

  useEffect(() => { if (triggerAdd) { setAdding(true); } }, [triggerAdd]);

  const isDone  = (hId, dk) => !!data.habitLogs[`${hId}:${dk}`];
  const toggleDay = (habitId, dk) => {
    const k = `${habitId}:${dk}`;
    const logs = { ...data.habitLogs };
    if (logs[k]) delete logs[k]; else logs[k] = true;
    persist({ ...data, habitLogs: logs });
  };
  const setMood = (dk, val) => {
    const cur = data.moodLogs?.[dk];
    persist({ ...data, moodLogs: { ...(data.moodLogs || {}), [dk]: cur === val ? null : val } });
  };
  const addHabit = () => {
    if (!newName.trim()) return;
    persist({ ...data, habits: [...data.habits, { id: uid(), name: newName.trim(), emoji: newEmoji.trim() || '✅', createdAt: today }] });
    setNewName(''); setNewEmoji(''); setAdding(false);
  };
  const deleteHabit = (id) => persist({ ...data, habits: data.habits.filter(h => h.id !== id) });

  // Per-day count across all habits for bar chart
  const counts   = days7.map(dk => data.habits.filter(h => isDone(h.id, dk)).length);
  const maxCount = Math.max(...counts, 1);
  const moods    = days7.map(dk => data.moodLogs?.[dk] || null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Today's mood ── */}
      <Surface g={g} style={{ padding: 14 }}>
        <Text g={g} bold size={12} style={{ display: 'block', marginBottom: 8 }}>Today's Mood</Text>
        <div style={{ display: 'flex', gap: 6 }}>
          {MOOD_OPTIONS.map(m => {
            const sel = data.moodLogs?.[today] === m.value;
            return (
              <button key={m.value} onClick={() => setMood(today, m.value)} title={m.label} style={{
                flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${sel ? g.card : g.surfaceBorder}`,
                background: sel ? `${g.card}22` : 'rgba(255,255,255,0.65)',
                fontSize: 20, transition: 'all .15s',
              }}>{m.emoji}</button>
            );
          })}
        </div>
        {data.moodLogs?.[today] && (
          <Text g={g} muted size={11} style={{ display: 'block', marginTop: 4, textAlign: 'center' }}>
            Feeling {MOOD_OPTIONS.find(m => m.value === data.moodLogs[today])?.label}
          </Text>
        )}
      </Surface>

      {/* ── Habit list header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel g={g}>Habits</SectionLabel>
        <Btn g={g} size="sm" onClick={() => setAdding(v => !v)}>{adding ? '✕ Cancel' : '＋ Add'}</Btn>
      </div>

      {/* ── Add form ── */}
      {adding && (
        <Surface g={g} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input g={g} placeholder="Emoji" value={newEmoji}
              onChange={e => setNewEmoji(e.target.value)} style={{ width: 62, flexShrink: 0 }} />
            <Input g={g} placeholder="Habit name" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()} style={{ flex: 1 }} />
          </div>
          <Btn g={g} size="lg" onClick={addHabit}>Add Habit</Btn>
        </Surface>
      )}

      {/* ── Empty state ── */}
      {data.habits.length === 0 && !adding && (
        <Surface g={g} style={{ textAlign: 'center', padding: 24 }}>
          <Text muted g={g} size={13}>No habits yet — tap ＋ Add to start tracking.</Text>
        </Surface>
      )}

      {/* ── Habit rows ── */}
      {data.habits.map(h => {
        const done = isDone(h.id, today);
        const weekDone = days7.filter(dk => isDone(h.id, dk)).length;
        return (
          <Surface key={h.id} g={g} style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => toggleDay(h.id, today)} style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                border: `2.5px solid ${done ? g.card : g.surfaceBorder}`,
                background: done ? g.card : 'rgba(255,255,255,0.7)',
                fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, transition: 'all .2s',
              }}>{done ? '✓' : ''}</button>
              <div style={{ flex: 1 }}>
                <Text g={g} bold size={14}>{h.emoji} {h.name}</Text>
                <Text g={g} muted size={11} style={{ display: 'block', marginTop: 1 }}>
                  {weekDone}/7 this week
                </Text>
              </div>
              <button onClick={() => deleteHabit(h.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 16, padding: 4,
              }}>🗑</button>
            </div>
          </Surface>
        );
      })}

      {/* ── Weekly Summary ── */}
      {data.habits.length > 0 && (
        <>
          <SectionLabel g={g} style={{ marginTop: 4 }}>Weekly Summary</SectionLabel>

          {/* Bar chart */}
          <Surface g={g} style={{ padding: 16 }}>
            <Text g={g} muted size={11} style={{ display: 'block', marginBottom: 14 }}>
              Habits completed per day · {data.habits.length} total
            </Text>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
              {days7.map((dk, i) => {
                const barH   = counts[i] > 0 ? Math.max(counts[i] / maxCount * 100, 8) : 0;
                const moodObj = moods[i] ? MOOD_OPTIONS.find(m => m.value === moods[i]) : null;
                return (
                  <div key={dk} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 13, height: 18, display: 'flex', alignItems: 'center' }}>
                      {moodObj ? moodObj.emoji : <span style={{ fontSize: 9, color: g.muted }}>—</span>}
                    </div>
                    {counts[i] > 0 && <Text g={g} bold size={10} style={{ lineHeight: 1 }}>{counts[i]}</Text>}
                    <div style={{
                      width: '100%', borderRadius: '5px 5px 0 0',
                      height: `${barH}%`, minHeight: counts[i] > 0 ? 5 : 0,
                      background: dk === today ? g.card : `${g.card}77`,
                      transition: 'height .4s',
                    }} />
                  </div>
                );
              })}
            </div>
            {/* X-axis */}
            <div style={{ display: 'flex', gap: 6, marginTop: 5, borderTop: `1px solid ${g.surfaceBorder}`, paddingTop: 5 }}>
              {labels.map((l, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <Text g={g} muted size={9}>{l}</Text>
                </div>
              ))}
            </div>
          </Surface>

          {/* Per-habit strips */}
          <Surface g={g} style={{ padding: 16 }}>
            <Text g={g} bold size={13} style={{ display: 'block', marginBottom: 10 }}>Per Habit</Text>
            {data.habits.map(h => {
              const row = days7.map(dk => isDone(h.id, dk));
              return (
                <div key={h.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text g={g} size={12}>{h.emoji} {h.name}</Text>
                    <Text g={g} muted size={11}>{row.filter(Boolean).length}/7</Text>
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {row.map((done, i) => (
                      <div key={i} title={labels[i]} style={{
                        flex: 1, height: 9, borderRadius: 3,
                        background: done ? g.card : `${g.card}1a`,
                      }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </Surface>

          {/* Mood row */}
          <Surface g={g} style={{ padding: 16 }}>
            <Text g={g} bold size={13} style={{ display: 'block', marginBottom: 10 }}>Mood This Week</Text>
            <div style={{ display: 'flex', gap: 6 }}>
              {days7.map((dk, i) => {
                const m    = moods[i];
                const mObj = m ? MOOD_OPTIONS.find(x => x.value === m) : null;
                return (
                  <div key={dk} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, marginBottom: 3 }}>{mObj ? mObj.emoji : '—'}</div>
                    <Text g={g} muted size={9}>{labels[i]}</Text>
                  </div>
                );
              })}
            </div>
            {(() => {
              const logged = moods.filter(Boolean);
              if (!logged.length) return null;
              const avg    = logged.reduce((s, v) => s + v, 0) / logged.length;
              const avgObj = MOOD_OPTIONS.find(m => m.value === Math.round(avg));
              return (
                <div style={{ marginTop: 10, borderTop: `1px solid ${g.surfaceBorder}`, paddingTop: 8, textAlign: 'center' }}>
                  <Text g={g} size={12}>Avg: <b>{avgObj?.emoji} {avgObj?.label}</b> ({avg.toFixed(1)})</Text>
                </div>
              );
            })()}
          </Surface>
        </>
      )}
    </div>
  );
}

// ── REMINDERS TAB ─────────────────────────────────────────────────────────────

function RemindersTab({ g, data, persist }) {
  const now      = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected,  setSelected]  = useState(TODAY());
  const [adding,    setAdding]    = useState(false);
  const [form, setForm] = useState({ title: '', time: '09:00', repeat: 'none' });

  const daysInM  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const monthStr = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const reminders = data.reminders || [];
  const remByDate = reminders.reduce((acc, r) => { (acc[r.date] = acc[r.date] || []).push(r); return acc; }, {});

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); } else setViewMonth(m => m+1); };

  const addReminder = () => {
    if (!form.title.trim()) return;
    persist({ ...data, reminders: [...reminders, { id: uid(), title: form.title.trim(), date: selected, time: form.time, repeat: form.repeat, createdAt: new Date().toISOString() }] });
    setForm({ title: '', time: '09:00', repeat: 'none' }); setAdding(false);
  };
  const deleteReminder = (id) => persist({ ...data, reminders: reminders.filter(r => r.id !== id) });
  const fmtDate = (dk) => isoToDate(dk).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Surface g={g} style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: g.muted, padding: 4 }}>‹</button>
          <Text g={g} bold size={14} style={{ flex: 1, textAlign: 'center' }}>{monthStr}</Text>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: g.muted, padding: 4 }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, color: g.muted, fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInM }, (_, i) => {
            const d  = i + 1;
            const dk = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isToday = dk === TODAY(), isSel = dk === selected, hasRem = !!(remByDate[dk]?.length);
            return (
              <button key={dk} onClick={() => setSelected(dk)} style={{
                aspectRatio: '1', borderRadius: 10, position: 'relative', cursor: 'pointer',
                border: isSel ? `2px solid ${g.card}` : isToday ? `2px solid ${g.accent}` : '2px solid transparent',
                background: isSel ? g.card : 'rgba(255,255,255,0.6)',
                color: isSel ? '#fff' : g.text,
                fontSize: 12, fontWeight: isToday ? 700 : 400, transition: 'all .15s',
              }}>
                {d}
                {hasRem && <div style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: isSel ? '#fff' : g.card }} />}
              </button>
            );
          })}
        </div>
      </Surface>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text g={g} bold size={13}>{fmtDate(selected)}</Text>
          <Btn g={g} size="sm" onClick={() => setAdding(v => !v)}>{adding ? '✕' : '＋ Add'}</Btn>
        </div>
        {adding && (
          <Surface g={g} style={{ padding: 14, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input g={g} placeholder="Reminder title" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addReminder()} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Input g={g} type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={{ flex: 1 }} />
              <select value={form.repeat} onChange={e => setForm(f => ({ ...f, repeat: e.target.value }))} style={{
                flex: 1, background: 'rgba(255,255,255,0.85)', border: `1.5px solid ${g.surfaceBorder}`,
                borderRadius: 10, color: g.text, padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'system-ui',
              }}>
                <option value="none">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <Btn g={g} size="lg" onClick={addReminder}>Save Reminder</Btn>
          </Surface>
        )}
        {(remByDate[selected] || []).length === 0 && !adding && (
          <Surface g={g} style={{ textAlign: 'center', padding: 20 }}>
            <Text muted g={g} size={13}>No reminders for this day.</Text>
          </Surface>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(remByDate[selected] || []).map(r => (
            <Surface key={r.id} g={g} style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${g.card}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔔</div>
                <div style={{ flex: 1 }}>
                  <Text g={g} bold size={13}>{r.title}</Text>
                  <Text g={g} muted size={11} style={{ display: 'block', marginTop: 1 }}>{r.time}{r.repeat !== 'none' ? ` · Repeats ${r.repeat}` : ''}</Text>
                </div>
                <button onClick={() => deleteReminder(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 16, padding: 4 }}>🗑</button>
              </div>
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── JOURNAL TAB ───────────────────────────────────────────────────────────────

function JournalTab({ g, data, persist }) {
  const [text, setText]           = useState('');
  const [viewEntry, setViewEntry] = useState(null);

  const addEntry = () => {
    if (!text.trim()) return;
    persist({ ...data, journal: [{ id: uid(), text: text.trim(), timestamp: new Date().toISOString(), date: TODAY() }, ...(data.journal || [])] });
    setText('');
  };
  const deleteEntry = (id) => {
    persist({ ...data, journal: (data.journal || []).filter(e => e.id !== id) });
    if (viewEntry?.id === id) setViewEntry(null);
  };
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const grouped = (data.journal || []).reduce((acc, e) => {
    const dk = e.date || e.timestamp?.slice(0,10) || 'unknown';
    (acc[dk] = acc[dk] || []).push(e); return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a,b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Surface g={g} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Textarea g={g} placeholder="What's on your mind…" value={text}
          onChange={e => setText(e.target.value)} style={{ minHeight: 80, resize: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text g={g} muted size={11}>{text.length} chars</Text>
          <Btn g={g} size="sm" onClick={addEntry} disabled={!text.trim()}>💾 Save</Btn>
        </div>
      </Surface>

      {dates.length === 0 && (
        <Surface g={g} style={{ textAlign: 'center', padding: 24 }}>
          <Text muted g={g} size={13}>No entries yet. Write your first one!</Text>
        </Surface>
      )}
      {dates.map(dk => (
        <div key={dk}>
          <Text g={g} bold size={11} style={{ display: 'block', marginBottom: 5, marginLeft: 2, letterSpacing: '.05em', textTransform: 'uppercase', color: g.label }}>
            {fmtDate(dk + 'T12:00:00')} · {grouped[dk].length} {grouped[dk].length === 1 ? 'entry' : 'entries'}
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped[dk].map(entry => (
              <Surface key={entry.id} g={g} style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Text g={g} muted size={11} style={{ display: 'block', marginBottom: 3 }}>🕐 {fmtTime(entry.timestamp)}</Text>
                    <Text g={g} size={13} style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{entry.text}</Text>
                    {entry.text.length > 100 && (
                      <button onClick={() => setViewEntry(entry)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.accent, fontSize: 12, padding: '3px 0', fontFamily: 'system-ui' }}>Read more ›</button>
                    )}
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 16, padding: 4, flexShrink: 0 }}>🗑</button>
                </div>
              </Surface>
            ))}
          </div>
        </div>
      ))}

      {viewEntry && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: g.bg, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: g.card, flexShrink: 0 }}>
            <button onClick={() => setViewEntry(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 12px', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
            <div style={{ flex: 1, color: '#fff', fontWeight: 700, fontSize: 14 }}>{fmtDate(viewEntry.timestamp)} · {fmtTime(viewEntry.timestamp)}</div>
            <button onClick={() => deleteEntry(viewEntry.id)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', fontSize: 13, cursor: 'pointer' }}>🗑 Delete</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <Text g={g} size={15} style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{viewEntry.text}</Text>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function Personal({ g, userId, triggerAddHabit, onAddHabitDone }) {
  const [tab,  setTab]  = useState('habits');
  const [data, setData] = useState(() => load());

  const persist = (next) => { setData(next); save(next); };

  const [habitTrigger, setHabitTrigger] = useState(false);
  useEffect(() => {
    if (triggerAddHabit) { setTab('habits'); setHabitTrigger(true); onAddHabitDone?.(); }
  }, [triggerAddHabit]);

  const tabs = [
    { id: 'habits',    label: '🔁 Habits'    },
    { id: 'reminders', label: '🔔 Reminders' },
    { id: 'journal',   label: '📓 Journal'   },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '9px 0', borderRadius: 12, cursor: 'pointer',
            border: `1.5px solid ${tab === t.id ? g.card : g.surfaceBorder}`,
            background: tab === t.id ? g.card : 'rgba(255,255,255,0.65)',
            color: tab === t.id ? '#fff' : g.text,
            fontSize: 12, fontWeight: 600, transition: 'all .2s',
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'habits'    && <HabitTab     g={g} data={data} persist={persist} triggerAdd={habitTrigger} />}
      {tab === 'reminders' && <RemindersTab g={g} data={data} persist={persist} />}
      {tab === 'journal'   && <JournalTab   g={g} data={data} persist={persist} />}
    </div>
  );
}
