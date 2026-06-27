// src/views/Finance.jsx
// Finance tab — Goals (targets/notes) + Useful Links (add by URL, auto-title from page)

import { useState, useRef } from 'react';
import { Text, SectionLabel, Surface, Btn, Input, Textarea, Modal } from '../components/ui';

// ── UTILS ─────────────────────────────────────────────────────────────────────

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);

const DB_KEY = 'praxi:finance:v1';
function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : { goals: [], links: [] };
  } catch { return { goals: [], links: [] }; }
}
function save(data) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch {}
}

// Derive title from URL path (same as Learning XLS import)
const titleFromUrl = (url) => {
  try {
    const u    = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    const last = segs[segs.length - 1] || u.hostname;
    return last
      .replace(/[-_]/g, ' ')
      .replace(/\.[^.]+$/, '')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim() || u.hostname;
  } catch { return url; }
};

// ── ADD GOAL MODAL ────────────────────────────────────────────────────────────

function AddGoalModal({ g, onSave, onClose, initial = {} }) {
  const [form, setForm] = useState({
    title: '', target: '', currency: '₹', notes: '', ...initial,
  });
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
              borderRadius: 10, color: g.text, padding: '10px 10px', fontSize: 13,
              outline: 'none', fontFamily: 'system-ui',
            }}>
              {['₹','$','€','£','¥'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel g={g}>Target Amount</SectionLabel>
            <Input g={g} type="number" placeholder="e.g. 500000" value={form.target}
              onChange={e => set('target', e.target.value)} />
          </div>
        </div>

        <div>
          <SectionLabel g={g}>Notes</SectionLabel>
          <Textarea g={g} placeholder="Strategy, timeline, notes…" value={form.notes}
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
  const [url,     setUrl]     = useState('');
  const [title,   setTitle]   = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const deriveTitle = () => {
    if (!url.trim()) return;
    setLoading(true);
    // Derive from URL path (same approach as Learning XLS import)
    const derived = titleFromUrl(url.trim());
    setTitle(derived);
    setFetched(true);
    setLoading(false);
  };

  const handleUrlBlur = () => { if (url.trim() && !title) deriveTitle(); };

  return (
    <Modal title="Add Useful Link" g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <SectionLabel g={g}>URL *</SectionLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input g={g} placeholder="https://…" value={url}
              onChange={e => { setUrl(e.target.value); setFetched(false); }}
              onBlur={handleUrlBlur}
              style={{ flex: 1 }} />
            <button onClick={deriveTitle} disabled={!url.trim() || loading} style={{
              padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: g.card, color: '#fff', fontSize: 13, fontWeight: 600,
              opacity: !url.trim() ? 0.5 : 1, flexShrink: 0,
            }}>{loading ? '…' : '↩ Title'}</button>
          </div>
        </div>

        <div>
          <SectionLabel g={g}>Title {fetched && <span style={{ color: g.accent, fontSize: 10 }}>✓ from URL</span>}</SectionLabel>
          <Input g={g} placeholder="Page title" value={title}
            onChange={e => setTitle(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn g={g} size="lg" style={{ flex: 1 }}
            onClick={() => {
              if (!url.trim()) return;
              const t = title.trim() || titleFromUrl(url.trim());
              onSave({ id: uid(), url: url.trim(), title: t, createdAt: new Date().toISOString() });
            }}>
            ＋ Add Link
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
    const existing = data.goals.find(g => g.id === goal.id);
    const goals = existing
      ? data.goals.map(g => g.id === goal.id ? goal : g)
      : [...data.goals, goal];
    persist({ ...data, goals });
    setEditGoal(null);
  };

  const deleteGoal = (id) => persist({ ...data, goals: data.goals.filter(g => g.id !== id) });

  const fmt = (n, cur) => {
    const num = Number(n);
    if (!num) return '—';
    return cur + num.toLocaleString('en-IN');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel g={g}>🎯 Finance Goals</SectionLabel>

      {data.goals.length === 0 && (
        <Surface g={g} style={{ textAlign: 'center', padding: 24 }}>
          <Text muted g={g} size={13}>No goals yet — tap ＋ Add Goal below.</Text>
        </Surface>
      )}

      {data.goals.map(goal => {
        const open = expand === goal.id;
        return (
          <Surface key={goal.id} g={g} style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: `${g.card}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
              }}>🎯</div>
              <div style={{ flex: 1 }} onClick={() => setExpand(open ? null : goal.id)} >
                <Text g={g} bold size={14}>{goal.title}</Text>
                {goal.target && (
                  <Text g={g} muted size={11} style={{ display: 'block', marginTop: 1 }}>
                    Target: {fmt(goal.target, goal.currency || '₹')}
                  </Text>
                )}
              </div>
              <button onClick={() => setEditGoal(goal)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 15, padding: 4,
              }}>✏️</button>
              <button onClick={() => deleteGoal(goal.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 16, padding: 4,
              }}>🗑</button>
            </div>

            {open && goal.notes && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${g.surfaceBorder}` }}>
                <Text g={g} muted size={12} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{goal.notes}</Text>
              </div>
            )}
          </Surface>
        );
      })}

      {editGoal && (
        <AddGoalModal g={g} initial={editGoal} onSave={saveGoal} onClose={() => setEditGoal(null)} />
      )}
    </div>
  );
}

