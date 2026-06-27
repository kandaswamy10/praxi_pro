// src/App.jsx
import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { useData } from './hooks/useData.js';
import { useAlarms } from './hooks/useAlarms.js';
import { GEMS, ALL_TABS } from './theme/gems.js';
import Onboarding from './views/Onboarding.jsx';
import Dashboard from './views/Dashboard.jsx';
import Learning from './views/Learning.jsx';
import Work from './views/Work.jsx';
import Personal from './views/Personal.jsx';
import Finance  from './views/Finance.jsx';
import { AlarmBanner, Surface, Text } from './components/ui.jsx';

const ADS = {
  dashboard: { logo: '📋', headline: 'Organise faster with Notion', cta: 'Try free', url: 'https://notion.so' },
  work:      { logo: '🔷', headline: 'Track issues with Linear',    cta: 'Sign up', url: 'https://linear.app' },
  learning:  { logo: '🎓', headline: 'Learn anything on Coursera',  cta: 'Explore', url: 'https://coursera.org' },
  personal:  { logo: '🧘', headline: 'Find calm with Headspace',    cta: 'Try free', url: 'https://headspace.com' },
  finance:   { logo: '📈', headline: 'Invest smarter with Groww',   cta: 'Start',   url: 'https://groww.in' },
};

function PlaceholderView({ tabId, g }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Text size={26} bold g={g}>{tabId.charAt(0).toUpperCase() + tabId.slice(1)} </Text>
        <Text size={26} italic color={g.accent}>coming in Sprint 2.</Text>
      </div>
      <Surface g={g}>
        <Text size={13} muted g={g}>
          Full event management, calendar grid, kanban board and alarms coming soon.
        </Text>
      </Surface>
      {['Calendar Grid', 'Timeline / Agenda', 'Kanban Board'].map(v => (
        <div key={v} style={{ background: 'rgba(255,255,255,0.5)',
          border: `1.5px dashed ${g.surfaceBorder}`, borderRadius: 14, padding: 18, textAlign: 'center' }}>
          <Text muted color={g.muted} size={13}>[ {v} ]</Text>
        </div>
      ))}
    </div>

  );
}

