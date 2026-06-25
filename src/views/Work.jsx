// src/views/Work.jsx
import { useState, useRef } from 'react';
import {
  Text, SectionLabel, Surface, GemCard, Tag, Btn,
  Input, Textarea, Select, Modal, UrgencyBar, LinkGroupWidget,
} from '../components/ui';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

const TODAY = new Date();
const todayStr = () => TODAY.toISOString().split('T')[0];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  { id: 'todo',       label: 'To Do',       icon: '○' },
  { id: 'inprogress', label: 'In Progress',  icon: '◑' },
  { id: 'review',     label: 'Review',       icon: '◐' },
  { id: 'done',       label: 'Done',         icon: '●' },
];

const EVENT_TYPES = ['Meeting', 'Deadline', 'Task', 'Review', 'Reminder', 'Other'];

// ── ADD EVENT MODAL ───────────────────────────────────────────────────────────

function AddEventModal({ g, onSave, onClose, initial = {} }) {
  const [form, setForm] = useState({
    title: '',
    date: todayStr(),
    time: '',
    end_time: '',
    type: 'Meeting',
    status: 'todo',
    url: '',
    alarm_lead_min: 15,
    notes: '',
    ...initial,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.title.trim() || !form.date) return;
    onSave(form);
  };

  return (
    <Modal title={initial.id ? 'Edit Event' : 'New Event'} g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Input g={g} placeholder="Event title *" value={form.title}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <SectionLabel g={g}>End Time</SectionLabel>
            <Input g={g} type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
          </div>
          <div>
            <SectionLabel g={g}>Type</SectionLabel>
            <Select g={g} value={form.type} onChange={e => set('type', e.target.value)}>
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <SectionLabel g={g}>Kanban Column</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {KANBAN_COLS.map(col => (
              <button key={col.id} onClick={() => set('status', col.id)}
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                  background: form.status === col.id ? g.card : 'rgba(255,255,255,0.8)',
                  color: form.status === col.id ? '#fff' : g.muted,
                  border: `1.5px solid ${form.status === col.id ? g.card : g.surfaceBorder}`,
                  fontWeight: 600,
                }}>
                {col.icon} {col.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel g={g}>Meeting URL</SectionLabel>
          <Input g={g} placeholder="https://meet.google.com/..." value={form.url}
            onChange={e => set('url', e.target.value)} />
        </div>

        <div>
          <SectionLabel g={g}>Alarm (minutes before)</SectionLabel>
          <Select g={g} value={form.alarm_lead_min} onChange={e => set('alarm_lead_min', Number(e.target.value))}>
            {[0, 5, 10, 15, 20, 30, 45, 60, 90, 120].map(m => (
              <option key={m} value={m}>{m === 0 ? 'No alarm' : `${m} min before`}</option>
            ))}
          </Select>
        </div>

        <div>
          <SectionLabel g={g}>Notes</SectionLabel>
          <Textarea g={g} placeholder="Notes, agenda, context…" value={form.notes}
            onChange={e => set('notes', e.target.value)} style={{ minHeight: 60 }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn g={g} size="lg" onClick={save} style={{ flex: 1 }}>
            {initial.id ? 'Save Changes' : '＋ Add Event'}
          </Btn>
          <Btn g={g} variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── EVENT CARD (shared) ───────────────────────────────────────────────────────

function EventCard({ event, g, onEdit, onDelete, onComplete, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const st = eventStatus(event);

  return (
    <UrgencyBar status={st === 'done' ? 'ok' : st} g={g}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Checkbox */}
        <button onClick={() => onComplete(event.id, !event.is_completed)}
          style={{
            background: event.is_completed ? g.okBar : 'transparent',
            border: `2px solid ${event.is_completed ? g.okBar : g.surfaceBorder}`,
            borderRadius: 4, width: 18, height: 18, cursor: 'pointer', flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {event.is_completed && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
        </button>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text size={13} bold g={g}
              style={{ textDecoration: event.is_completed ? 'line-through' : 'none', opacity: event.is_completed ? 0.6 : 1 }}>
              {event.title}
            </Text>
            <Tag label={event.type || 'Event'} g={g} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
            <Text size={11} muted g={g}>📅 {formatDate(event.date)}</Text>
            {event.time && <Text size={11} muted g={g}>🕐 {event.time}{event.end_time ? `–${event.end_time}` : ''}</Text>}
            {!compact && <Text size={11} style={{ color: STATUS_COLORS[st], fontWeight: 600 }}>
              {STATUS_LABELS[st]}
            </Text>}
          </div>

          {!compact && expanded && event.notes && (
            <Text size={12} muted g={g} style={{ marginTop: 6, display: 'block' }}>{event.notes}</Text>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {event.url && (
            <button onClick={() => window.open(event.url, '_blank')}
              style={{ background: g.card, border: 'none', borderRadius: 6, padding: '3px 8px',
                color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
              Join
            </button>
          )}
          {!compact && (
            <button onClick={() => setExpanded(v => !v)}
              style={{ background: 'none', border: 'none', color: g.muted, fontSize: 16, cursor: 'pointer', padding: '0 2px' }}>
              {expanded ? '▴' : '▾'}
            </button>
          )}
          <button onClick={() => onEdit(event)}
            style={{ background: 'none', border: 'none', color: g.muted, fontSize: 14, cursor: 'pointer', padding: '0 2px' }}>
            ✏️
          </button>
          <button onClick={() => onDelete(event.id)}
            style={{ background: 'none', border: 'none', color: g.muted, fontSize: 14, cursor: 'pointer', padding: '0 2px' }}>
            🗑
          </button>
        </div>
      </div>
    </UrgencyBar>
  );
}

// ── CALENDAR GRID VIEW ────────────────────────────────────────────────────────

function CalendarGrid({ events, g, onDayPress }) {
  const [viewDate, setViewDate] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();       // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Build event map: "YYYY-MM-DD" → count
  const eventMap = {};
  events.forEach(ev => {
    if (!ev.date) return;
    const key = ev.date;
    eventMap[key] = (eventMap[key] || []);
    eventMap[key].push(ev);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayDateStr = TODAY.toISOString().split('T')[0];

  return (
    <Surface g={g} style={{ padding: 12 }}>
      {/* Header nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Btn g={g} variant="ghost" size="sm"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</Btn>
        <Text size={14} bold g={g}>{monthLabel}</Text>
        <Btn g={g} variant="ghost" size="sm"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</Btn>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: g.muted, fontWeight: 600, padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayEvents = eventMap[dateStr] || [];
          const isToday = dateStr === todayDateStr;
          const hasEvents = dayEvents.length > 0;

          return (
            <button key={dateStr} onClick={() => onDayPress(dateStr, dayEvents)}
              style={{
                background: isToday ? g.card : hasEvents ? `${g.card}14` : 'transparent',
                border: `1px solid ${isToday ? g.card : hasEvents ? `${g.card}33` : 'transparent'}`,
                borderRadius: 8, padding: '5px 2px', cursor: 'pointer',
                textAlign: 'center', minHeight: 36,
              }}>
              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : g.text }}>
                {d}
              </div>
              {hasEvents && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2, flexWrap: 'wrap' }}>
                  {dayEvents.slice(0, 3).map((ev, idx) => (
                    <div key={idx} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: isToday ? 'rgba(255,255,255,0.6)' : STATUS_COLORS[eventStatus(ev)],
                    }} />
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

// Day detail popup
function DayEventsModal({ dateStr, dayEvents, g, onClose, onEdit, onDelete, onComplete }) {
  return (
    <Modal title={`Events — ${formatDate(dateStr)}`} g={g} onClose={onClose}>
      {dayEvents.length === 0
        ? <Text muted g={g} size={13}>No events on this day.</Text>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayEvents.map(ev => (
              <EventCard key={ev.id} event={ev} g={g}
                onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} compact />
            ))}
          </div>
        )}
    </Modal>
  );
}

// ── TIMELINE / AGENDA ─────────────────────────────────────────────────────────

function Timeline({ events, g, onEdit, onDelete, onComplete }) {
  const sorted = [...events].sort((a, b) => {
    const da = a.date + (a.time || '00:00');
    const db = b.date + (b.time || '00:00');
    return da.localeCompare(db);
  });

  // Group by date
  const byDate = {};
  sorted.forEach(ev => {
    if (!byDate[ev.date]) byDate[ev.date] = [];
    byDate[ev.date].push(ev);
  });

  if (!sorted.length) {
    return (
      <Surface g={g} style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
        <Text muted g={g} size={13}>No events yet. Add one to get started.</Text>
      </Surface>
    );
  }

  const todayDateStr2 = TODAY.toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(byDate).map(([date, evs]) => {
        const isToday = date === todayDateStr2;
        const isPast  = date < todayDateStr2;
        return (
          <div key={date}>
            {/* Date header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%',
                background: isToday ? g.card : isPast ? g.muted : g.accent }} />
              <Text size={12} bold g={g} style={{ color: isToday ? g.card : isPast ? g.muted : g.accent }}>
                {isToday ? '📍 Today' : formatDate(date)}
              </Text>
              <div style={{ flex: 1, height: 1, background: g.surfaceBorder }} />
            </div>

            {/* Events */}
            <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {evs.map(ev => (
                <EventCard key={ev.id} event={ev} g={g}
                  onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── KANBAN BOARD ──────────────────────────────────────────────────────────────

function KanbanCard({ event, g, onEdit, onDelete, onComplete, onMove }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.85)',
      border: `1px solid ${g.surfaceBorder}`,
      borderRadius: 10, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size={13} bold g={g}
            style={{ display: 'block', textDecoration: event.is_completed ? 'line-through' : 'none', opacity: event.is_completed ? 0.5 : 1 }}>
            {event.title}
          </Text>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <Tag label={event.type || 'Task'} g={g} />
            {event.date && <Text size={10} muted g={g}>{formatDate(event.date)}</Text>}
            {event.time && <Text size={10} muted g={g}>{event.time}</Text>}
          </div>
          {event.notes && (
            <Text size={11} muted g={g} style={{ marginTop: 4, display: 'block',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {event.notes}
            </Text>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {event.url && (
            <button onClick={() => window.open(event.url, '_blank')}
              style={{ background: g.card, border: 'none', borderRadius: 5, padding: '2px 6px',
                color: '#fff', fontSize: 10, cursor: 'pointer' }}>
              🔗
            </button>
          )}
          <button onClick={() => onEdit(event)}
            style={{ background: 'none', border: 'none', color: g.muted, cursor: 'pointer', fontSize: 13, padding: '0 1px' }}>
            ✏️
          </button>
          <button onClick={() => onDelete(event.id)}
            style={{ background: 'none', border: 'none', color: g.muted, cursor: 'pointer', fontSize: 13, padding: '0 1px' }}>
            🗑
          </button>
        </div>
      </div>

      {/* Move buttons */}
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {KANBAN_COLS.map(col => col.id !== event.status && (
          <button key={col.id} onClick={() => onMove(event.id, col.id)}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999,
              background: `${g.card}14`, border: `1px solid ${g.surfaceBorder}`,
              color: g.muted, cursor: 'pointer' }}>
            → {col.label}
          </button>
        ))}
        <button onClick={() => onComplete(event.id, !event.is_completed)}
          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, marginLeft: 'auto',
            background: event.is_completed ? `${g.okBar}22` : `${g.card}14`,
            border: `1px solid ${event.is_completed ? g.okBar : g.surfaceBorder}`,
            color: event.is_completed ? g.okBar : g.muted, cursor: 'pointer' }}>
          {event.is_completed ? '✓ Done' : '○ Mark done'}
        </button>
      </div>
    </div>
  );
}

function KanbanBoard({ events, g, onEdit, onDelete, onComplete, onUpdateEvent }) {
  const handleMove = (id, newStatus) => {
    onUpdateEvent(id, { status: newStatus, is_completed: newStatus === 'done' });
  };

  if (!events.length) {
    return (
      <Surface g={g} style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <Text muted g={g} size={13}>No events yet. Add one to get started.</Text>
      </Surface>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
      {KANBAN_COLS.map(col => {
        const colEvents = events.filter(ev => (ev.status || 'todo') === col.id);
        return (
          <div key={col.id} style={{
            minWidth: 200, flexShrink: 0,
            background: `${g.card}08`,
            border: `1px solid ${g.surfaceBorder}`,
            borderRadius: 14, padding: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>{col.icon}</span>
              <Text size={12} bold g={g}>{col.label}</Text>
              <span style={{
                marginLeft: 'auto', background: `${g.card}18`,
                borderRadius: 999, padding: '1px 7px', fontSize: 11, color: g.muted,
              }}>{colEvents.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {colEvents.map(ev => (
                <KanbanCard key={ev.id} event={ev} g={g}
                  onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} onMove={handleMove} />
              ))}
              {colEvents.length === 0 && (
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
  const today = TODAY.toISOString().split('T')[0];
  const todayCount    = events.filter(e => e.date === today).length;
  const overdueCount  = events.filter(e => !e.is_completed && eventStatus(e) === 'overdue').length;
  const completedCount = events.filter(e => e.is_completed).length;
  const upcoming      = events.filter(e => !e.is_completed && e.date >= today).length;

  const stats = [
    { label: 'Today',    value: todayCount,    color: g.card },
    { label: 'Upcoming', value: upcoming,       color: g.accent },
    { label: 'Overdue',  value: overdueCount,   color: overdueCount > 0 ? g.urgentBar : g.okBar },
    { label: 'Done',     value: completedCount, color: g.okBar },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {stats.map(s => (
        <GemCard key={s.label} g={g} style={{ padding: '10px 8px', textAlign: 'center', background: `${g.card}14`, border: `1px solid ${g.surfaceBorder}` }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
          <Text size={10} muted g={g}>{s.label}</Text>
        </GemCard>
      ))}
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
  events, linkGroups, links, g,
  onAddEvent, onUpdateEvent, onDeleteEvent,
  onAddLinkGroup, onAddLink, onDeleteLink,
}) {
  const [view, setView]             = useState('timeline');
  const [showAdd, setShowAdd]       = useState(false);
  const [editEvent, setEditEvent]   = useState(null);
  const [calDay, setCalDay]         = useState(null); // { dateStr, dayEvents }
  const [filter, setFilter]         = useState('all'); // all | today | upcoming | overdue

  const today2 = TODAY.toISOString().split('T')[0];

  // Apply filter
  const filteredEvents = events.filter(ev => {
    if (filter === 'today')    return ev.date === today2;
    if (filter === 'upcoming') return !ev.is_completed && ev.date >= today2;
    if (filter === 'overdue')  return !ev.is_completed && eventStatus(ev) === 'overdue';
    return true;
  });

  const handleSave = async (form) => {
    if (editEvent) {
      await onUpdateEvent(editEvent.id, form);
      setEditEvent(null);
    } else {
      await onAddEvent(form);
      setShowAdd(false);
    }
  };

  const handleComplete = async (id, val) => {
    await onUpdateEvent(id, { is_completed: val, status: val ? 'done' : 'inprogress' });
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this event?')) await onDeleteEvent(id);
  };

  const workLinks = (linkGroups || []).filter(lg => lg.tab_id === 'work');

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
      <div style={{ display: 'flex', gap: 6 }}>
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
              background: view === v.id ? g.card : 'rgba(255,255,255,0.7)',
              color: view === v.id ? '#fff' : g.muted,
              border: `1.5px solid ${view === v.id ? g.card : g.surfaceBorder}`,
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}>
            {v.icon} {v.label}
          </button>
        ))}
        <button onClick={() => setShowAdd(true)}
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 999,
            background: g.card, color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
          ＋ Add
        </button>
      </div>

      {/* Filter pills (timeline only) */}
      {view === 'timeline' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all',      label: 'All' },
            { id: 'today',    label: '📍 Today' },
            { id: 'upcoming', label: '📆 Upcoming' },
            { id: 'overdue',  label: '🔴 Overdue' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer',
                background: filter === f.id ? `${g.card}22` : 'transparent',
                color: filter === f.id ? g.text : g.muted,
                border: `1px solid ${filter === f.id ? g.card : g.surfaceBorder}`,
                fontWeight: filter === f.id ? 600 : 400,
              }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Main view */}
      {view === 'timeline' && (
        <Timeline
          events={filteredEvents} g={g}
          onEdit={setEditEvent} onDelete={handleDelete} onComplete={handleComplete}
        />
      )}

      {view === 'calendar' && (
        <CalendarGrid
          events={events} g={g}
          onDayPress={(dateStr, dayEvents) => setCalDay({ dateStr, dayEvents })}
        />
      )}

      {view === 'kanban' && (
        <KanbanBoard
          events={events} g={g}
          onEdit={setEditEvent} onDelete={handleDelete}
          onComplete={handleComplete} onUpdateEvent={onUpdateEvent}
        />
      )}

      {/* Link groups */}
      {workLinks.length > 0 && (
        <LinkGroupWidget
          groups={workLinks}
          links={(links || []).filter(l => workLinks.some(lg => lg.id === l.group_id))}
          g={g}
          onAddGroup={name => onAddLinkGroup('work', name)}
          onAddLink={onAddLink}
          onDeleteLink={onDeleteLink}
        />
      )}

      {/* Add link group if none yet */}
      {workLinks.length === 0 && (
        <Surface g={g} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Text size={12} muted g={g} style={{ flex: 1 }}>Save useful links for work (docs, dashboards, tools…)</Text>
          <Btn g={g} size="sm" onClick={() => onAddLinkGroup('work', 'Work Links')}>＋ Links</Btn>
        </Surface>
      )}

      {/* Modals */}
      {showAdd && (
        <AddEventModal g={g} onSave={handleSave} onClose={() => setShowAdd(false)} />
      )}
      {editEvent && (
        <AddEventModal g={g} initial={editEvent} onSave={handleSave} onClose={() => setEditEvent(null)} />
      )}
      {calDay && (
        <DayEventsModal
          dateStr={calDay.dateStr} dayEvents={calDay.dayEvents}
          g={g} onClose={() => setCalDay(null)}
          onEdit={(ev) => { setCalDay(null); setEditEvent(ev); }}
          onDelete={handleDelete} onComplete={handleComplete}
        />
      )}

    </div>
  );
}
