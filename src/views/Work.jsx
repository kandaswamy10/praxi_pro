// src/views/Work.jsx
import { useState, useRef, useEffect } from 'react';
import {
  Text, SectionLabel, Surface, GemCard, Tag, Btn,
  Input, Textarea, Select, Modal, UrgencyBar,
} from '../components/ui';
import { callAI, DEFAULT_AI_CONFIG } from '../ai/service';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

const TODAY = new Date();

function todayStr() { return TODAY.toISOString().split('T')[0]; }

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function eventStatus(event) {
  if (event.is_completed) return 'done';
  const now = Date.now();
  const [y, m, d] = event.date.split('-').map(Number);
  const [h = 23, min = 59] = (event.time || '23:59').split(':').map(Number);
  const eventMs = new Date(y, m - 1, d, h, min).getTime();
  if (eventMs < now) return 'overdue';
  if (eventMs - now < 24 * 60 * 60 * 1000) return 'soon';
  return 'ok';
}

const STATUS_COLORS = { overdue: '#c0392b', soon: '#e67e22', ok: '#27ae60', done: '#aaa' };
const STATUS_LABELS = { overdue: 'Overdue', soon: 'Today', ok: 'Upcoming', done: 'Done' };

const KANBAN_COLS = [
  { id: 'todo',       label: 'To Do',      icon: '○' },
  { id: 'inprogress', label: 'In Progress', icon: '◑' },
  { id: 'review',     label: 'Review',      icon: '◐' },
  { id: 'done',       label: 'Done',        icon: '●' },
];

const EVENT_TYPES = ['Meeting', 'Deadline', 'Task', 'Review', 'Reminder', 'Other'];

// ── ADD EVENT MODAL ───────────────────────────────────────────────────────────

function AddEventModal({ g, onSave, onClose, initial = {} }) {
  const [form, setForm] = useState({
    title: '', date: todayStr(), time: '', end_time: '',
    type: 'Meeting', status: 'todo', url: '',
    alarm_lead_min: 15, notes: '', tab: 'work',
    ...initial,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={initial.id ? 'Edit Event' : 'New Event'} g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Input g={g} placeholder="Event title *" value={form.title}
          onChange={e => set('title', e.target.value)} autoFocus />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><SectionLabel g={g}>Date *</SectionLabel>
            <Input g={g} type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
          <div><SectionLabel g={g}>Time</SectionLabel>
            <Input g={g} type="time" value={form.time} onChange={e => set('time', e.target.value)} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><SectionLabel g={g}>End Time</SectionLabel>
            <Input g={g} type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} /></div>
          <div><SectionLabel g={g}>Type</SectionLabel>
            <Select g={g} value={form.type} onChange={e => set('type', e.target.value)}>
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select></div>
        </div>

        <div>
          <SectionLabel g={g}>Board Column</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {KANBAN_COLS.map(col => (
              <button key={col.id} onClick={() => set('status', col.id)} style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                background: form.status === col.id ? g.card : 'rgba(255,255,255,0.8)',
                color: form.status === col.id ? '#fff' : g.muted,
                border: `1.5px solid ${form.status === col.id ? g.card : g.surfaceBorder}`,
                fontWeight: 600,
              }}>{col.icon} {col.label}</button>
            ))}
          </div>
        </div>

        <div><SectionLabel g={g}>Meeting URL</SectionLabel>
          <Input g={g} placeholder="https://meet.google.com/…" value={form.url}
            onChange={e => set('url', e.target.value)} /></div>

        <div><SectionLabel g={g}>Alarm</SectionLabel>
          <Select g={g} value={form.alarm_lead_min} onChange={e => set('alarm_lead_min', Number(e.target.value))}>
            {[0,5,10,15,20,30,45,60,90,120].map(m => (
              <option key={m} value={m}>{m === 0 ? 'No alarm' : `${m} min before`}</option>
            ))}
          </Select></div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn g={g} size="lg" onClick={() => { if (form.title.trim() && form.date) onSave(form); }} style={{ flex: 1 }}>
            {initial.id ? 'Save Changes' : '＋ Add Event'}
          </Btn>
          <Btn g={g} variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── EVENT CARD ────────────────────────────────────────────────────────────────