function AppInner() {
  const { session, profile, loading, authStep, signOut, updateProfile } = useAuth();
  const data = useData();
  const { alarmQueue, dismiss, snooze } = useAlarms(data.events, data.addMeetingNote);

  const [activeTab, setActiveTab]       = useState(null);
  const [dismissedAds, setDismissedAds] = useState(new Set());
  const [showAvatar, setShowAvatar]     = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddGoal,  setShowAddGoal]  = useState(false);
  const [showAddHabit,   setShowAddHabit]   = useState(false);
  const [showAddFinance, setShowAddFinance] = useState(false);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: GEMS.dashboard.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, fontFamily: 'system-ui' }}>
      <img src="/logo-icon.svg" alt="Praxi Pro" style={{ width: 96, height: 96, borderRadius: 22 }} />
      <div style={{ fontSize: 13, color: GEMS.dashboard.muted, fontStyle: 'italic' }}>
        Plan. Learn. Relax.
      </div>
      <div style={{ width: 40, height: 40, border: `3px solid ${GEMS.dashboard.card}`,
        borderTopColor: 'transparent', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );

  // ── Auth / onboarding ──────────────────────────────────────────────────────
  if (!session || authStep !== 'done') return <Onboarding />;

  const tab = activeTab || profile?.pinned_tab || 'dashboard';
  const g   = GEMS[tab] || GEMS.dashboard;
  const enabledTabs = (profile?.enabled_tabs || ALL_TABS.map(t => t.id))
    .map(id => ALL_TABS.find(t => t.id === id))
    .filter(Boolean);

  const ad     = ADS[tab];
  const showAd = ad && !dismissedAds.has(tab);


  // ── Content ────────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (!data.ready) return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Text muted g={g} size={13}>Loading your data…</Text>
      </div>
    );
    switch (tab) {
      case 'dashboard': return (
        <Dashboard
          events={data.events} goals={data.goals} g={g} userName={profile?.name}
          onNavigate={(tabId) => setActiveTab(tabId)}
          onQuickAdd={(type) => {
            if (type === 'event')  { setActiveTab('work');     setShowAddEvent(true); }
            if (type === 'goal')   { setActiveTab('learning'); setShowAddGoal(true);  }
            if (type === 'habit')  { setActiveTab('personal'); setShowAddHabit(true); }
          }}
        />
      );
      case 'learning':  return (
        <Learning
          goals={data.goals} topics={data.topics}
          linkGroups={data.linkGroups} links={data.links}
          g={g} aiConfig={profile?.ai_config}
          onAddGoal={data.addGoal} onUpdateGoal={data.updateGoal}
          onCompleteGoal={data.completeGoal}
          onLogHours={data.logHours} onDeleteGoal={data.deleteGoal}
          onAddTopic={data.addTopic} onCompleteTopic={data.completeTopic}
          onReplaceTopics={data.replaceTopics}
          onAddLinkGroup={(name) => data.addLinkGroup('learning', name)}
          onAddLink={data.addLink} onDeleteLink={data.deleteLink}
          triggerAddGoal={showAddGoal} onAddGoalDone={() => setShowAddGoal(false)}
        />
      );
      case 'work': return (
        <Work
          events={data.events} meetingNotes={data.meetingNotes} g={g}
          onAddEvent={data.addEvent} onUpdateEvent={data.updateEvent} onDeleteEvent={data.deleteEvent}
          onAddNote={data.addMeetingNote} onUpdateNote={data.updateMeetingNote} onDeleteNote={data.deleteMeetingNote}
          aiConfig={profile?.ai_config}
          triggerAddEvent={showAddEvent} onAddEventDone={() => setShowAddEvent(false)}
        />
      );
      case 'personal': return (
        <Personal
          g={g} userId={session.user.id}
          triggerAdd={showAddHabit} onTriggerDone={() => setShowAddHabit(false)}
        />
      );
      case 'finance': return (
        <Finance g={g} triggerAdd={showAddFinance} onTriggerDone={() => setShowAddFinance(false)} />
      );
      default: return <PlaceholderView tabId={tab} g={g} />;
    }
  };

  return (
    <div style={{ background: g.bg, minHeight: '100vh', color: g.text,
      fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', position: 'relative',
      transition: 'background .35s ease' }}>

      {/* Alarm banners */}
      {alarmQueue.slice(0,1).map(event => (
        <AlarmBanner key={event.id} event={event} g={g} onDismiss={dismiss} onSnooze={snooze} />
      ))}

      {/* Ad banner */}
      {showAd && (
        <div style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${g.surfaceBorder}`,
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 46 }}>
          <span style={{ fontSize: 18 }}>{ad.logo}</span>
          <Text size={12} color={g.text} style={{ flex: 1 }}>{ad.headline}</Text>
          <a href={ad.url} target="_blank" rel="noreferrer" style={{
            background: g.card, color: '#fff', borderRadius: 8,
            padding: '4px 12px', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
            {ad.cta}
          </a>
          <button onClick={() => setDismissedAds(prev => new Set([...prev, tab]))}
            style={{ background: 'none', border: 'none', color: g.muted, fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px 0', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo-inapp.svg" alt="Praxi Pro" style={{ height: 36, width: 'auto' }} />
          <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 999,
            background: `${g.card}18`, color: g.accent, fontWeight: 600 }}>
            {g.gem} {g.name}
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowAvatar(v => !v)} style={{
            background: g.card, border: 'none', borderRadius: '50%', width: 34, height: 34,
            cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 13 }}>
            {(profile?.name?.[0] || 'U').toUpperCase()}
          </button>
          {showAvatar && (
            <div style={{ position: 'absolute', right: 0, top: 40,
              background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)',
              border: `1px solid ${g.surfaceBorder}`, borderRadius: 14,
              padding: 4, minWidth: 180, zIndex: 99 }}>
              <div style={{ padding: '10px 14px 6px', borderBottom: `1px solid ${g.surfaceBorder}` }}>
                <Text size={13} bold g={g}>{profile?.name}</Text>
                <br /><Text size={11} muted g={g}>{profile?.email}</Text>
              </div>
              {[
                ['⚙️ AI Settings',  () => {}],
                ['🗂️ Tab Settings', () => {}],
                ['🔔 Sound Settings', () => setShowSoundSettings(true)],
                ['↩ Sign out',      () => { signOut(); setShowAvatar(false); }],
              ].map(([label, fn]) => (
                <button key={label} onClick={() => { fn(); setShowAvatar(false); }}
                  style={{ display: 'block', width: '100%', background: 'none',
                    border: 'none', color: g.text, padding: '9px 14px',
                    textAlign: 'left', fontSize: 13, cursor: 'pointer',
                    fontFamily: 'system-ui', borderRadius: 10 }}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', padding: '10px 18px 0', gap: 4, overflowX: 'auto' }}>
        {enabledTabs.map(tabDef => {
          const tg = GEMS[tabDef.id];
          const isActive = tab === tabDef.id;
          return (
            <button key={tabDef.id}
              onClick={() => { setActiveTab(tabDef.id); setDismissedAds(new Set()); }}
              style={{ background: isActive ? tg.card : 'rgba(255,255,255,0.55)',
                border: `1.5px solid ${isActive ? tg.card : g.surfaceBorder}`,
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                color: isActive ? '#fff' : g.muted, fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
                whiteSpace: 'nowrap', transition: 'all .2s' }}>
              {tabDef.icon} {tabDef.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 96px' }}>
        {renderContent()}
      </div>

      {/* Bottom bar — context-aware per tab */}
      <div style={{ position: 'sticky', bottom: 0,
        background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${g.surfaceBorder}`,
        padding: '10px 18px', display: 'flex', gap: 8, alignItems: 'center' }}>
{tab === 'learning'
          ? <button onClick={() => setShowAddGoal(true)} style={{
              background: g.card, border: 'none', borderRadius: 999,
              flex: 1, height: 42, cursor: 'pointer', color: '#fff',
              fontSize: 15, fontWeight: 700 }}>＋ Add Goal</button>
          : tab === 'personal'
          ? <button onClick={() => setShowAddHabit(true)} style={{
              background: g.card, border: 'none', borderRadius: 999,
              flex: 1, height: 42, cursor: 'pointer', color: '#fff',
              fontSize: 15, fontWeight: 700 }}>＋ Add</button>
          : tab === 'finance'
          ? <button onClick={() => setShowAddFinance(true)} style={{
              background: g.card, border: 'none', borderRadius: 999,
              flex: 1, height: 42, cursor: 'pointer', color: '#fff',
              fontSize: 15, fontWeight: 700 }}>＋ Add</button>
          : tab === 'dashboard'
          ? null
          : <button onClick={() => setShowAddEvent(true)} style={{
              background: g.card, border: 'none', borderRadius: 999,
              flex: 1, height: 42, cursor: 'pointer', color: '#fff',
              fontSize: 15, fontWeight: 700 }}>＋ Add Event</button>
        }
      </div>
    </div>
  );
}

