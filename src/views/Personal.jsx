// src/views/Personal.jsx
// Personal tab — Habits (Daily + Monthly Calendar + Weekly Summary), Reminders (Calendar), Journal

import { useState, useEffect, useRef } from 'react';
import { Text, SectionLabel, Surface, Btn, Input, Textarea, Modal } from '../components/ui';

// ── UTILS ─────────────────────────────────────────────────────────────────────

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
const toDateKey  = (d) => d.toISOString().slice(0, 10);
const TODAY      = () => toDateKey(new Date());
const isoToDate  = (s) => new Date(s + 'T00:00:00');

const MOOD_OPTIONS = [
  { value: 1, label: 'Awful', emoji: '😞' },
  { value: 2, label: 'Bad',   emoji: '😕' },
  { value: 3, label: 'Okay',  emoji: '😐' },
  { value: 4, label: 'Good',  emoji: '🙂' },
  { value: 5, label: 'Great', emoji: '😄' },
];

// last N days as date keys, newest last
const lastNDays = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
  return toDateKey(d);
});

// ── STORAGE ───────────────────────────────────────────────────────────────────

function loadPersonal(userId) {
  try {
    const raw = localStorage.getItem(`praxi:personal:${userId}`);
    return raw ? JSON.parse(raw) : { habits: [], habitLogs: {}, moodLogs: {}, journal: [], reminders: [] };
  } catch { return { habits: [], habitLogs: {}, moodLogs: {}, journal: [], reminders: [] }; }
}
function savePersonal(userId, data) {
  try { localStorage.setItem(`praxi:personal:${userId}`, JSON.stringify(data)); } catch {}
}

// ── HABIT TAB ─────────────────────────────────────────────────────────────────

