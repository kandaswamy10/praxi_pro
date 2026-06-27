// src/views/Finance.jsx
// Finance tab — Goals | Links | Calendar (reminders + borrow/payment entries)

import { useState, useRef, useEffect } from 'react';
import { Text, SectionLabel, Surface, Btn, Input, Textarea, Modal } from '../components/ui';

// ── UTILS ─────────────────────────────────────────────────────────────────────

const uid       = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
const TODAY     = () => new Date().toISOString().slice(0, 10);
const isoToDate = (s) => new Date(s + 'T00:00:00');

const DB_KEY = 'praxi:finance:v1';
function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : { goals: [], links: [], calEntries: [] };
  } catch { return { goals: [], links: [], calEntries: [] }; }
}
function save(data) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch {}
}

const titleFromUrl = (url) => {
  try {
    const u    = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    const last = segs[segs.length - 1] || u.hostname;
    return last.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '')
      .replace(/\b\w/g, c => c.toUpperCase()).trim() || u.hostname;
  } catch { return url; }
};

// ── BEEP SOUNDS (Web Audio API — no files needed) ─────────────────────────────

const BEEP_TYPES = [
  { id: 'ding',     label: '🔔 Ding',      play: (ctx) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3); g.gain.setValueAtTime(0.4, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); o.start(); o.stop(ctx.currentTime + 0.5); } },
  { id: 'chime',    label: '🎵 Chime',     play: (ctx) => { [523, 659, 784].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, ctx.currentTime + i * 0.15); g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.05); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4); o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.4); }); } },
  { id: 'alert',    label: '⚡ Alert',     play: (ctx) => { [0, 0.2].forEach(t => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'square'; o.frequency.value = 440; g.gain.setValueAtTime(0.15, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15); }); } },
  { id: 'soft',     label: '🌙 Soft',      play: (ctx) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 528; g.gain.setValueAtTime(0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8); o.start(); o.stop(ctx.currentTime + 0.8); } },
  { id: 'urgent',   label: '🚨 Urgent',    play: (ctx) => { [0, 0.15, 0.3].forEach(t => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sawtooth'; o.frequency.value = 660; g.gain.setValueAtTime(0.15, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.1); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.1); }); } },
];

function playBeep(id) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const beep = BEEP_TYPES.find(b => b.id === id) || BEEP_TYPES[0];
    beep.play(ctx);
  } catch {}
}

// ── ADD GOAL MODAL ────────────────────────────────────────────────────────────