// ── BEEP SOUNDS (shared) ─────────────────────────────────────────────────────
const BEEP_TYPES = [
  { id: 'ding',   label: '🔔 Ding',   play: (ctx) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3); g.gain.setValueAtTime(0.4, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); o.start(); o.stop(ctx.currentTime + 0.5); } },
  { id: 'chime',  label: '🎵 Chime',  play: (ctx) => { [523,659,784].forEach((f,i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0,ctx.currentTime+i*0.15); g.gain.linearRampToValueAtTime(0.3,ctx.currentTime+i*0.15+0.05); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.15+0.4); o.start(ctx.currentTime+i*0.15); o.stop(ctx.currentTime+i*0.15+0.4); }); } },
  { id: 'alert',  label: '⚡ Alert',  play: (ctx) => { [0,0.2].forEach(t => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type='square'; o.frequency.value=440; g.gain.setValueAtTime(0.15,ctx.currentTime+t); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.15); o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+0.15); }); } },
  { id: 'soft',   label: '🌙 Soft',   play: (ctx) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type='sine'; o.frequency.value=528; g.gain.setValueAtTime(0.2,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.8); o.start(); o.stop(ctx.currentTime+0.8); } },
  { id: 'urgent', label: '🚨 Urgent', play: (ctx) => { [0,0.15,0.3].forEach(t => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type='sawtooth'; o.frequency.value=660; g.gain.setValueAtTime(0.15,ctx.currentTime+t); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.1); o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+0.1); }); } },
];
function playBeep(id) {
  try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); (BEEP_TYPES.find(b => b.id === id) || BEEP_TYPES[0]).play(ctx); } catch {}
}

function SoundSettingsModal({ g, onClose }) {
  const [current, setCurrent] = useState(localStorage.getItem('praxi:sound') || 'ding');
  const pick = (id) => { setCurrent(id); localStorage.setItem('praxi:sound', id); playBeep(id); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: g.pageBg || '#f0f4ff', borderRadius: 18, width: '100%', maxWidth: 360, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: g.text }}>🔔 Reminder Sound</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: g.muted }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: g.muted, margin: 0 }}>Used for all reminders across the app. Tap to preview.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BEEP_TYPES.map(b => (
            <button key={b.id} onClick={() => pick(b.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
              borderRadius: 12, cursor: 'pointer', border: `2px solid ${current === b.id ? g.card : g.surfaceBorder}`,
              background: current === b.id ? `${g.card}14` : 'rgba(255,255,255,0.75)',
              fontFamily: 'system-ui', width: '100%',
            }}>
              <span style={{ fontSize: 20 }}>{b.label.split(' ')[0]}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: g.text, textAlign: 'left' }}>{b.label.split(' ').slice(1).join(' ')}</span>
              {current === b.id && <span style={{ color: g.card, fontSize: 16 }}>✓</span>}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ background: g.card, border: 'none', borderRadius: 12, padding: '12px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Done</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