function HabitTab({ g, data, persist, triggerAdd }) {
  const [subTab, setSubTab]     = useState('daily');  // daily | calendar | summary
  const [adding, setAdding]     = useState(false);
  const [newName, setNewName]   = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [calHabit, setCalHabit] = useState(null);     // habit id for calendar view

  const today   = TODAY();
  const now     = new Date();
  const year    = now.getFullYear();
  const month   = now.getMonth();
  const daysInM = new Date(year, month + 1, 0).getDate();
  const todayD  = now.getDate();
  const monthStr = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => { if (triggerAdd) { setSubTab('daily'); setAdding(true); } }, [triggerAdd]);

  const addHabit = () => {
    if (!newName.trim()) return;
    const h = { id: uid(), name: newName.trim(), emoji: newEmoji.trim() || '✅', createdAt: today };
    persist({ ...data, habits: [...data.habits, h] });
    setNewName(''); setNewEmoji(''); setAdding(false);
  };

  const deleteHabit = (id) => persist({ ...data, habits: data.habits.filter(h => h.id !== id) });

  const toggleDay = (habitId, dateKey) => {
    const k = `${habitId}:${dateKey}`;
    const logs = { ...data.habitLogs };
    if (logs[k]) delete logs[k]; else logs[k] = true;
    persist({ ...data, habitLogs: logs });
  };

  const setMood = (dateKey, val) => {
    const ml = { ...(data.moodLogs || {}), [dateKey]: val };
    persist({ ...data, moodLogs: ml });
  };

  const isDone   = (hId, dk) => !!data.habitLogs[`${hId}:${dk}`];
  const monthPct = (hId) => {
    const done = Array.from({ length: todayD }, (_, i) => {
      const dk = `${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
      return isDone(hId, dk) ? 1 : 0;
    }).reduce((s,v) => s+v, 0);
    return Math.round(done / todayD * 100);
  };

  // ── Sub-tab: DAILY ──────────────────────────────────────────────────────────
  const DailyView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Mood for today */}
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
            {MOOD_OPTIONS.find(m => m.value === data.moodLogs[today])?.label}
          </Text>
        )}
      </Surface>

      {/* Add form */}
      {adding && (
        <Surface g={g} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input g={g} placeholder="Emoji" value={newEmoji}
              onChange={e => setNewEmoji(e.target.value)} style={{ width: 62, flexShrink: 0 }} />
            <Input g={g} placeholder="Habit name" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn g={g} size="lg" onClick={addHabit} style={{ flex: 1 }}>Add Habit</Btn>
            <Btn g={g} size="lg" variant="secondary" onClick={() => setAdding(false)} style={{ flex: 1 }}>Cancel</Btn>
          </div>
        </Surface>
      )}

      {/* Habit rows */}
      {data.habits.length === 0 && !adding && (
        <Surface g={g} style={{ textAlign: 'center', padding: 24 }}>
          <Text muted g={g} size={13}>No habits yet — tap ＋ Add Habit to start.</Text>
        </Surface>
      )}

      {data.habits.map(h => {
        const done = isDone(h.id, today);
        const pct  = monthPct(h.id);
        return (
          <Surface key={h.id} g={g} style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Check circle */}
              <button onClick={() => toggleDay(h.id, today)} style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                border: `2.5px solid ${done ? g.card : g.surfaceBorder}`,
                background: done ? g.card : 'rgba(255,255,255,0.7)',
                fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', transition: 'all .2s',
              }}>{done ? '✓' : ''}</button>
              <div style={{ flex: 1 }}>
                <Text g={g} bold size={14}>{h.emoji} {h.name}</Text>
                <Text g={g} muted size={11} style={{ display: 'block', marginTop: 1 }}>
                  {pct}% this month
                </Text>
              </div>
              {/* Calendar view btn */}
              <button onClick={() => { setCalHabit(h.id); setSubTab('calendar'); }} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                color: g.muted, padding: 4,
              }} title="Monthly calendar">📅</button>
              <button onClick={() => deleteHabit(h.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: g.muted, fontSize: 16, padding: 4,
              }}>🗑</button>
            </div>
          </Surface>
        );
      })}
    </div>
  );

  // ── Sub-tab: CALENDAR ───────────────────────────────────────────────────────
  const CalendarView = () => {
    const habit = data.habits.find(h => h.id === calHabit) || data.habits[0];
    if (!habit) return <Surface g={g} style={{ padding: 24, textAlign: 'center' }}><Text g={g} muted size={13}>No habits to show.</Text></Surface>;

    const grid = Array.from({ length: daysInM }, (_, i) => {
      const d   = i + 1;
      const dk  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      return { d, dk, done: isDone(habit.id, dk), future: d > todayD };
    });
    const doneCnt = grid.filter(c => !c.future && c.done).length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Habit picker */}
        {data.habits.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.habits.map(h => (
              <button key={h.id} onClick={() => setCalHabit(h.id)} style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: `1.5px solid ${calHabit === h.id ? g.card : g.surfaceBorder}`,
                background: calHabit === h.id ? g.card : 'rgba(255,255,255,0.65)',
                color: calHabit === h.id ? '#fff' : g.text,
              }}>{h.emoji} {h.name}</button>
            ))}
          </div>
        )}

        <Surface g={g} style={{ padding: 16 }}>
          <Text g={g} bold size={14} style={{ display: 'block', marginBottom: 4 }}>
            {habit.emoji} {habit.name}
          </Text>
          <Text g={g} muted size={12} style={{ display: 'block', marginBottom: 14 }}>
            {monthStr} · {doneCnt}/{todayD} days completed
          </Text>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, color: g.muted, fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          {/* Offset blank cells */}
          {(() => {
            const firstDow = new Date(year, month, 1).getDay();
            const cells    = [
              ...Array(firstDow).fill(null),
              ...grid,
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {cells.map((cell, i) => {
                  if (!cell) return <div key={`e${i}`} />;
                  return (
                    <button key={cell.dk} disabled={cell.future}
                      onClick={() => !cell.future && toggleDay(habit.id, cell.dk)}
                      style={{
                        aspectRatio: '1', borderRadius: 8, border: cell.d === todayD ? `2px solid ${g.accent}` : 'none',
                        background: cell.done ? g.card : cell.future ? `${g.card}08` : `${g.card}18`,
                        color: cell.done ? '#fff' : cell.future ? `${g.muted}66` : g.text,
                        fontSize: 11, fontWeight: 600, cursor: cell.future ? 'default' : 'pointer',
                        transition: 'background .15s',
                      }}>{cell.d}</button>
                  );
                })}
              </div>
            );
          })()}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 0, marginTop: 14, borderTop: `1px solid ${g.surfaceBorder}`, paddingTop: 10 }}>
            {[
              { label: 'Done', val: doneCnt },
              { label: 'Missed', val: todayD - doneCnt },
              { label: 'Rate', val: `${Math.round(doneCnt / Math.max(todayD,1)*100)}%` },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                <Text g={g} bold size={16} style={{ display: 'block' }}>{s.val}</Text>
                <Text g={g} muted size={10}>{s.label}</Text>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    );
  };

  // ── Sub-tab: SUMMARY ────────────────────────────────────────────────────────
  const SummaryView = () => {
    const days  = lastNDays(7);
    const labels = days.map(dk => {
      const d = isoToDate(dk);
      return dk === TODAY() ? 'Today' : d.toLocaleDateString([], { weekday: 'short' });
    });

    // Per-day completion count across all habits
    const counts = days.map(dk =>
      data.habits.filter(h => isDone(h.id, dk)).length
    );
    const maxCount = Math.max(...counts, 1);

    // Mood per day
    const moods = days.map(dk => data.moodLogs?.[dk] || null);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Surface g={g} style={{ padding: 16 }}>
          <Text g={g} bold size={14} style={{ display: 'block', marginBottom: 2 }}>Weekly Habit Completion</Text>
          <Text g={g} muted size={11} style={{ display: 'block', marginBottom: 16 }}>
            Bars show habits completed each day out of {data.habits.length} total
          </Text>

          {/* Bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {days.map((dk, i) => {
              const barH = counts[i] > 0 ? Math.max(counts[i] / maxCount * 100, 8) : 0;
              const moodObj = moods[i] ? MOOD_OPTIONS.find(m => m.value === moods[i]) : null;
              return (
                <div key={dk} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  {/* Mood emoji above bar */}
                  <div style={{ fontSize: 14, height: 20, display: 'flex', alignItems: 'center' }}>
                    {moodObj ? moodObj.emoji : <span style={{ fontSize: 10, color: g.muted }}>—</span>}
                  </div>
                  {/* Count label */}
                  {counts[i] > 0 && (
                    <Text g={g} bold size={11} style={{ lineHeight: 1 }}>{counts[i]}</Text>
                  )}
                  {/* Bar */}
                  <div style={{
                    width: '100%', borderRadius: '6px 6px 0 0',
                    height: `${barH}%`, minHeight: counts[i] > 0 ? 6 : 0,
                    background: dk === TODAY() ? g.card : `${g.card}88`,
                    transition: 'height .4s',
                  }} />
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6, borderTop: `1px solid ${g.surfaceBorder}`, paddingTop: 6 }}>
            {labels.map((l, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <Text g={g} muted size={10}>{l}</Text>
              </div>
            ))}
          </div>
        </Surface>

        {/* Per-habit 7-day streaks */}
        {data.habits.length > 0 && (
          <Surface g={g} style={{ padding: 16 }}>
            <Text g={g} bold size={13} style={{ display: 'block', marginBottom: 12 }}>Per Habit — Last 7 Days</Text>
            {data.habits.map(h => {
              const row = days.map(dk => isDone(h.id, dk));
              const streak = row.filter(Boolean).length;
              return (
                <div key={h.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text g={g} size={13}>{h.emoji} {h.name}</Text>
                    <Text g={g} muted size={11}>{streak}/7</Text>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {row.map((done, i) => (
                      <div key={i} style={{
                        flex: 1, height: 10, borderRadius: 4,
                        background: done ? g.card : `${g.card}20`,
                        transition: 'background .2s',
                      }} title={labels[i]} />
                    ))}
                  </div>
                </div>
              );
            })}
          </Surface>
        )}

        {/* Mood summary */}
        <Surface g={g} style={{ padding: 16 }}>
          <Text g={g} bold size={13} style={{ display: 'block', marginBottom: 10 }}>Mood This Week</Text>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
            {days.map((dk, i) => {
              const m = moods[i];
              const mObj = m ? MOOD_OPTIONS.find(x => x.value === m) : null;
              return (
                <div key={dk} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 2 }}>{mObj ? mObj.emoji : '—'}</div>
                  <Text g={g} muted size={9}>{labels[i]}</Text>
                </div>
              );
            })}
          </div>
          {(() => {
            const logged = moods.filter(Boolean);
            if (!logged.length) return null;
            const avg = logged.reduce((s,v) => s+v, 0) / logged.length;
            const avgObj = MOOD_OPTIONS.find(m => m.value === Math.round(avg));
            return (
              <div style={{ marginTop: 10, borderTop: `1px solid ${g.surfaceBorder}`, paddingTop: 8, textAlign: 'center' }}>
                <Text g={g} size={13}>Avg mood: <b>{avgObj?.emoji} {avgObj?.label}</b> ({avg.toFixed(1)})</Text>
              </div>
            );
          })()}
        </Surface>
      </div>
    );
  };

  const subTabs = [
    { id: 'daily',    label: '📋 Daily'    },
    { id: 'calendar', label: '📅 Calendar' },
    { id: 'summary',  label: '📊 Summary'  },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 6 }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: '7px 0', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            border: `1.5px solid ${subTab === t.id ? g.card : g.surfaceBorder}`,
            background: subTab === t.id ? g.card : 'rgba(255,255,255,0.65)',
            color: subTab === t.id ? '#fff' : g.text, transition: 'all .2s',
          }}>{t.label}</button>
        ))}
      </div>
      {subTab === 'daily'    && <DailyView />}
      {subTab === 'calendar' && <CalendarView />}
      {subTab === 'summary'  && <SummaryView />}
    </div>
  );
}

// ── REMINDERS TAB ─────────────────────────────────────────────────────────────

function RemindersTab({ g, data, persist }) {
  const now      = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());  // 0-indexed
  const [selected,  setSelected]  = useState(TODAY());
  const [adding,    setAdding]    = useState(false);
  const [form, setForm] = useState({ title: '', time: '09:00', repeat: 'none' });

  const daysInM  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const monthStr = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const reminders = data.reminders || [];

  const remByDate = reminders.reduce((acc, r) => {
    (acc[r.date] = acc[r.date] || []).push(r);
    return acc;
  }, {});

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
    else setViewMonth(m => m-1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
    else setViewMonth(m => m+1);
  };

  const addReminder = () => {
    if (!form.title.trim()) return;
    const r = { id: uid(), title: form.title.trim(), date: selected, time: form.time, repeat: form.repeat, createdAt: new Date().toISOString() };
    persist({ ...data, reminders: [...reminders, r] });
    setForm({ title: '', time: '09:00', repeat: 'none' });
    setAdding(false);
  };

  const deleteReminder = (id) => persist({ ...data, reminders: reminders.filter(r => r.id !== id) });

  const selReminders = remByDate[selected] || [];

  const fmtDate = (dk) => {
    const d = isoToDate(dk);
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Calendar */}
      <Surface g={g} style={{ padding: 16 }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: g.muted, padding: 4 }}>‹</button>
          <Text g={g} bold size={14} style={{ flex: 1, textAlign: 'center' }}>{monthStr}</Text>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: g.muted, padding: 4 }}>›</button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, color: g.muted, fontWeight: 600 }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInM }, (_, i) => {
            const d  = i + 1;
            const dk = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isToday  = dk === TODAY();
            const isSel    = dk === selected;
            const hasRem   = !!(remByDate[dk]?.length);
            return (
              <button key={dk} onClick={() => setSelected(dk)} style={{
                aspectRatio: '1', borderRadius: 10, position: 'relative', cursor: 'pointer',
                border: isSel ? `2px solid ${g.card}` : isToday ? `2px solid ${g.accent}` : '2px solid transparent',
                background: isSel ? g.card : 'rgba(255,255,255,0.6)',
                color: isSel ? '#fff' : g.text,
                fontSize: 12, fontWeight: isToday ? 700 : 400, transition: 'all .15s',
              }}>
                {d}
                {hasRem && (
                  <div style={{
                    position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                    width: 5, height: 5, borderRadius: '50%',
                    background: isSel ? '#fff' : g.card,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </Surface>

      {/* Selected day reminders */}
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
              <Input g={g} type="time" value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={{ flex: 1 }} />
              <select value={form.repeat} onChange={e => setForm(f => ({ ...f, repeat: e.target.value }))}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.85)',
                  border: `1.5px solid ${g.surfaceBorder}`,
                  borderRadius: 10, color: g.text, padding: '10px 12px',
                  fontSize: 13, outline: 'none', fontFamily: 'system-ui',
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

        {selReminders.length === 0 && !adding && (
          <Surface g={g} style={{ textAlign: 'center', padding: 20 }}>
            <Text muted g={g} size={13}>No reminders for this day.</Text>
          </Surface>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selReminders.map(r => (
            <Surface key={r.id} g={g} style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: `${g.card}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                }}>🔔</div>
                <div style={{ flex: 1 }}>
                  <Text g={g} bold size={13}>{r.title}</Text>
                  <Text g={g} muted size={11} style={{ display: 'block', marginTop: 1 }}>
                    {r.time}{r.repeat !== 'none' ? ` · Repeats ${r.repeat}` : ''}
                  </Text>
                </div>
                <button onClick={() => deleteReminder(r.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 16, padding: 4,
                }}>🗑</button>
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
  const [text, setText]         = useState('');
  const [viewEntry, setViewEntry] = useState(null);

  const addEntry = () => {
    if (!text.trim()) return;
    const entry = { id: uid(), text: text.trim(), timestamp: new Date().toISOString(), date: TODAY() };
    persist({ ...data, journal: [entry, ...(data.journal || [])] });
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
    (acc[dk] = acc[dk] || []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a,b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Write */}
      <Surface g={g} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Textarea g={g} placeholder="What's on your mind…" value={text}
          onChange={e => setText(e.target.value)} style={{ minHeight: 80, resize: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text g={g} muted size={11}>{text.length} chars</Text>
          <Btn g={g} size="sm" onClick={addEntry} disabled={!text.trim()}>💾 Save</Btn>
        </div>
      </Surface>

      {/* List */}
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
                    <Text g={g} size={13} style={{
                      display: '-webkit-box', WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{entry.text}</Text>
                    {entry.text.length > 100 && (
                      <button onClick={() => setViewEntry(entry)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: g.accent, fontSize: 12, padding: '3px 0', fontFamily: 'system-ui',
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

      {/* Full-screen viewer */}
      {viewEntry && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: g.bg, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: g.card, flexShrink: 0 }}>
            <button onClick={() => setViewEntry(null)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
              padding: '4px 12px', color: '#fff', fontSize: 18, cursor: 'pointer',
            }}>←</button>
            <div style={{ flex: 1, color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {fmtDate(viewEntry.timestamp)} · {fmtTime(viewEntry.timestamp)}
            </div>
            <button onClick={() => deleteEntry(viewEntry.id)} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
              padding: '4px 10px', color: '#fff', fontSize: 13, cursor: 'pointer',
            }}>🗑 Delete</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <Text g={g} size={15} style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{viewEntry.text}</Text>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PERSONAL VIEW ────────────────────────────────────────────────────────

export default function Personal({ g, userId, triggerAddHabit, onAddHabitDone }) {
  const [tab,  setTab]  = useState('habits');
  const [data, setData] = useState(() => loadPersonal(userId));

  const persist = (next) => { setData(next); savePersonal(userId, next); };

  const tabs = [
    { id: 'habits',    label: '🔁 Habits'    },
    { id: 'reminders', label: '🔔 Reminders' },
    { id: 'journal',   label: '📓 Journal'   },
  ];

  // Bottom bar "＋ Add Habit" triggers
  const [habitTrigger, setHabitTrigger] = useState(false);
  useEffect(() => {
    if (triggerAddHabit) { setTab('habits'); setHabitTrigger(true); onAddHabitDone?.(); }
  }, [triggerAddHabit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top tab bar */}
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