function AddGoalModal({ g, onSave, onClose, initial = {} }) {
  const [form, setForm] = useState({ title: '', target: '', currency: '₹', notes: '', ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title={initial.id ? 'Edit Goal' : 'New Finance Goal'} g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Input g={g} placeholder="Goal title *  e.g. Emergency Fund" value={form.title}
          onChange={e => set('title', e.target.value)} autoFocus />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flexShrink: 0 }}>
            <SectionLabel g={g}>Currency</SectionLabel>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} style={{
              background: 'rgba(255,255,255,0.85)', border: `1.5px solid ${g.surfaceBorder}`,
              borderRadius: 10, color: g.text, padding: '10px', fontSize: 13, outline: 'none', fontFamily: 'system-ui',
            }}>
              {['₹','$','€','£','¥'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel g={g}>Target Amount</SectionLabel>
            <Input g={g} type="number" placeholder="e.g. 500000" value={form.target} onChange={e => set('target', e.target.value)} />
          </div>
        </div>
        <div>
          <SectionLabel g={g}>Notes</SectionLabel>
          <Textarea g={g} placeholder="Strategy, timeline…" value={form.notes}
            onChange={e => set('notes', e.target.value)} style={{ minHeight: 60, resize: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn g={g} size="lg" style={{ flex: 1 }}
            onClick={() => form.title.trim() && onSave({ ...initial, ...form, id: initial.id || uid() })}>
            {initial.id ? 'Save Changes' : '＋ Add Goal'}
          </Btn>
          <Btn g={g} variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── ADD LINK MODAL ────────────────────────────────────────────────────────────

function AddLinkModal({ g, onSave, onClose }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [fetched, setFetched] = useState(false);

  const deriveTitle = () => {
    if (!url.trim()) return;
    setTitle(titleFromUrl(url.trim()));
    setFetched(true);
  };

  return (
    <Modal title="Add Useful Link" g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <SectionLabel g={g}>URL *</SectionLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input g={g} placeholder="https://…" value={url}
              onChange={e => { setUrl(e.target.value); setFetched(false); }}
              onBlur={() => { if (url.trim() && !title) deriveTitle(); }}
              style={{ flex: 1 }} />
            <button onClick={deriveTitle} disabled={!url.trim()} style={{
              padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: g.card, color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>↩ Title</button>
          </div>
        </div>
        <div>
          <SectionLabel g={g}>Title {fetched && <span style={{ color: g.accent, fontSize: 10 }}>✓ from URL</span>}</SectionLabel>
          <Input g={g} placeholder="Page title" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn g={g} size="lg" style={{ flex: 1 }}
            onClick={() => { if (!url.trim()) return; onSave({ id: uid(), url: url.trim(), title: title.trim() || titleFromUrl(url.trim()), createdAt: new Date().toISOString() }); }}>
            ＋ Add Link
          </Btn>
          <Btn g={g} variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── ADD CALENDAR ENTRY MODAL ──────────────────────────────────────────────────
// Types: reminder | borrow | payment

const ENTRY_TYPES = [
  { id: 'reminder', label: '🔔 Reminder', color: '#7b2fbe' },
  { id: 'borrow',   label: '📥 Borrow',   color: '#1565c0' },
  { id: 'payment',  label: '💸 Payment',  color: '#e8173a' },
];

function AddCalEntryModal({ g, onSave, onClose, initial = {}, selectedDate }) {
  const [form, setForm] = useState({
    type: 'reminder', title: '', date: selectedDate || TODAY(),
    time: '09:00', amount: '', currency: '₹', person: '',
    notes: '', repeat: 'none', done: false,
    ...initial,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={initial.id ? 'Edit Entry' : 'New Calendar Entry'} g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {ENTRY_TYPES.map(t => (
            <button key={t.id} onClick={() => set('type', t.id)} style={{
              flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: `1.5px solid ${form.type === t.id ? t.color : g.surfaceBorder}`,
              background: form.type === t.id ? t.color : 'rgba(255,255,255,0.7)',
              color: form.type === t.id ? '#fff' : g.text,
            }}>{t.label}</button>
          ))}
        </div>

        <Input g={g} placeholder="Title *" value={form.title}
          onChange={e => set('title', e.target.value)} autoFocus />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <SectionLabel g={g}>Date *</SectionLabel>
            <Input g={g} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <SectionLabel g={g}>Time</SectionLabel>
            <Input g={g} type="time" value={form.time} onChange={e => set('time', e.target.value)} />
          </div>
        </div>

        {/* Amount + person for borrow/payment */}
        {(form.type === 'borrow' || form.type === 'payment') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flexShrink: 0 }}>
              <SectionLabel g={g}>Currency</SectionLabel>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} style={{
                background: 'rgba(255,255,255,0.85)', border: `1.5px solid ${g.surfaceBorder}`,
                borderRadius: 10, color: g.text, padding: '10px', fontSize: 13, outline: 'none', fontFamily: 'system-ui',
              }}>
                {['₹','$','€','£','¥'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <SectionLabel g={g}>Amount</SectionLabel>
              <Input g={g} type="number" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <SectionLabel g={g}>{form.type === 'borrow' ? 'From' : 'To'}</SectionLabel>
              <Input g={g} placeholder="Person/org" value={form.person} onChange={e => set('person', e.target.value)} />
            </div>
          </div>
        )}

        {/* Repeat */}
        <div>
          <SectionLabel g={g}>Repeat</SectionLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {['none','daily','weekly','monthly'].map(r => (
              <button key={r} onClick={() => set('repeat', r)} style={{
                flex: 1, padding: '6px 0', borderRadius: 999, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: `1.5px solid ${form.repeat === r ? g.card : g.surfaceBorder}`,
                background: form.repeat === r ? g.card : 'rgba(255,255,255,0.7)',
                color: form.repeat === r ? '#fff' : g.muted,
              }}>{r === 'none' ? 'Once' : r.charAt(0).toUpperCase() + r.slice(1)}</button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel g={g}>Notes</SectionLabel>
          <Textarea g={g} placeholder="Optional notes…" value={form.notes}
            onChange={e => set('notes', e.target.value)} style={{ minHeight: 50, resize: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn g={g} size="lg" style={{ flex: 1 }}
            onClick={() => form.title.trim() && form.date && onSave({ ...initial, ...form, id: initial.id || uid() })}>
            {initial.id ? 'Save Changes' : '＋ Add Entry'}
          </Btn>
          <Btn g={g} variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── GOALS SECTION ─────────────────────────────────────────────────────────────

function GoalsSection({ g, data, persist }) {
  const [editGoal, setEditGoal] = useState(null);
  const [expand,   setExpand]   = useState(null);

  const saveGoal = (goal) => {
    const goals = data.goals.find(x => x.id === goal.id)
      ? data.goals.map(x => x.id === goal.id ? goal : x)
      : [...data.goals, goal];
    persist({ ...data, goals });
    setEditGoal(null);
  };
  const deleteGoal = (id) => persist({ ...data, goals: data.goals.filter(x => x.id !== id) });
  const fmt = (n, cur) => { const num = Number(n); return num ? cur + num.toLocaleString('en-IN') : '—'; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel g={g}>🎯 Finance Goals</SectionLabel>
      {data.goals.length === 0 && (
        <Surface g={g} style={{ textAlign: 'center', padding: 24 }}>
          <Text muted g={g} size={13}>No goals yet — tap ＋ Add below.</Text>
        </Surface>
      )}
      {data.goals.map(goal => {
        const open = expand === goal.id;
        return (
          <Surface key={goal.id} g={g} style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${g.card}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎯</div>
              <div style={{ flex: 1 }} onClick={() => setExpand(open ? null : goal.id)}>
                <Text g={g} bold size={14}>{goal.title}</Text>
                {goal.target && <Text g={g} muted size={11} style={{ display: 'block', marginTop: 1 }}>Target: {fmt(goal.target, goal.currency || '₹')}</Text>}
              </div>
              <button onClick={() => setEditGoal(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 15, padding: 4 }}>✏️</button>
              <button onClick={() => deleteGoal(goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 16, padding: 4 }}>🗑</button>
            </div>
            {open && goal.notes && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${g.surfaceBorder}` }}>
                <Text g={g} muted size={12} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{goal.notes}</Text>
              </div>
            )}
          </Surface>
        );
      })}
      {editGoal && <AddGoalModal g={g} initial={editGoal} onSave={saveGoal} onClose={() => setEditGoal(null)} />}
    </div>
  );
}

// ── LINKS SECTION ─────────────────────────────────────────────────────────────

function LinksSection({ g, data, persist }) {
  const deleteLink = (id) => persist({ ...data, links: data.links.filter(l => l.id !== id) });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel g={g}>🔗 Useful Links</SectionLabel>
      {(data.links || []).length === 0 && (
        <Surface g={g} style={{ textAlign: 'center', padding: 24 }}>
          <Text muted g={g} size={13}>No links yet — tap ＋ Add below.</Text>
        </Surface>
      )}
      {(data.links || []).map(link => (
        <Surface key={link.id} g={g} style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${g.card}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🔗</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text g={g} bold size={13}>{link.title}</Text>
              <a href={link.url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 11, color: g.accent, marginTop: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textDecoration: 'none' }}>{link.url}</a>
            </div>
            <button onClick={() => deleteLink(link.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 16, padding: 4, flexShrink: 0 }}>🗑</button>
          </div>
        </Surface>
      ))}
    </div>
  );
}

// ── CALENDAR SECTION ──────────────────────────────────────────────────────────

function CalendarSection({ g, data, persist, triggerAdd }) {
  const now      = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected,  setSelected]  = useState(TODAY());
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState(null);

  useEffect(() => { if (triggerAdd) setShowModal(true); }, [triggerAdd]);

  // Alarm checker — plays beep when reminder time hits
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const today = TODAY();
      (data.calEntries || []).forEach(e => {
        if (!e.done && e.type === 'reminder' && e.date === today && e.time === hhmm) {
          playBeep(localStorage.getItem('praxi:sound') || 'ding');
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [data.calEntries]);

  const daysInM  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const monthStr = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const entries  = data.calEntries || [];
  const byDate   = entries.reduce((acc, e) => { (acc[e.date] = acc[e.date] || []).push(e); return acc; }, {});

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); } else setViewMonth(m => m+1); };

  const saveEntry = (form) => {
    if (editItem) {
      persist({ ...data, calEntries: entries.map(e => e.id === editItem.id ? { ...e, ...form } : e) });
      setEditItem(null);
    } else {
      persist({ ...data, calEntries: [...entries, { ...form, createdAt: new Date().toISOString() }] });
      setShowModal(false);
    }
    setSelected(form.date);
  };
  const deleteEntry = (id) => persist({ ...data, calEntries: entries.filter(e => e.id !== id) });
  const toggleDone  = (id) => persist({ ...data, calEntries: entries.map(e => e.id === id ? { ...e, done: !e.done } : e) });

  const fmtDate   = (dk) => isoToDate(dk).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const typeColor = (type) => ENTRY_TYPES.find(t => t.id === type)?.color || g.card;
  const typeLabel = (type) => ENTRY_TYPES.find(t => t.id === type)?.label || type;

  const selEntries = byDate[selected] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Month calendar */}
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
            const isToday = dk === TODAY(), isSel = dk === selected;
            const dayEntries = byDate[dk] || [];
            const dots = [...new Set(dayEntries.map(e => typeColor(e.type)))].slice(0, 3);
            return (
              <button key={dk} onClick={() => setSelected(dk)} style={{
                aspectRatio: '1', borderRadius: 10, position: 'relative', cursor: 'pointer',
                border: isSel ? `2px solid ${g.card}` : isToday ? `2px solid ${g.accent}` : '2px solid transparent',
                background: isSel ? g.card : 'rgba(255,255,255,0.6)',
                color: isSel ? '#fff' : g.text,
                fontSize: 12, fontWeight: isToday ? 700 : 400, transition: 'all .15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                padding: '2px 0',
              }}>
                <span>{d}</span>
                {dots.length > 0 && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    {dots.map((c, i) => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? '#fff' : c }} />)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Surface>

      {/* Selected day entries */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text g={g} bold size={13}>{fmtDate(selected)}</Text>
        </div>

        {selEntries.length === 0 && (
          <Surface g={g} style={{ textAlign: 'center', padding: 20 }}>
            <Text muted g={g} size={13}>No entries — tap ＋ Add below.</Text>
          </Surface>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selEntries.map(e => (
            <Surface key={e.id} g={g} style={{ padding: '10px 14px', opacity: e.done ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Type indicator */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${typeColor(e.type)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {e.type === 'reminder' ? '🔔' : e.type === 'borrow' ? '📥' : '💸'}
                </div>
                <div style={{ flex: 1 }}>
                  <Text g={g} bold size={13} style={{ textDecoration: e.done ? 'line-through' : 'none' }}>{e.title}</Text>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text g={g} muted size={11}>{e.time}</Text>
                    {e.amount && <Text g={g} muted size={11}>{e.currency}{Number(e.amount).toLocaleString('en-IN')}</Text>}
                    {e.person && <Text g={g} muted size={11}>→ {e.person}</Text>}
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: `${typeColor(e.type)}18`, color: typeColor(e.type), fontWeight: 600 }}>{typeLabel(e.type)}</span>
                  </div>
                </div>
                {/* Mark done */}
                <button onClick={() => toggleDone(e.id)} style={{
                  width: 28, height: 28, borderRadius: '50%', border: `2px solid ${e.done ? g.card : g.surfaceBorder}`,
                  background: e.done ? g.card : 'transparent', color: '#fff', fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>✓</button>
                <button onClick={() => setEditItem(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 15, padding: 4 }}>✏️</button>
                <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 16, padding: 4 }}>🗑</button>
              </div>
              {e.notes && <Text g={g} muted size={11} style={{ display: 'block', marginTop: 6, paddingLeft: 46 }}>{e.notes}</Text>}
            </Surface>
          ))}
        </div>
      </div>

      {showModal && <AddCalEntryModal g={g} selectedDate={selected} onSave={saveEntry} onClose={() => setShowModal(false)} />}
      {editItem  && <AddCalEntryModal g={g} initial={editItem} selectedDate={selected} onSave={saveEntry} onClose={() => setEditItem(null)} />}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function Finance({ g, triggerAdd, onTriggerDone }) {
  const [tab,  setTab]  = useState('goals');
  const [data, setData] = useState(() => load());
  const [showAddGoal,   setShowAddGoal]   = useState(false);
  const [showAddLink,   setShowAddLink]   = useState(false);
  const [showAddCal,    setShowAddCal]    = useState(false);

  const persist = (next) => { setData(next); save(next); };

  const prevTrigger = useRef(false);
  if (triggerAdd && !prevTrigger.current) {
    prevTrigger.current = true;
    if (tab === 'links')    setShowAddLink(true);
    else if (tab === 'cal') setShowAddCal(true);
    else                    setShowAddGoal(true);
    onTriggerDone?.();
  }
  if (!triggerAdd) prevTrigger.current = false;

  const tabs = [
    { id: 'goals', label: '🎯 Goals'    },
    { id: 'links', label: '🔗 Links'    },
    { id: 'cal',   label: '📅 Calendar' },
  ];

  const saveGoal = (goal) => {
    const goals = data.goals.find(x => x.id === goal.id) ? data.goals.map(x => x.id === goal.id ? goal : x) : [...data.goals, goal];
    persist({ ...data, goals });
    setShowAddGoal(false);
  };
  const saveLink = (link) => { persist({ ...data, links: [...(data.links || []), link] }); setShowAddLink(false); };

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

      {tab === 'goals' && <GoalsSection g={g} data={data} persist={persist} />}
      {tab === 'links' && <LinksSection g={g} data={data} persist={persist} />}
      {tab === 'cal'   && <CalendarSection g={g} data={data} persist={persist} triggerAdd={showAddCal} />}

      {showAddGoal && <AddGoalModal g={g} onSave={saveGoal} onClose={() => setShowAddGoal(false)} />}
      {showAddLink && <AddLinkModal g={g} onSave={saveLink} onClose={() => setShowAddLink(false)} />}
    </div>
  );
}
