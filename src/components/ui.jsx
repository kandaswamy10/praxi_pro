// src/components/ui.jsx
// Reusable themed UI primitives used across all views.

import { useState } from 'react';

// ── TYPOGRAPHY ────────────────────────────────────────────────────────────────

export const Text = ({ children, size=13, color, bold, italic, muted, g, style={} }) => (
  <span style={{
    fontSize: size,
    color: muted ? g?.muted : (color || g?.text),
    fontWeight: bold ? 600 : 400,
    fontFamily: italic ? 'Georgia, serif' : 'system-ui, sans-serif',
    fontStyle: italic ? 'italic' : 'normal',
    lineHeight: 1.4,
    ...style,
  }}>{children}</span>
);

export const SectionLabel = ({ children, g }) => (
  <p style={{
    fontSize: 10, fontWeight: 600, letterSpacing: '.1em',
    textTransform: 'uppercase', color: g.label,
    margin: '0 0 8px', fontFamily: 'system-ui',
  }}>{children}</p>
);

// ── LAYOUT ────────────────────────────────────────────────────────────────────

export const Surface = ({ children, g, style={} }) => (
  <div style={{
    background: g.surface,
    border: `1px solid ${g.surfaceBorder}`,
    borderRadius: 16, padding: 16,
    backdropFilter: 'blur(8px)',
    ...style,
  }}>{children}</div>
);

export const GemCard = ({ children, g, style={} }) => (
  <div style={{
    background: g.card, borderRadius: 16, padding: 16, ...style,
  }}>{children}</div>
);

export const UrgencyBar = ({ status, g, children }) => {
  const color = status === 'overdue' ? g.urgentBar : status === 'soon' ? g.warnBar : g.okBar;
  return (
    <div style={{
      display: 'flex', gap: 0, borderRadius: 12, overflow: 'hidden',
      background: 'rgba(255,255,255,0.72)', border: `1px solid ${g.surfaceBorder}`,
    }}>
      <div style={{ width: 3, background: color, flexShrink: 0 }} />
      <div style={{ padding: '10px 14px', flex: 1 }}>{children}</div>
    </div>
  );
};

// ── FORM ──────────────────────────────────────────────────────────────────────

export const Input = ({ g, style={}, ...props }) => (
  <input style={{
    background: 'rgba(255,255,255,0.85)',
    border: `1.5px solid ${g.surfaceBorder}`,
    borderRadius: 10, color: g.text,
    padding: '10px 14px', fontSize: 13,
    width: '100%', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'system-ui',
    ...style,
  }} {...props} />
);

export const Textarea = ({ g, style={}, ...props }) => (
  <textarea style={{
    background: 'rgba(255,255,255,0.85)',
    border: `1.5px solid ${g.surfaceBorder}`,
    borderRadius: 10, color: g.text,
    padding: '10px 14px', fontSize: 13,
    width: '100%', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'system-ui',
    resize: 'vertical', minHeight: 72,
    ...style,
  }} {...props} />
);

export const Select = ({ g, style={}, children, ...props }) => (
  <select style={{
    background: 'rgba(255,255,255,0.85)',
    border: `1.5px solid ${g.surfaceBorder}`,
    borderRadius: 10, color: g.text,
    padding: '10px 14px', fontSize: 13,
    width: '100%', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'system-ui',
    ...style,
  }} {...props}>{children}</select>
);