function EventCard({ event, g, onEdit, onDelete, onComplete, onAddNote, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const st = eventStatus(event);

  return (
    <UrgencyBar status={st === 'done' ? 'ok' : st} g={g}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <button onClick={() => onComplete(event.id, !event.is_completed)} style={{
          background: event.is_completed ? g.okBar : 'transparent',
          border: `2px solid ${event.is_completed ? g.okBar : g.surfaceBorder}`,
          borderRadius: 4, width: 18, height: 18, cursor: 'pointer', flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {event.is_completed && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text size={13} bold g={g} style={{
              textDecoration: event.is_completed ? 'line-through' : 'none',
              opacity: event.is_completed ? 0.6 : 1,
            }}>{event.title}</Text>
            <Tag label={event.type || 'Event'} g={g} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
            <Text size={11} muted g={g}>📅 {formatDate(event.date)}</Text>
            {event.time && <Text size={11} muted g={g}>🕐 {event.time}{event.end_time ? `–${event.end_time}` : ''}</Text>}
            <Text size={11} style={{ color: STATUS_COLORS[st], fontWeight: 600 }}>{STATUS_LABELS[st]}</Text>
          </div>
          {expanded && event.notes && (
            <Text size={12} muted g={g} style={{ marginTop: 6, display: 'block' }}>{event.notes}</Text>
          )}
        </div>

        <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
          {event.url && (
            <button onClick={() => window.open(event.url, '_blank')} style={{
              background: g.card, border: 'none', borderRadius: 6, padding: '3px 8px',
              color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600,
            }}>Join</button>
          )}
          <button onClick={() => onAddNote({ event_id: event.id, title: `Notes — ${event.title}`, content: '', tab: 'work' })}
            style={{ background: 'none', border: 'none', color: g.muted, fontSize: 14, cursor: 'pointer', padding: '0 2px' }}
            title="Add note">📝</button>
          {!compact && (
            <button onClick={() => setExpanded(v => !v)}
              style={{ background: 'none', border: 'none', color: g.muted, fontSize: 16, cursor: 'pointer', padding: '0 2px' }}>
              {expanded ? '▴' : '▾'}
            </button>
          )}
          <button onClick={() => onEdit(event)}
            style={{ background: 'none', border: 'none', color: g.muted, fontSize: 14, cursor: 'pointer', padding: '0 2px' }}>✏️</button>
          <button onClick={() => onDelete(event.id)}
            style={{ background: 'none', border: 'none', color: g.muted, fontSize: 14, cursor: 'pointer', padding: '0 2px' }}>🗑</button>
        </div>
      </div>
    </UrgencyBar>
  );
}

// ── CALENDAR GRID ─────────────────────────────────────────────────────────────

function CalendarGrid({ events, g, onDayPress }) {
  const [viewDate, setViewDate] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const eventMap = {};
  events.forEach(ev => {
    if (!ev.date) return;
    eventMap[ev.date] = eventMap[ev.date] || [];
    eventMap[ev.date].push(ev);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const td = todayStr();

  return (
    <Surface g={g} style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Btn g={g} variant="ghost" size="sm" onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</Btn>
        <Text size={14} bold g={g}>{monthLabel}</Text>
        <Btn g={g} variant="ghost" size="sm" onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: g.muted, fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const evs = eventMap[ds] || [];
          const isToday = ds === td;
          return (
            <button key={ds} onClick={() => onDayPress(ds, evs)} style={{
              background: isToday ? g.card : evs.length ? `${g.card}14` : 'transparent',
              border: `1px solid ${isToday ? g.card : evs.length ? `${g.card}33` : 'transparent'}`,
              borderRadius: 8, padding: '5px 2px', cursor: 'pointer', textAlign: 'center', minHeight: 36,
            }}>
              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : g.text }}>{d}</div>
              {evs.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {evs.slice(0,3).map((ev, idx) => (
                    <div key={idx} style={{ width: 5, height: 5, borderRadius: '50%',
                      background: isToday ? 'rgba(255,255,255,0.6)' : STATUS_COLORS[eventStatus(ev)] }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Surface>
  );
}

function DayEventsModal({ dateStr, dayEvents, g, onClose, onEdit, onDelete, onComplete, onAddNote }) {
  return (
    <Modal title={`${formatDate(dateStr)}`} g={g} onClose={onClose}>
      {dayEvents.length === 0
        ? <Text muted g={g} size={13}>No events on this day.</Text>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayEvents.map(ev => (
              <EventCard key={ev.id} event={ev} g={g}
                onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} onAddNote={onAddNote} compact />
            ))}
          </div>
      }
    </Modal>
  );
}

// ── TIMELINE ──────────────────────────────────────────────────────────────────

function Timeline({ events, g, onEdit, onDelete, onComplete, onAddNote }) {
  const sorted = [...events].sort((a, b) =>
    (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00'))
  );
  const byDate = {};
  sorted.forEach(ev => { (byDate[ev.date] = byDate[ev.date] || []).push(ev); });

  const td = todayStr();

  if (!sorted.length) return (
    <Surface g={g} style={{ textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
      <Text muted g={g} size={13}>No events yet. Tap ＋ to add one.</Text>
    </Surface>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(byDate).map(([date, evs]) => {
        const isToday = date === td, isPast = date < td;
        return (
          <div key={date}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%',
                background: isToday ? g.card : isPast ? g.muted : g.accent }} />
              <Text size={12} bold g={g} style={{ color: isToday ? g.card : isPast ? g.muted : g.accent }}>
                {isToday ? '📍 Today' : formatDate(date)}
              </Text>
              <div style={{ flex: 1, height: 1, background: g.surfaceBorder }} />
            </div>
            <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {evs.map(ev => (
                <EventCard key={ev.id} event={ev} g={g}
                  onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} onAddNote={onAddNote} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── KANBAN ────────────────────────────────────────────────────────────────────

function KanbanCard({ event, g, onEdit, onDelete, onComplete, onMove, onAddNote }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.85)', border: `1px solid ${g.surfaceBorder}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size={13} bold g={g} style={{
            display: 'block', textDecoration: event.is_completed ? 'line-through' : 'none',
            opacity: event.is_completed ? 0.5 : 1,
          }}>{event.title}</Text>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <Tag label={event.type || 'Task'} g={g} />
            {event.date && <Text size={10} muted g={g}>{formatDate(event.date)}</Text>}
            {event.time && <Text size={10} muted g={g}>{event.time}</Text>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {event.url && (
            <button onClick={() => window.open(event.url, '_blank')} style={{
              background: g.card, border: 'none', borderRadius: 5, padding: '2px 6px',
              color: '#fff', fontSize: 10, cursor: 'pointer',
            }}>🔗</button>
          )}
          <button onClick={() => onAddNote({ event_id: event.id, title: `Notes — ${event.title}`, content: '', tab: 'work' })}
            style={{ background: 'none', border: 'none', color: g.muted, cursor: 'pointer', fontSize: 13 }}>📝</button>
          <button onClick={() => onEdit(event)}
            style={{ background: 'none', border: 'none', color: g.muted, cursor: 'pointer', fontSize: 13 }}>✏️</button>
          <button onClick={() => onDelete(event.id)}
            style={{ background: 'none', border: 'none', color: g.muted, cursor: 'pointer', fontSize: 13 }}>🗑</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        {KANBAN_COLS.filter(c => c.id !== event.status).map(col => (
          <button key={col.id} onClick={() => onMove(event.id, col.id)} style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 999,
            background: `${g.card}14`, border: `1px solid ${g.surfaceBorder}`,
            color: g.muted, cursor: 'pointer',
          }}>→ {col.label}</button>
        ))}
        <button onClick={() => onComplete(event.id, !event.is_completed)} style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 999, marginLeft: 'auto',
          background: event.is_completed ? `${g.okBar}22` : `${g.card}14`,
          border: `1px solid ${event.is_completed ? g.okBar : g.surfaceBorder}`,
          color: event.is_completed ? g.okBar : g.muted, cursor: 'pointer',
        }}>{event.is_completed ? '✓ Done' : '○ Mark done'}</button>
      </div>
    </div>
  );
}

function KanbanBoard({ events, g, onEdit, onDelete, onComplete, onUpdateEvent, onAddNote }) {
  const handleMove = (id, newStatus) =>
    onUpdateEvent(id, { status: newStatus, is_completed: newStatus === 'done' });

  if (!events.length) return (
    <Surface g={g} style={{ textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
      <Text muted g={g} size={13}>No events yet. Tap ＋ to add one.</Text>
    </Surface>
  );

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
      {KANBAN_COLS.map(col => {
        const colEvs = events.filter(ev => (ev.status || 'todo') === col.id);
        return (
          <div key={col.id} style={{
            minWidth: 200, flexShrink: 0, background: `${g.card}08`,
            border: `1px solid ${g.surfaceBorder}`, borderRadius: 14, padding: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>{col.icon}</span>
              <Text size={12} bold g={g}>{col.label}</Text>
              <span style={{ marginLeft: 'auto', background: `${g.card}18`,
                borderRadius: 999, padding: '1px 7px', fontSize: 11, color: g.muted }}>{colEvs.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {colEvs.map(ev => (
                <KanbanCard key={ev.id} event={ev} g={g}
                  onEdit={onEdit} onDelete={onDelete} onComplete={onComplete}
                  onMove={handleMove} onAddNote={onAddNote} />
              ))}
              {colEvs.length === 0 && (
                <div style={{ border: `1.5px dashed ${g.surfaceBorder}`,
                  borderRadius: 8, padding: '16px 8px', textAlign: 'center' }}>
                  <Text size={11} muted g={g}>Empty</Text>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── STATS STRIP ───────────────────────────────────────────────────────────────

function StatsStrip({ events, g }) {
  const td = todayStr();
  const stats = [
    { label: 'Today',    value: events.filter(e => e.date === td).length,                            color: g.card    },
    { label: 'Upcoming', value: events.filter(e => !e.is_completed && e.date >= td).length,          color: g.accent  },
    { label: 'Overdue',  value: events.filter(e => !e.is_completed && eventStatus(e) === 'overdue').length, color: g.urgentBar },
    { label: 'Done',     value: events.filter(e => e.is_completed).length,                           color: g.okBar   },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: `${g.card}10`, border: `1px solid ${g.surfaceBorder}`,
          borderRadius: 12, padding: '10px 8px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
          <Text size={10} muted g={g}>{s.label}</Text>
        </div>
      ))}
    </div>
  );
}

// ── MEETING NOTE MODAL ────────────────────────────────────────────────────────
// Handles: type/paste, pen (contenteditable canvas), voice-to-text + AI cleanup

// ── UNIFIED NOTE SURFACE ─────────────────────────────────────────────────────
// One contenteditable div. A transparent canvas overlay sits on top —
// pointerType "pen" (stylus) always draws; mouse/touch draws only in draw mode.
// Keyboard typing always goes to the text layer regardless of mode.

// ── DRAW CANVAS ──────────────────────────────────────────────────────────────
// Fixed 1400px tall canvas inside a scrollable container — bitmap never resizes.

function DrawCanvas({ g, canvasRef }) {
  const isDrawing = useRef(false);
  const lastPt    = useRef(null);
  const ctxRef    = useRef(null);
  const [penColor, setPenColor] = useState('#1a1a2e');
  const [penSize,  setPenSize]  = useState(2.5);
  const CANVAS_H = 1400;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width) || 600;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = penColor;
    ctx.lineWidth   = penSize;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctxRef.current  = ctx;
  }, []);

  useEffect(() => {
    if (!ctxRef.current) return;
    ctxRef.current.strokeStyle = penColor;
    ctxRef.current.lineWidth   = penSize;
  }, [penColor, penSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e) => {
      e.preventDefault();
      isDrawing.current = true;
      lastPt.current = getPos(e);
      ctxRef.current?.beginPath();
      ctxRef.current?.moveTo(lastPt.current.x, lastPt.current.y);
    };
    const onMove = (e) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const pt = getPos(e);
      ctxRef.current?.lineTo(pt.x, pt.y);
      ctxRef.current?.stroke();
      lastPt.current = pt;
    };
    const onUp = () => { isDrawing.current = false; };
    canvas.addEventListener('pointerdown',  onDown);
    canvas.addEventListener('pointermove',  onMove);
    canvas.addEventListener('pointerup',    onUp);
    canvas.addEventListener('pointerleave', onUp);
    return () => {
      canvas.removeEventListener('pointerdown',  onDown);
      canvas.removeEventListener('pointermove',  onMove);
      canvas.removeEventListener('pointerup',    onUp);
      canvas.removeEventListener('pointerleave', onUp);
    };
  }, [penColor, penSize]);

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (c && ctxRef.current) ctxRef.current.clearRect(0, 0, c.width, c.height);
  };

  const linesBg = `repeating-linear-gradient(transparent, transparent 27px, ${g.surfaceBorder}55 28px)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: `${g.card}10`, borderBottom: `1px solid ${g.surfaceBorder}`,
        flexShrink: 0,
      }}>
        {['#1a1a2e','#e74c3c','#2980b9','#27ae60','#8e44ad','#f39c12'].map(c => (
          <button key={c} onClick={() => setPenColor(c)} style={{
            width: 20, height: 20, borderRadius: '50%', background: c,
            border: 'none', cursor: 'pointer', flexShrink: 0,
            outline: penColor === c ? `3px solid ${g.card}` : '2px solid transparent',
            outlineOffset: 2,
          }} />
        ))}
        <select value={penSize} onChange={e => setPenSize(Number(e.target.value))} style={{
          fontSize: 12, border: `1px solid ${g.surfaceBorder}`, borderRadius: 6,
          padding: '3px 6px', background: 'white', color: g.text, marginLeft: 4,
        }}>
          <option value={1}>Fine</option>
          <option value={2.5}>Normal</option>
          <option value={5}>Thick</option>
          <option value={10}>Marker</option>
        </select>
        <button onClick={clearCanvas} style={{
          marginLeft: 'auto', fontSize: 12, padding: '4px 12px',
          border: `1px solid ${g.surfaceBorder}`, borderRadius: 6,
          background: 'white', color: g.muted, cursor: 'pointer',
        }}>Clear</button>
      </div>

      {/* Scrollable canvas area */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        background: 'white',
        backgroundImage: linesBg,
        backgroundSize: '100% 28px',
        backgroundPositionY: '4px',
      }}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: `${CANVAS_H}px`,
            touchAction: 'none',
            cursor: 'crosshair',
          }}
        />
      </div>
    </div>
  );
}

// ── TEXT + VOICE AREA ─────────────────────────────────────────────────────────

function TextVoiceArea({ g, value, onChange, aiConfig }) {
  const [recording, setRecording] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState('');
  const recRef   = useRef(null);
  const finalRef = useRef(value);

  useEffect(() => { finalRef.current = value; }, [value]);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setAiError('Voice not supported — try Chrome.'); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true;
    let final = finalRef.current;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += (final ? '\n' : '') + t;
        else interim = t;
      }
      onChange(final + (interim ? ` [${interim}]` : ''));
    };
    rec.onend   = () => { setRecording(false); onChange(final); finalRef.current = final; };
    rec.onerror = (e) => { setAiError(`Mic: ${e.error}`); setRecording(false); };
    rec.start(); recRef.current = rec; setRecording(true);
  };
  const stopVoice = () => { recRef.current?.stop(); setRecording(false); };

  const cleanWithAI = async () => {
    if (!value.trim()) return;
    setAiLoading(true); setAiError('');
    try {
      const result = await callAI('chat', value,
        'You are a meeting notes assistant. Clean up and structure the following raw notes. Fix grammar, remove filler words, organise into clear bullet points with headings. Keep it concise. Return only the cleaned notes, no preamble.',
        aiConfig || DEFAULT_AI_CONFIG);
      onChange(result.trim());
    } catch { setAiError('AI unavailable — notes saved as-is.'); }
    finally { setAiLoading(false); }
  };

  const linesBg = `repeating-linear-gradient(transparent, transparent 27px, ${g.surfaceBorder}55 28px)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Mic toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: recording ? `${g.urgentBar}10` : `${g.card}10`,
        borderBottom: `1px solid ${g.surfaceBorder}`,
        flexShrink: 0, transition: 'background .2s',
      }}>
        <button onClick={recording ? stopVoice : startVoice} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: recording ? g.urgentBar : g.card,
          border: 'none', borderRadius: 8, padding: '6px 14px',
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'all .15s',
        }}>
          🎤 {recording ? 'Stop' : 'Dictate'}
        </button>

        {recording && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            {[12,18,10,16,8,14].map((h,i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2, background: g.urgentBar,
                height: h, opacity: 0.7,
              }} />
            ))}
            <span style={{ fontSize: 11, color: g.urgentBar, marginLeft: 4 }}>Listening…</span>
          </div>
        )}

        {value.trim().length > 20 && !recording && (
          <button onClick={cleanWithAI} disabled={aiLoading} style={{
            marginLeft: 'auto',
            background: `${g.card}14`, border: `1.5px solid ${g.surfaceBorder}`,
            borderRadius: 8, padding: '5px 12px', cursor: aiLoading ? 'wait' : 'pointer',
            fontSize: 12, color: g.card, fontWeight: 600,
          }}>{aiLoading ? '⏳ Cleaning…' : '✨ AI Clean'}</button>
        )}
      </div>

      {/* Text area — scrolls freely */}
      <div style={{
        flex: 1, position: 'relative',
        background: 'rgba(255,255,255,0.96)',
        backgroundImage: linesBg,
        backgroundSize: '100% 28px',
        backgroundPositionY: '4px',
      }}>
        {!value && (
          <div style={{
            position: 'absolute', top: 12, left: 14, pointerEvents: 'none',
            color: g.muted, fontSize: 13, lineHeight: '28px', userSelect: 'none',
          }}>
            {recording ? 'Listening… speak now' : 'Type, paste or dictate your notes…'}
          </div>
        )}
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            display: 'block', width: '100%', height: '100%', minHeight: 300,
            padding: '12px 14px', boxSizing: 'border-box',
            border: 'none', outline: 'none', resize: 'none',
            fontFamily: 'inherit', fontSize: 13, lineHeight: '28px',
            background: 'transparent', color: g.text,
          }}
        />
      </div>

      {aiError && (
        <div style={{ padding: '4px 12px', background: `${g.urgentBar}10` }}>
          <Text size={11} style={{ color: g.urgentBar }}>{aiError}</Text>
        </div>
      )}
    </div>
  );
}

// ── NOTE MODAL ────────────────────────────────────────────────────────────────

function NoteModal({ g, initial = {}, events, onSave, onClose, onDelete, aiConfig, startEditing = false }) {
  const isNew    = !initial.id;
  const [editing, setEditing] = useState(isNew || startEditing);
  const [title,   setTitle]   = useState(initial.title    || '');
  const [content, setContent] = useState(initial.content  || '');
  const [eventId, setEventId] = useState(initial.event_id || '');
  const [mode,    setMode]    = useState('text');
  const canvasRef = useRef(null);

  const workEvents = events.filter(e => !e.is_completed);
  const linkedEvent = workEvents.find(e => e.id === (eventId || initial.event_id));

  const handleSave = () => {
    if (!title.trim()) return;
    const drawDataUrl = canvasRef.current?.toDataURL?.() || null;
    onSave({ ...initial, title, content, draw_data: drawDataUrl, event_id: eventId || null, tab: 'work' });
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Delete this note?')) { onDelete(initial.id); onClose(); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        width: '100%', maxWidth: 680,
        background: g.pageBg || '#f0f4ff',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: g.card, flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
            padding: '4px 10px', color: '#fff', fontSize: 18, cursor: 'pointer',
          }}>←</button>

          {editing ? (
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Note title…" autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
              }} />
          ) : (
            <span style={{
              flex: 1, color: '#fff', fontSize: 16, fontWeight: 700,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{title || 'Untitled'}</span>
          )}

          {/* View mode actions */}
          {!editing && !isNew && (
            <>
              <button onClick={() => setEditing(true)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
                padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>Edit</button>
              <button onClick={handleDelete} style={{
                background: 'rgba(255,0,0,0.25)', border: 'none', borderRadius: 8,
                padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>Delete</button>
            </>
          )}

          {/* Edit mode actions */}
          {editing && (
            <>
              {!isNew && (
                <button onClick={() => { setTitle(initial.title || ''); setContent(initial.content || ''); setEditing(false); }} style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                  padding: '6px 12px', color: '#fff', fontSize: 12, cursor: 'pointer',
                }}>Cancel</button>
              )}
              <button onClick={handleSave} style={{
                background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8,
                padding: '6px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>Save</button>
            </>
          )}
        </div>

        {/* ── Subheader: linked event + mode tabs (edit only) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          background: `${g.card}18`,
          borderBottom: `1px solid ${g.surfaceBorder}`,
          flexShrink: 0, flexWrap: 'wrap',
        }}>
          {editing ? (
            <select value={eventId} onChange={e => setEventId(e.target.value)} style={{
              flex: 1, minWidth: 0, fontSize: 12, padding: '4px 8px',
              border: `1px solid ${g.surfaceBorder}`, borderRadius: 8,
              background: 'white', color: g.text, fontFamily: 'inherit',
            }}>
              <option value="">— Standalone note —</option>
              {workEvents.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title} · {formatDate(ev.date)}</option>
              ))}
            </select>
          ) : (
            <span style={{ flex: 1, fontSize: 12, color: g.muted }}>
              {linkedEvent ? `📅 ${linkedEvent.title} · ${formatDate(linkedEvent.date)}` : 'Standalone note'}
            </span>
          )}

          {/* Mode switcher — always visible */}
          <div style={{
            display: 'flex', borderRadius: 8, overflow: 'hidden',
            border: `1px solid ${g.surfaceBorder}`, flexShrink: 0,
          }}>
            {[{ id: 'text', label: '📝 Text' }, { id: 'draw', label: '✏️ Draw' }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: '5px 14px', border: 'none', cursor: 'pointer',
                background: mode === m.id ? g.card : 'white',
                color: mode === m.id ? '#fff' : g.muted,
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              }}>{m.label}</button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {mode === 'text' && (
            editing
              ? <TextVoiceArea g={g} value={content} onChange={setContent} aiConfig={aiConfig} />
              : <div style={{
                  flex: 1, overflowY: 'auto', padding: '16px',
                  background: 'rgba(255,255,255,0.96)',
                  backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, ${g.surfaceBorder}55 28px)`,
                  backgroundSize: '100% 28px', backgroundPositionY: '4px',
                }}>
                  {content
                    ? <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 13,
                        lineHeight: '28px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: g.text }}>
                        {content}
                      </pre>
                    : <span style={{ color: g.muted, fontSize: 13 }}>No text notes yet. Tap Edit to add.</span>
                  }
                </div>
          )}
          {mode === 'draw' && (
            <DrawCanvas g={g} canvasRef={canvasRef} readonly={!editing} />
          )}
        </div>

      </div>
    </div>
  );
}



// ── NOTES SECTION ─────────────────────────────────────────────────────────────

function NotesSection({ notes, events, g, onView, onDelete, onAdd }) {
  const [search, setSearch] = useState('');

  const sorted = [...notes]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase())
      || n.content.toLowerCase().includes(search.toLowerCase()));

  const getLinkedEvent = (eid) => events.find(e => e.id === eid);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <Text size={16} bold g={g}>Meeting Notes</Text>
          <Text size={11} muted g={g}>({notes.length})</Text>
        </div>
        <Btn g={g} size="sm" onClick={() => onAdd()}>＋ Note</Btn>
      </div>

      {notes.length > 3 && (
        <Input g={g} placeholder="Search notes…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ padding: '8px 12px' }} />
      )}

      {/* Fixed-height scroll container — 4 cards visible (~76px each) */}
      <div style={{
        height: sorted.length === 0 ? 'auto' : 310,
        overflowY: sorted.length === 0 ? 'visible' : 'auto',
        overflowX: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 8,
        paddingRight: sorted.length > 4 ? 2 : 0,
      }}>
        {sorted.length === 0 && (
          <Surface g={g} style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📝</div>
            <Text muted g={g} size={13}>No notes yet. Tap ＋ or the 📝 icon on an event.</Text>
          </Surface>
        )}

        {sorted.map(note => {
          const linked = note.event_id ? getLinkedEvent(note.event_id) : null;
          return (
            <div key={note.id} style={{
              display: 'flex', alignItems: 'stretch', flexShrink: 0,
              background: 'rgba(255,255,255,0.85)',
              border: `1px solid ${g.surfaceBorder}`,
              borderRadius: 12, overflow: 'hidden',
            }}>
              {/* Tap area — left side, opens view */}
              <button onClick={() => onView(note)} style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 14px', textAlign: 'left', minWidth: 0,
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: g.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {note.title || 'Untitled'}
                </div>
                {linked && (
                  <div style={{ marginTop: 2 }}>
                    <Tag label={`📅 ${linked.title}`} g={g} />
                  </div>
                )}
                <div style={{ marginTop: 3, fontSize: 10, color: g.muted }}>
                  {formatDateTime(note.updated_at || note.created_at)}
                </div>
              </button>

              {/* Delete — right side only */}
              <button onClick={() => { if (confirm('Delete this note?')) onDelete(note.id); }} style={{
                flexShrink: 0, width: 44, background: 'rgba(220,53,69,0.07)',
                border: 'none', borderLeft: `1px solid ${g.surfaceBorder}`,
                cursor: 'pointer', color: '#dc3545', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>🗑</button>
            </div>
          );
        })}
      </div>

      {sorted.length > 4 && (
        <Text size={11} muted g={g} style={{ textAlign: 'center' }}>
          ↕ Scroll to see all {sorted.length} notes
        </Text>
      )}
    </div>
  );
}

// ── MAIN WORK VIEW ────────────────────────────────────────────────────────────

const VIEWS = [
  { id: 'timeline', label: 'Agenda',   icon: '📋' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'kanban',   label: 'Board',    icon: '🗂️' },
];

export default function Work({
  events, meetingNotes, g, aiConfig,
  onAddEvent, onUpdateEvent, onDeleteEvent,
  onAddNote, onUpdateNote, onDeleteNote,
  triggerAddEvent, onAddEventDone,
}) {
  const [view, setView]           = useState('timeline');
  const [showAdd, setShowAdd]     = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [calDay, setCalDay]       = useState(null);
  const [filter, setFilter]       = useState('all');

  // Bottom bar + triggers add event modal
  useEffect(() => {
    if (triggerAddEvent) { setShowAdd(true); onAddEventDone?.(); }
  }, [triggerAddEvent]);

  const td = todayStr();

  const filteredEvents = events.filter(ev => {
    if (filter === 'today')    return ev.date === td;
    if (filter === 'upcoming') return !ev.is_completed && ev.date >= td;
    if (filter === 'overdue')  return !ev.is_completed && eventStatus(ev) === 'overdue';
    return true;
  });

  const handleSaveEvent = async (form) => {
    if (editEvent) { await onUpdateEvent(editEvent.id, form); setEditEvent(null); }
    else           { await onAddEvent(form); setShowAdd(false); }
  };

  const handleComplete = (id, val) =>
    onUpdateEvent(id, { is_completed: val, status: val ? 'done' : 'inprogress' });

  const handleDelete = (id) => { if (confirm('Delete this event?')) onDeleteEvent(id); };

  const handleSaveNote = async (form) => {
    if (form.id) await onUpdateNote(form.id, form);
    else         await onAddNote(form);
    setNoteModal(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div>
        <Text size={24} bold g={g}>Work </Text>
        <Text size={24} italic color={g.accent}>Space</Text>
      </div>

      {/* Stats */}
      <StatsStrip events={events} g={g} />

      {/* View switcher */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
            background: view === v.id ? g.card : 'rgba(255,255,255,0.7)',
            color: view === v.id ? '#fff' : g.muted,
            border: `1.5px solid ${view === v.id ? g.card : g.surfaceBorder}`,
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          }}>{v.icon} {v.label}</button>
        ))}

      </div>

      {/* Filter pills (timeline only) */}
      {view === 'timeline' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'today', label: '📍 Today' },
            { id: 'upcoming', label: '📆 Upcoming' },
            { id: 'overdue', label: '🔴 Overdue' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer',
              background: filter === f.id ? `${g.card}22` : 'transparent',
              color: filter === f.id ? g.text : g.muted,
              border: `1px solid ${filter === f.id ? g.card : g.surfaceBorder}`,
              fontWeight: filter === f.id ? 600 : 400,
            }}>{f.label}</button>
          ))}
        </div>
      )}

      {/* Main event view */}
      {view === 'timeline' && (
        <Timeline events={filteredEvents} g={g}
          onEdit={setEditEvent} onDelete={handleDelete}
          onComplete={handleComplete} onAddNote={setNoteModal} />
      )}
      {view === 'calendar' && (
        <CalendarGrid events={events} g={g}
          onDayPress={(ds, evs) => setCalDay({ dateStr: ds, dayEvents: evs })} />
      )}
      {view === 'kanban' && (
        <KanbanBoard events={events} g={g}
          onEdit={setEditEvent} onDelete={handleDelete}
          onComplete={handleComplete} onUpdateEvent={onUpdateEvent} onAddNote={setNoteModal} />
      )}

      {/* ── Meeting Notes section ── */}
      <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1.5px solid ${g.surfaceBorder}` }}>
        <NotesSection
          notes={meetingNotes || []}
          events={events}
          g={g}
          onView={setNoteModal}
          onDelete={onDeleteNote}
          onAdd={() => setNoteModal({ title: '', content: '', tab: 'work' })}
        />
      </div>

      {/* Modals */}
      {showAdd && <AddEventModal g={g} onSave={handleSaveEvent} onClose={() => setShowAdd(false)} />}
      {editEvent && <AddEventModal g={g} initial={editEvent} onSave={handleSaveEvent} onClose={() => setEditEvent(null)} />}
      {noteModal !== null && (
        <NoteModal g={g} initial={noteModal} events={events}
          onSave={handleSaveNote} onClose={() => setNoteModal(null)}
          onDelete={onDeleteNote} aiConfig={aiConfig}
          startEditing={!noteModal.id} />
      )}
      {calDay && (
        <DayEventsModal dateStr={calDay.dateStr} dayEvents={calDay.dayEvents} g={g}
          onClose={() => setCalDay(null)}
          onEdit={(ev) => { setCalDay(null); setEditEvent(ev); }}
          onDelete={handleDelete} onComplete={handleComplete} onAddNote={setNoteModal} />
      )}
    </div>
  );
}