// ── LINKS SECTION ─────────────────────────────────────────────────────────────

function LinksSection({ g, data, persist }) {
  const [showAdd, setShowAdd] = useState(false);

  const saveLink = (link) => {
    persist({ ...data, links: [...(data.links || []), link] });
    setShowAdd(false);
  };

  const deleteLink = (id) => persist({ ...data, links: data.links.filter(l => l.id !== id) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel g={g}>🔗 Useful Links</SectionLabel>

      {(data.links || []).length === 0 && (
        <Surface g={g} style={{ textAlign: 'center', padding: 24 }}>
          <Text muted g={g} size={13}>No links yet — tap ＋ Add Link below.</Text>
        </Surface>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(data.links || []).map(link => (
          <Surface key={link.id} g={g} style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8, background: `${g.card}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
              }}>🔗</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text g={g} bold size={13}>{link.title}</Text>
                <a href={link.url} target="_blank" rel="noreferrer" style={{
                  display: 'block', fontSize: 11, color: g.accent, marginTop: 1,
                  textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}>{link.url}</a>
              </div>
              <button onClick={() => deleteLink(link.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: g.muted, fontSize: 16, padding: 4, flexShrink: 0,
              }}>🗑</button>
            </div>
          </Surface>
        ))}
      </div>

      {showAdd && <AddLinkModal g={g} onSave={saveLink} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function Finance({ g, triggerAdd, onTriggerDone }) {
  const [tab,  setTab]  = useState('goals');
  const [data, setData] = useState(() => load());
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);

  const persist = (next) => { setData(next); save(next); };

  // Bottom bar trigger
  const prevTrigger = useRef(false);
  if (triggerAdd && !prevTrigger.current) {
    prevTrigger.current = true;
    if (tab === 'links') setShowAddLink(true);
    else setShowAddGoal(true);
    onTriggerDone?.();
  }
  if (!triggerAdd) prevTrigger.current = false;

  const tabs = [
    { id: 'goals', label: '🎯 Goals' },
    { id: 'links', label: '🔗 Links' },
  ];

  const saveGoal = (goal) => {
    const goals = data.goals.find(g => g.id === goal.id)
      ? data.goals.map(g => g.id === goal.id ? goal : g)
      : [...data.goals, goal];
    persist({ ...data, goals });
    setShowAddGoal(false);
  };

  const saveLink = (link) => {
    persist({ ...data, links: [...(data.links || []), link] });
    setShowAddLink(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Tab bar */}
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

      {showAddGoal && <AddGoalModal g={g} onSave={saveGoal} onClose={() => setShowAddGoal(false)} />}
      {showAddLink && <AddLinkModal g={g} onSave={saveLink} onClose={() => setShowAddLink(false)} />}
    </div>
  );
}
