// src/views/Personal.jsx
// Personal tab — Habits (daily mark + monthly summary), Journal (multi-entry/day), Health (activity + steps + mood)

import { useState, useEffect, useRef } from 'react';
import {
  Text, SectionLabel, Surface, GemCard, Btn, Input, Textarea, Select,
} from '../components/ui';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
}

const TODAY = () => new Date().toISOString().slice(0, 10);
const MONTH_KEY = () => new Date().toISOString().slice(0, 7); // "2025-06"
const DAYS_IN_MONTH = () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
const DAY_OF_MONTH = () => new Date().getDate();

const MOOD_OPTIONS = [
  { value: 1, label: 'Awful',   emoji: '😞' },
  { value: 2, label: 'Bad',     emoji: '😕' },
  { value: 3, label: 'Okay',    emoji: '😐' },
  { value: 4, label: 'Good',    emoji: '🙂' },
  { value: 5, label: 'Great',   emoji: '😄' },
];

const ACTIVITY_OPTIONS = ['Rest', 'Walk', 'Run', 'Gym', 'Yoga', 'Cycle', 'Swim', 'Other'];

// ── LOCAL STORAGE HELPERS ─────────────────────────────────────────────────────

function loadPersonal(userId) {
  try {
    const raw = localStorage.getItem(`praxi:personal:${userId}`);
    return raw ? JSON.parse(raw) : { habits: [], habitLogs: {}, journal: [], health: {} };
  } catch { return { habits: [], habitLogs: {}, journal: [], health: {} }; }
}

function savePersonal(userId, data) {
  try { localStorage.setItem(`praxi:personal:${userId}`, JSON.stringify(data)); } catch {}
}

// ── SECTION: HABITS ───────────────────────────────────────────────────────────

