// src/views/Dashboard.jsx
import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Text, SectionLabel, Surface, GemCard, ScoreRing, UrgencyBar, ProgressBar, Tag } from '../components/ui';
import { GEMS } from '../theme/gems';

// ── UTILS ─────────────────────────────────────────────────────────────────────

const isOverdue = (date) => new Date(date) < new Date(new Date().toDateString());
const isDueSoon = (date, days = 3) => {
  const diff = (new Date(date) - new Date()) / 86_400_000;
  return diff >= 0 && diff <= days;
};
const urgencyStatus = (date, done) => {
  if (done) return 'done';
  if (isOverdue(date)) return 'overdue';
  if (isDueSoon(date)) return 'soon';
  return 'ok';
};
const fmt = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// ── SCORE FORMULA ─────────────────────────────────────────────────────────────

function computeScore(events, goals) {
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());

  const weekEvents = events.filter(e => new Date(e.date) >= weekStart);
  const completedEvents = weekEvents.filter(e => e.is_completed);
  const overdueCount = events.filter(e => isOverdue(e.date) && !e.is_completed).length;

  const totalTopicsAll = goals.reduce((s, g) => s + (g.topic_count || 0), 0);
  const doneTopicsAll  = goals.reduce((s, g) => s + (g.done_count  || 0), 0);

  const targetHours  = goals.reduce((s, g) => s + (g.target_hours || 0), 0);
  const loggedHours  = goals.reduce((s, g) => s + (g.completed_hours || 0), 0);

  const hoursScore     = Math.min(loggedHours / (targetHours || 1), 1) * 25;
  const milestoneScore = (totalTopicsAll ? doneTopicsAll / totalTopicsAll : 0) * 25;
  const eventScore     = (weekEvents.length ? completedEvents.length / weekEvents.length : 1) * 25;
  const overdueScore   = Math.max(0, 25 - overdueCount * 5);

  return Math.round(hoursScore + milestoneScore + eventScore + overdueScore);
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function Dashboard({ events, goals, g, userName, onNavigate, onQuickAdd }) {
  const score = useMemo(() => computeScore(events, goals), [events, goals]);

  const today = new Date().toISOString().split('T')[0];
  const todayItems = useMemo(() =>
    events.filter(e => e.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
  [events, today]);

  const upcoming7 = useMemo(() =>
    events
      .filter(e => !e.is_completed && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5),
  [events, today]);

  const overdueItems = useMemo(() =>
    events.filter(e => !e.is_completed && isOverdue(e.date)),
  [events]);

  // Chart data
  const categoryData = useMemo(() => {
    const counts = {};
    events.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [events]);

  const goalProgressData = useMemo(() =>
    goals.slice(0, 5).map(g => ({
      name: g.title.split(' ').slice(0, 3).join(' '),
      pct: Math.round(g.target_hours > 0 ? (g.completed_hours / g.target_hours) * 100 : 0),
    })),
  [goals]);

  const gemColors = { Work: GEMS.work.card, Learning: GEMS.learning.card, Personal: GEMS.personal.card, Finance: GEMS.finance.card };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Greeting */}
      <div>
        <Text size={12} muted g={g}>
          {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
        </Text>
        <div style={{ marginTop: 4 }}>
          <Text size={26} bold g={g}>{greeting}, </Text>
          <Text size={26} italic color={g.accent}>{userName || 'there'}.</Text>
        </div>
      </div>

      {/* Hero — score + focus */}
      <div style={{ display: 'flex', gap: 10 }}>
        <GemCard g={g} style={{ flex: 1 }}>
          <Text size={10} color={g.cardMuted} style={{ letterSpacing: '.1em', textTransform: 'uppercase' }}>FOCUS MODE</Text>
          <div style={{ fontSize: 32, fontWeight: 700, color: g.cardText, margin: '8px 0 4px', fontFamily: 'Georgia, serif' }}>
            {todayItems.length > 0 ? todayItems[0].title : 'All clear'}
          </div>
          <Text size={12} color={g.cardMuted}>
            {todayItems.length > 0 ? todayItems[0].time || 'Today' : 'No events today'}
          </Text>
        </GemCard>
        <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 16, padding: 14,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ScoreRing score={score} g={g} size={84} />
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { v: `${goals.reduce((s,g) => s + g.completed_hours, 0).toFixed(0)}h`, l: 'Hours logged' },
          { v: goals.filter(g => !isOverdue(g.due_date)).length, l: 'Goals active' },
          { v: events.filter(e => e.is_completed).length, l: 'Events done' },
          { v: overdueItems.length, l: 'Overdue', danger: true },
        ].map(({ v, l, danger }, i) => (
          <Surface key={i} g={g} style={{ padding: '8px 10px', textAlign: 'center' }}>
            <Text size={18} bold color={danger ? g.urgentBar : g.text}>{v}</Text>
            <br /><Text size={10} muted g={g}>{l}</Text>
          </Surface>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <SectionLabel g={g}>Quick Actions</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { icon: '💼', label: 'Go to Work',  action: () => onNavigate?.('work'),    tab: 'work'     },
            { icon: '📚', label: 'Learning',    action: () => onNavigate?.('learning'),tab: 'learning' },
            { icon: '🎯', label: 'Add Goal',    action: () => onQuickAdd?.('goal'),    tab: 'learning' },
            { icon: '🌟', label: 'Personal',    action: () => onNavigate?.('personal'),tab: 'personal' },
            { icon: '🔁', label: 'Add Habit',   action: () => onQuickAdd?.('habit'),   tab: 'personal' },
          ].map(item => {
            const tg = GEMS[item.tab] || g;
            return (
              <button key={item.label} onClick={item.action} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                background: 'rgba(255,255,255,0.75)', border: `1.5px solid ${tg.surfaceBorder}`,
                textAlign: 'left', fontFamily: 'system-ui', transition: 'all .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${tg.card}14`}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.75)'}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${tg.card}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <Text g={g} bold size={13}>{item.label}</Text>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's agenda */}
      {todayItems.length > 0 && (
        <Surface g={g}>
          <SectionLabel g={g}>Today's Agenda</SectionLabel>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {todayItems.map(e => {
              const eg = GEMS[e.category?.toLowerCase()] || g;
              return (
                <div key={e.id} style={{
                  background: 'rgba(255,255,255,0.7)', border: `1px solid ${g.surfaceBorder}`,
                  borderRadius: 12, padding: '10px 14px', minWidth: 150, flexShrink: 0,
                  borderLeft: `3px solid ${eg.card}`,
                }}>
                  <Text size={13} bold g={g}>{e.title}</Text>
                  <br /><Text size={11} muted g={g}>{e.time || 'All day'}</Text>
                  <br />
                  <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px',
                    borderRadius: 999, background: `${eg.card}18`, color: eg.card, fontSize: 10, fontWeight: 600 }}>
                    {e.category}
                  </span>
                </div>
              );
            })}
          </div>
        </Surface>
      )}

      {/* Charts */}
      {categoryData.length > 0 && (
        <Surface g={g}>
          <SectionLabel g={g}>Time Split</SectionLabel>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <PieChart width={80} height={80}>
              <Pie data={categoryData} cx={35} cy={35} innerRadius={22} outerRadius={38}
                dataKey="value" strokeWidth={0}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={gemColors[entry.name] || g.accent} />
                ))}
              </Pie>
            </PieChart>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {categoryData.map(({ name, value }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: gemColors[name] || g.accent }} />
                  <Text size={11} muted g={g}>{name}</Text>
                  <Text size={11} bold g={g}>{value}</Text>
                </div>
              ))}
            </div>
          </div>
        </Surface>
      )}

      {goalProgressData.length > 0 && (
        <Surface g={g}>
          <SectionLabel g={g}>Goal Progress</SectionLabel>
          <ResponsiveContainer width="100%" height={goalProgressData.length * 28 + 16}>
            <BarChart data={goalProgressData} layout="vertical" margin={{ left: 0, right: 24 }}>
              <XAxis type="number" domain={[0,100]} hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: g.muted }} />
              <Tooltip formatter={v => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', background: g.surfaceSolid }} />
              <Bar dataKey="pct" fill={g.accent} radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Surface>
      )}

      {/* Reminders */}
      <Surface g={g}>
        <SectionLabel g={g}>Reminders</SectionLabel>
        {overdueItems.length === 0 && upcoming7.length === 0 && (
          <Text muted g={g} size={13}>You're all caught up 🎉</Text>
        )}
        {overdueItems.map(e => (
          <UrgencyBar key={e.id} status="overdue" g={g}>
            <Text bold g={g} size={13}>{e.title}</Text>
            <br /><Text size={11} muted g={g}>Overdue · {fmt(e.date)}</Text>
          </UrgencyBar>
        ))}
        {upcoming7.filter(e => !isOverdue(e.date)).map(e => (
          <UrgencyBar key={e.id} status={urgencyStatus(e.date, false)} g={g}>
            <Text bold g={g} size={13}>{e.title}</Text>
            <br />
            <Text size={11} muted g={g}>
              {isDueSoon(e.date) ? '⏰ ' : ''}{fmt(e.date)}{e.time ? ` · ${e.time}` : ''}
            </Text>
          </UrgencyBar>
        ))}
      </Surface>
    </div>
  );
}