export const Btn = ({ children, g, variant='primary', size='md', style={}, ...props }) => {
  const base = {
    border: 'none', cursor: 'pointer',
    fontFamily: 'system-ui', fontWeight: 600,
    borderRadius: variant === 'pill' ? 999 : 10,
    padding: size === 'sm' ? '5px 12px' : size === 'lg' ? '13px 0' : '8px 16px',
    fontSize: size === 'sm' ? 12 : size === 'lg' ? 14 : 13,
    width: size === 'lg' ? '100%' : 'auto',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'opacity .15s',
  };
  const variants = {
    primary:  { background: g.card, color: '#fff' },
    secondary: { background: 'rgba(255,255,255,0.8)', color: g.text, border: `1.5px solid ${g.surfaceBorder}` },
    ghost:    { background: 'transparent', color: g.muted },
    danger:   { background: g.urgentBar, color: '#fff' },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
};

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────

export const ProgressBar = ({ pct, g, color }) => (
  <div style={{ height: 5, background: `${g.card}22`, borderRadius: 3, overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color || g.accent, borderRadius: 3, transition: 'width .3s' }} />
  </div>
);

// ── SCORE RING ────────────────────────────────────────────────────────────────

export const ScoreRing = ({ score, g, size=80 }) => {
  const r = size * 0.4, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${g.card}22`} strokeWidth={size*0.08}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={g.ring} strokeWidth={size*0.08}
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ * (1 - score / 100)}
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2 - 4} textAnchor="middle" fontSize={size*0.22} fontWeight={700} fill={g.text}>{score}</text>
      <text x={size/2} y={size/2 + size*0.14} textAnchor="middle" fontSize={size*0.12} fill={g.muted}>SCORE</text>
    </svg>
  );
};

// ── TAGS ──────────────────────────────────────────────────────────────────────

export const Tag = ({ label, g, onClick }) => (
  <span onClick={onClick} style={{
    padding: '2px 9px', borderRadius: 999,
    background: `${g.card}18`, color: g.accent,
    fontSize: 11, fontWeight: 500,
    border: `1px solid ${g.card}22`,
    cursor: onClick ? 'pointer' : 'default',
  }}>{label}</span>
);

// ── MODAL ─────────────────────────────────────────────────────────────────────

export const Modal = ({ title, g, onClose, children }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    padding: '0 0 0 0',
  }}>
    <div style={{
      background: g.bgSolid || '#fff',
      border: `1px solid ${g.surfaceBorder}`,
      borderRadius: '20px 20px 0 0',
      width: '100%', maxWidth: 480,
      maxHeight: '88vh', overflowY: 'auto',
      padding: '20px 20px 32px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text size={17} bold g={g}>{title}</Text>
        <Btn variant="ghost" g={g} style={{ fontSize: 22, padding: '0 4px' }} onClick={onClose}>×</Btn>
      </div>
      {children}
    </div>
  </div>
);

// ── ALARM BANNER ──────────────────────────────────────────────────────────────

export const AlarmBanner = ({ event, g, onDismiss, onSnooze }) => {
  const [snoozeMin, setSnoozeMin] = useState(10);
  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 999,
      background: g.card, color: g.cardText,
      padding: '14px 18px', borderRadius: '0 0 16px 16px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>⏰</span>
        <div style={{ flex: 1 }}>
          <Text bold color={g.cardText} size={14}>{event.title}</Text>
          <br /><Text size={12} color={g.cardMuted}>{event.date} · {event.time}</Text>
        </div>
        {event.url && (
          <Btn size="sm" g={g} variant="secondary"
            style={{ background: 'rgba(255,255,255,0.2)', color: g.cardText }}
            onClick={() => window.open(event.url, '_blank')}>
            Join
          </Btn>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <select value={snoozeMin} onChange={e => setSnoozeMin(Number(e.target.value))}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: g.cardText,
            borderRadius: 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
          {[5,10,15,20,30,45,60].map(m => <option key={m} value={m}>{m} min</option>)}
        </select>
        <Btn size="sm" g={g} style={{ background: 'rgba(255,255,255,0.2)', color: g.cardText }}
          onClick={() => onSnooze(event, snoozeMin)}>Snooze</Btn>
        <Btn size="sm" g={g} style={{ background: 'rgba(255,255,255,0.1)', color: g.cardMuted }}
          onClick={() => onDismiss(event.id)}>Dismiss</Btn>
      </div>
    </div>
  );
};

// ── LINK GROUP WIDGET ─────────────────────────────────────────────────────────

export const LinkGroupWidget = ({ groups, links, g, onAddGroup, onAddLink, onDeleteLink }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [addingLink, setAddingLink] = useState(null); // groupId
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  return (
    <Surface g={g}>
      <SectionLabel g={g}>Link Groups</SectionLabel>
      {groups.map(group => (
        <div key={group.id} style={{ marginBottom: 14 }}>
          <Text size={13} bold g={g}>{group.is_default ? '📁' : '📂'} {group.name}</Text>
          <div style={{ paddingLeft: 18, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {links.filter(l => l.group_id === group.id).map(link => (
              <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: g.accent, fontSize: 11 }}>→</span>
                <a href={link.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: g.accent, textDecoration: 'underline', flex: 1 }}>
                  {link.title}
                </a>
                <button onClick={() => onDeleteLink(link.id)}
                  style={{ background: 'none', border: 'none', color: g.muted,
                    fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
            {addingLink === group.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <Input g={g} placeholder="Link title" value={linkTitle}
                  onChange={e => setLinkTitle(e.target.value)} style={{ padding: '6px 10px' }} />
                <Input g={g} placeholder="https://..." value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)} style={{ padding: '6px 10px' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn size="sm" g={g} onClick={() => {
                    if (linkTitle && linkUrl) {
                      onAddLink(group.id, linkTitle, linkUrl);
                      setLinkTitle(''); setLinkUrl(''); setAddingLink(null);
                    }
                  }}>Add</Btn>
                  <Btn size="sm" variant="ghost" g={g} onClick={() => setAddingLink(null)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingLink(group.id)}
                style={{ background: 'none', border: 'none', color: g.muted,
                  fontSize: 12, cursor: 'pointer', padding: '2px 0', textAlign: 'left' }}>
                + Add link
              </button>
            )}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Input g={g} placeholder="New group name…" value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)} style={{ padding: '6px 10px' }} />
        <Btn size="sm" g={g} onClick={() => {
          if (newGroupName.trim()) { onAddGroup(newGroupName.trim()); setNewGroupName(''); }
        }}>＋</Btn>
      </div>
    </Surface>
  );
};