function HabitSection({ g, userId }) {
  const [data, setData]       = useState(() => loadPersonal(userId));
  const [adding, setAdding]   = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [showMonth, setShowMonth] = useState(null); // habit id for monthly view

  const today    = TODAY();
  const monthKey = MONTH_KEY();
  const daysInM  = DAYS_IN_MONTH();
  const dayOfM   = DAY_OF_MONTH();

  const persist = (next) => { setData(next); savePersonal(userId, next); };

  const addHabit = () => {
    if (!newName.trim()) return;
    const habit = { id: uuid(), name: newName.trim(), emoji: newEmoji.trim() || '✅', createdAt: today };
    persist({ ...data, habits: [...data.habits, habit] });
    setNewName(''); setNewEmoji(''); setAdding(false);
  };

  const deleteHabit = (id) => {
    persist({ ...data, habits: data.habits.filter(h => h.id !== id) });
  };

  const toggleToday = (habitId) => {
    const key = `${habitId}:${today}`;
    const logs = { ...data.habitLogs };
    if (logs[key]) { delete logs[key]; } else { logs[key] = true; }
    persist({ ...data, habitLogs: logs });
  };

  const isDoneToday  = (id) => !!data.habitLogs[`${id}:${today}`];
  const monthStreak  = (id) => Array.from({ length: daysInM }, (_, i) => i + 1)
    .filter(d => !!data.habitLogs[`${id}:${monthKey}-${String(d).padStart(2,'0')}`]).length;

  const monthGrid    = (id) => Array.from({ length: daysInM }, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    return { day: i + 1, done: !!data.habitLogs[`${id}:${monthKey}-${d}`] };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <SectionLabel g={g}>🔁 Habits</SectionLabel>
        <Btn g={g} size="sm" onClick={() => setAdding(v => !v)}>{adding ? '✕ Cancel' : '＋ Add'}</Btn>
      </div>

      {adding && (
        <Surface g={g} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input g={g} placeholder="Emoji (optional)" value={newEmoji}
              onChange={e => setNewEmoji(e.target.value)} style={{ width: 64, flexShrink: 0 }} />
            <Input g={g} placeholder="Habit name (e.g. Meditate)" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()} style={{ flex: 1 }} />
          </div>
          <Btn g={g} size="lg" onClick={addHabit}>Add Habit</Btn>
        </Surface>
      )}

      {data.habits.length === 0 && !adding && (
        <Surface g={g} style={{ textAlign: 'center', padding: 20 }}>
          <Text muted g={g} size={13}>No habits yet. Add one to start tracking!</Text>
        </Surface>
      )}

      {data.habits.map(h => {
        const done   = isDoneToday(h.id);
        const streak = monthStreak(h.id);
        const isOpen = showMonth === h.id;
        return (
          <div key={h.id}>
            <Surface g={g} style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Check circle */}
                <button onClick={() => toggleToday(h.id)} style={{
                  width: 36, height: 36, borderRadius: '50%', border: `2.5px solid ${done ? g.card : g.surfaceBorder}`,
                  background: done ? g.card : 'rgba(255,255,255,0.6)', cursor: 'pointer',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all .2s',
                }}>
                  {done ? '✓' : ''}
                </button>

                <div style={{ flex: 1 }}>
                  <Text g={g} bold size={14}>{h.emoji} {h.name}</Text>
                  <div style={{ marginTop: 2 }}>
                    <Text g={g} muted size={11}>{streak}/{daysInM} this month</Text>
                  </div>
                </div>

                {/* Month grid toggle */}
                <button onClick={() => setShowMonth(isOpen ? null : h.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                  color: g.muted, padding: 4,
                }}>📅</button>

                {/* Tiny progress arc */}
                <div style={{ fontSize: 11, fontWeight: 700, color: done ? g.card : g.muted,
                  minWidth: 28, textAlign: 'right' }}>
                  {Math.round(streak / daysInM * 100)}%
                </div>

                <button onClick={() => deleteHabit(h.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: g.muted,
                  fontSize: 16, padding: 4,
                }}>🗑</button>
              </div>

              {/* Monthly grid */}
              {isOpen && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${g.surfaceBorder}`, paddingTop: 10 }}>
                  <Text g={g} muted size={11} style={{ display: 'block', marginBottom: 6 }}>
                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </Text>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {monthGrid(h.id).map(({ day, done: d }) => (
                      <div key={day} title={`Day ${day}`} style={{
                        width: '100%', aspectRatio: '1', borderRadius: 6,
                        background: d ? g.card : `${g.card}18`,
                        border: day === dayOfM ? `2px solid ${g.accent}` : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: d ? '#fff' : g.muted, fontWeight: 600,
                      }}>{day}</div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                    <Text g={g} size={12}>✅ Completed: <b>{streak}</b></Text>
                    <Text g={g} size={12}>⬜ Missed: <b>{dayOfM - 1 - streak < 0 ? 0 : dayOfM - 1 - streak}</b></Text>
                    <Text g={g} size={12}>📊 Rate: <b>{Math.round(streak / Math.max(dayOfM - 1, 1) * 100)}%</b></Text>
                  </div>
                </div>
              )}
            </Surface>
          </div>
        );
      })}
    </div>
  );
}

// ── SECTION: JOURNAL ──────────────────────────────────────────────────────────

function JournalSection({ g, userId }) {
  const [data, setData]       = useState(() => loadPersonal(userId));
  const [text, setText]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const textareaRef = useRef(null);

  const persist = (next) => { setData(next); savePersonal(userId, next); };

  const addEntry = () => {
    if (!text.trim()) return;
    setSaving(true);
    const entry = {
      id: uuid(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      date: TODAY(),
    };
    persist({ ...data, journal: [entry, ...(data.journal || [])] });
    setText('');
    setSaving(false);
  };

  const deleteEntry = (id) => {
    persist({ ...data, journal: (data.journal || []).filter(e => e.id !== id) });
    if (viewEntry?.id === id) setViewEntry(null);
  };

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const diff = Math.floor((today - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group entries by date
  const grouped = (data.journal || []).reduce((acc, entry) => {
    const dk = entry.date || entry.timestamp?.slice(0, 10) || 'unknown';
    if (!acc[dk]) acc[dk] = [];
    acc[dk].push(entry);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel g={g}>📓 Journal</SectionLabel>

      {/* Write area */}
      <Surface g={g} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Textarea g={g} ref={textareaRef} placeholder="What's on your mind…"
          value={text} onChange={e => setText(e.target.value)}
          style={{ minHeight: 80, resize: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text g={g} muted size={11}>{text.length} chars</Text>
          <Btn g={g} size="sm" onClick={addEntry} disabled={saving || !text.trim()}>
            {saving ? '…' : '💾 Save entry'}
          </Btn>
        </div>
      </Surface>

      {/* Entry list */}
      {dates.length === 0 && (
        <Surface g={g} style={{ textAlign: 'center', padding: 20 }}>
          <Text muted g={g} size={13}>No journal entries yet. Write your first one!</Text>
        </Surface>
      )}

      {dates.map(dk => (
        <div key={dk}>
          <Text g={g} bold size={12} style={{ display: 'block', marginBottom: 4, marginLeft: 2 }}>
            {fmtDate(dk + 'T00:00:00')} · {grouped[dk].length} {grouped[dk].length === 1 ? 'entry' : 'entries'}
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped[dk].map(entry => (
              <Surface key={entry.id} g={g} style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Text g={g} muted size={11} style={{ display: 'block', marginBottom: 4 }}>
                      🕐 {fmtTime(entry.timestamp)}
                    </Text>
                    <Text g={g} size={13} style={{
                      display: '-webkit-box', WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{entry.text}</Text>
                    {entry.text.length > 120 && (
                      <button onClick={() => setViewEntry(entry)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: g.accent, fontSize: 12, padding: '4px 0',
                        fontFamily: 'system-ui',
                      }}>Read more ›</button>
                    )}
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: g.muted, fontSize: 16, padding: 4, flexShrink: 0,
                  }}>🗑</button>
                </div>
              </Surface>
            ))}
          </div>
        </div>
      ))}

      {/* Full-screen entry viewer */}
      {viewEntry && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: g.bg, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', background: g.card, flexShrink: 0,
          }}>
            <button onClick={() => setViewEntry(null)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
              padding: '4px 12px', color: '#fff', fontSize: 18, cursor: 'pointer',
            }}>←</button>
            <div style={{ flex: 1, color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {fmtDate(viewEntry.timestamp)} · {fmtTime(viewEntry.timestamp)}
            </div>
            <button onClick={() => { deleteEntry(viewEntry.id); }} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
              padding: '4px 10px', color: '#fff', fontSize: 13, cursor: 'pointer',
            }}>🗑 Delete</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <Text g={g} size={15} style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {viewEntry.text}
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SECTION: HEALTH ───────────────────────────────────────────────────────────

function HealthSection({ g, userId }) {
  const [data, setData] = useState(() => loadPersonal(userId));
  const today = TODAY();

  const todayHealth = data.health?.[today] || { steps: '', activity: '', mood: null };

  const persist = (next) => { setData(next); savePersonal(userId, next); };

  const updateToday = (updates) => {
    const next = {
      ...data,
      health: {
        ...(data.health || {}),
        [today]: { ...todayHealth, ...updates },
      },
    };
    persist(next);
  };

  // Last 7 days for summary
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    return { key, label: i === 0 ? 'Today' : d.toLocaleDateString([], { weekday: 'short' }), ...(data.health?.[key] || {}) };
  }).reverse();

  const avgMood = last7.filter(d => d.mood).reduce((s, d, _, a) => s + d.mood / a.filter(x => x.mood).length, 0);
  const totalSteps = last7.reduce((s, d) => s + (Number(d.steps) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel g={g}>💪 Health — Today</SectionLabel>

      {/* Today's entry card */}
      <Surface g={g} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Mood */}
        <div>
          <Text g={g} bold size={12} style={{ display: 'block', marginBottom: 8 }}>😊 Mood</Text>
          <div style={{ display: 'flex', gap: 8 }}>
            {MOOD_OPTIONS.map(m => (
              <button key={m.value} onClick={() => updateToday({ mood: m.value })} title={m.label} style={{
                flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${todayHealth.mood === m.value ? g.card : g.surfaceBorder}`,
                background: todayHealth.mood === m.value ? `${g.card}18` : 'rgba(255,255,255,0.6)',
                fontSize: 20, transition: 'all .15s',
              }}>
                {m.emoji}
              </button>
            ))}
          </div>
          {todayHealth.mood && (
            <Text g={g} muted size={11} style={{ display: 'block', marginTop: 4, textAlign: 'center' }}>
              {MOOD_OPTIONS.find(m => m.value === todayHealth.mood)?.label}
            </Text>
          )}
        </div>

        {/* Steps */}
        <div>
          <Text g={g} bold size={12} style={{ display: 'block', marginBottom: 6 }}>👟 Steps</Text>
          <Input g={g} type="number" placeholder="e.g. 8000"
            value={todayHealth.steps}
            onChange={e => updateToday({ steps: e.target.value })}
          />
          {todayHealth.steps && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 6, borderRadius: 99, background: `${g.card}20`, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, background: g.card,
                  width: `${Math.min(Number(todayHealth.steps) / 10000 * 100, 100)}%`,
                  transition: 'width .4s',
                }} />
              </div>
              <Text g={g} muted size={11} style={{ display: 'block', marginTop: 3 }}>
                {Math.round(Number(todayHealth.steps) / 10000 * 100)}% of 10,000 goal
              </Text>
            </div>
          )}
        </div>

        {/* Activity */}
        <div>
          <Text g={g} bold size={12} style={{ display: 'block', marginBottom: 6 }}>🏃 Activity</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ACTIVITY_OPTIONS.map(a => (
              <button key={a} onClick={() => updateToday({ activity: todayHealth.activity === a ? '' : a })} style={{
                padding: '5px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${todayHealth.activity === a ? g.card : g.surfaceBorder}`,
                background: todayHealth.activity === a ? g.card : 'rgba(255,255,255,0.7)',
                color: todayHealth.activity === a ? '#fff' : g.text,
                transition: 'all .15s',
              }}>{a}</button>
            ))}
          </div>
        </div>
      </Surface>

      {/* 7-day summary */}
      <SectionLabel g={g}>📊 7-Day Summary</SectionLabel>
      <Surface g={g} style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {last7.map(d => {
            const moodEmoji = d.mood ? MOOD_OPTIONS.find(m => m.value === d.mood)?.emoji : '—';
            const stepsVal = Number(d.steps) || 0;
            const barH = stepsVal > 0 ? Math.max(Math.min(stepsVal / 10000 * 48, 48), 4) : 0;
            return (
              <div key={d.key} style={{
                flex: '0 0 42px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 14 }}>{moodEmoji}</span>
                {/* Steps bar */}
                <div style={{
                  width: 24, height: 48, borderRadius: 6,
                  background: `${g.card}15`,
                  display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
                }}>
                  <div style={{
                    width: '100%', height: barH, background: d.activity ? g.card : `${g.card}60`,
                    borderRadius: 4, transition: 'height .4s',
                  }} />
                </div>
                {/* Activity dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: d.activity ? g.card : `${g.card}25`,
                }} />
                <Text g={g} muted size={10} style={{ textAlign: 'center' }}>{d.label}</Text>
              </div>
            );
          })}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, marginTop: 12, borderTop: `1px solid ${g.surfaceBorder}`, paddingTop: 10 }}>
          {[
            { label: 'Avg Mood', value: avgMood ? `${MOOD_OPTIONS.find(m => m.value === Math.round(avgMood))?.emoji} ${avgMood.toFixed(1)}` : '—' },
            { label: 'Total Steps', value: totalSteps > 0 ? totalSteps.toLocaleString() : '—' },
            { label: 'Active Days', value: `${last7.filter(d => d.activity && d.activity !== 'Rest').length}/7` },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
              <Text g={g} bold size={14} style={{ display: 'block' }}>{stat.value}</Text>
              <Text g={g} muted size={10}>{stat.label}</Text>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

// ── MAIN PERSONAL VIEW ────────────────────────────────────────────────────────

export default function Personal({ g, userId, triggerAddHabit, onAddHabitDone }) {
  const [section, setSection] = useState('habits');

  const tabs = [
    { id: 'habits',  label: '🔁 Habits'  },
    { id: 'journal', label: '📓 Journal' },
    { id: 'health',  label: '💪 Health'  },
  ];

  useEffect(() => {
    if (triggerAddHabit) { setSection('habits'); onAddHabitDone?.(); }
  }, [triggerAddHabit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)} style={{
            flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
            border: `1.5px solid ${section === t.id ? g.card : g.surfaceBorder}`,
            background: section === t.id ? g.card : 'rgba(255,255,255,0.6)',
            color: section === t.id ? '#fff' : g.text,
            fontSize: 12, fontWeight: 600, transition: 'all .2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Section content */}
      {section === 'habits'  && <HabitSection  g={g} userId={userId} />}
      {section === 'journal' && <JournalSection g={g} userId={userId} />}
      {section === 'health'  && <HealthSection  g={g} userId={userId} />}
    </div>
  );
}
