// src/views/Learning.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Text, SectionLabel, Surface, GemCard, Btn, Input, Textarea,
  Select, Modal, Tag, ProgressBar,
} from '../components/ui';
import { callAI, DEFAULT_AI_CONFIG } from '../ai/service';
import { PROMPTS as prompts } from '../ai/service';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
}

function parseJSON(raw) {
  try {
    const s = raw.trim();
    const start = s.indexOf('['), end = s.lastIndexOf(']');
    if (start !== -1 && end !== -1) return JSON.parse(s.slice(start, end + 1));
    const os = s.indexOf('{'), oe = s.lastIndexOf('}');
    if (os !== -1 && oe !== -1) return JSON.parse(s.slice(os, oe + 1));
  } catch {}
  return null;
}

// ── IFRAME FULL-SCREEN VIEWER ─────────────────────────────────────────────────

function LinkViewer({ link, g, onClose }) {
  const [loading, setLoading] = useState(true);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', flexDirection: 'column', background: '#fff',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: g.card, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
          padding: '4px 12px', color: '#fff', fontSize: 18, cursor: 'pointer',
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {link.title}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {link.url}
          </div>
        </div>
        <a href={link.url} target="_blank" rel="noreferrer" style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
          padding: '4px 10px', color: '#fff', fontSize: 12, textDecoration: 'none',
          fontWeight: 600,
        }}>↗ Open</a>
      </div>

      {/* Loading bar */}
      {loading && (
        <div style={{ height: 3, background: g.surfaceBorder, flexShrink: 0 }}>
          <div style={{
            height: '100%', background: g.card, width: '60%',
            animation: 'slide 1.2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={link.url}
        title={link.title}
        onLoad={() => setLoading(false)}
        style={{ flex: 1, border: 'none', width: '100%' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}

// ── SKILL TREE ────────────────────────────────────────────────────────────────

function SkillTree({ topics, g }) {
  if (!topics.length) return null;
  const roots = topics.filter(t => !(t.dependencies || []).length);
  const renderNode = (topic, depth = 0) => (
    <div key={topic.id} style={{ paddingLeft: depth * 20, marginBottom: 6 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: topic.is_completed ? `${g.okBar}18` : 'rgba(255,255,255,0.7)',
        border: `1.5px solid ${topic.is_completed ? g.okBar + '55' : g.surfaceBorder}`,
        borderRadius: 10, padding: '7px 12px',
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          background: topic.is_completed ? g.okBar : `${g.card}22`,
          border: `1.5px solid ${topic.is_completed ? g.okBar : g.card}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {topic.is_completed && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
        </div>
        <Text size={12} g={g}
          style={{ textDecoration: topic.is_completed ? 'line-through' : 'none', opacity: topic.is_completed ? 0.6 : 1 }}>
          {topic.title}
        </Text>
        {topic.difficulty && <Tag label={topic.difficulty} g={g} />}
      </div>
      {topics.filter(t => (t.dependencies || []).includes(topic.id)).map(child => renderNode(child, depth + 1))}
    </div>
  );
  return <div>{roots.map(r => renderNode(r))}</div>;
}

// ── QUIZ MODAL ────────────────────────────────────────────────────────────────

function QuizModal({ quiz, topicTitle, g, onClose }) {
  const [idx,    setIdx]    = useState(0);
  const [chosen, setChosen] = useState(null);
  const [score,  setScore]  = useState(0);
  const [done,   setDone]   = useState(false);

  if (!quiz?.length) return null;
  const q = quiz[idx];
  const correctIdx = q?.correct ?? q?.correctIndex ?? 0;

  const answer = (i) => {
    if (chosen !== null) return;
    setChosen(i);
    if (i === correctIdx) setScore(s => s + 1);
  };

  const next = () => {
    if (idx + 1 >= quiz.length) { setDone(true); return; }
    setIdx(i => i + 1); setChosen(null);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: g.pageBg || '#f0f4ff',
      display: 'flex', flexDirection: 'column',
      height: '100dvh', overflow: 'hidden',   // never scroll outer
    }}>
      {/* Header — fixed */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: g.card, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
          padding: '6px 12px', color: '#fff', fontSize: 18, cursor: 'pointer',
        }}>&#8592;</button>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Quiz</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
            {topicTitle}
          </div>
        </div>
        {!done && (
          <div style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: 999,
            padding: '4px 12px', color: '#fff', fontSize: 13, fontWeight: 700,
          }}>{idx + 1} / {quiz.length}</div>
        )}
      </div>

      {/* Progress bar */}
      {!done && (
        <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }}>
          <div style={{
            height: '100%', background: g.card,
            width: `${((idx + (chosen !== null ? 1 : 0)) / quiz.length) * 100}%`,
            transition: 'width .3s ease',
          }} />
        </div>
      )}

      {/* Body — flex, fills remaining space, no scroll */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '16px', gap: 12,
        overflow: 'hidden', minHeight: 0,
      }}>
        {done ? (
          /* Results */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center',
          }}>
            <div style={{ fontSize: 56 }}>{score === quiz.length ? '🏆' : score >= quiz.length * 0.7 ? '🎉' : '📚'}</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: g.card, lineHeight: 1 }}>
              {score}<span style={{ fontSize: 22, color: g.muted }}>/{quiz.length}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: g.text }}>
              {score === quiz.length ? 'Perfect score!' : score >= quiz.length * 0.7 ? 'Great job!' : 'Keep studying!'}
            </div>
            <div style={{ fontSize: 14, color: g.muted }}>{Math.round(score / quiz.length * 100)}% correct</div>
            <button onClick={onClose} style={{
              marginTop: 8, background: g.card, border: 'none', borderRadius: 999,
              padding: '14px 48px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>Done</button>
          </div>
        ) : (
          <>
            {/* Question — fixed size */}
            <div style={{
              background: 'rgba(255,255,255,0.92)', borderRadius: 14,
              padding: '16px 16px', border: `1.5px solid ${g.surfaceBorder}`,
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: g.muted, marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: 1 }}>Question {idx + 1}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: g.text, lineHeight: 1.45 }}>
                {q.question}
              </div>
            </div>

            {/* Options — equal flex distribution, no overflow */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              gap: 8, minHeight: 0,
            }}>
              {q.options.map((opt, i) => {
                const isCorrect = i === correctIdx, isPicked = i === chosen, revealed = chosen !== null;
                const bg     = !revealed ? 'rgba(255,255,255,0.88)' : isCorrect ? `${g.okBar}28` : isPicked ? `${g.urgentBar}20` : 'rgba(255,255,255,0.55)';
                const border = !revealed ? g.surfaceBorder : isCorrect ? g.okBar : isPicked ? g.urgentBar : g.surfaceBorder;
                return (
                  <button key={i} onClick={() => answer(i)} style={{
                    flex: 1,                              // equal height share
                    background: bg, border: `2px solid ${border}`,
                    borderRadius: 12,
                    padding: '0 14px',
                    cursor: revealed ? 'default' : 'pointer',
                    textAlign: 'left', fontSize: 15, color: g.text,
                    fontFamily: 'inherit', lineHeight: 1.3,
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background .15s, border-color .15s',
                    minHeight: 0, overflow: 'hidden',
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: !revealed ? `${g.card}18` : isCorrect ? g.okBar : isPicked ? g.urgentBar : `${g.card}10`,
                      border: `2px solid ${!revealed ? g.surfaceBorder : isCorrect ? g.okBar : isPicked ? g.urgentBar : g.surfaceBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                      color: revealed && (isCorrect || isPicked) ? '#fff' : g.muted,
                    }}>
                      {revealed && isCorrect ? '✓' : revealed && isPicked ? '✗' : ['A','B','C','D'][i]}
                    </span>
                    <span style={{
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation + Next — pinned at bottom */}
            {chosen !== null && (
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.explanation && (
                  <div style={{
                    background: `${g.card}10`, border: `1.5px solid ${g.surfaceBorder}`,
                    borderRadius: 10, padding: '10px 14px',
                    fontSize: 13, color: g.text, lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>💡 {q.explanation}</div>
                )}
                <button onClick={next} style={{
                  background: g.card, border: 'none', borderRadius: 999,
                  padding: '14px', color: '#fff', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', width: '100%', flexShrink: 0,
                }}>
                  {idx + 1 >= quiz.length ? 'See Results 🏁' : 'Next →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── ADD GOAL MODAL ────────────────────────────────────────────────────────────

function AddGoalModal({ g, onAdd, onClose }) {
  const [form, setForm] = useState({ title: '', category: 'Technical', due_date: '', target_hours: 20, tags: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = () => {
    if (!form.title.trim()) return;
    onAdd({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) });
    onClose();
  };
  return (
    <Modal title="New Learning Goal" g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Input g={g} placeholder="Goal title *" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><SectionLabel g={g}>Category</SectionLabel>
            <Select g={g} value={form.category} onChange={e => set('category', e.target.value)}>
              {['Technical','Language','Creative','Business','Science','Other'].map(c => <option key={c}>{c}</option>)}
            </Select></div>
          <div><SectionLabel g={g}>Target Hours</SectionLabel>
            <Input g={g} type="number" min={1} value={form.target_hours} onChange={e => set('target_hours', Number(e.target.value))} /></div>
        </div>
        <div><SectionLabel g={g}>Due Date</SectionLabel>
          <Input g={g} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
        <div><SectionLabel g={g}>Tags (comma separated)</SectionLabel>
          <Input g={g} placeholder="e.g. react, frontend" value={form.tags} onChange={e => set('tags', e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn g={g} size="lg" onClick={save} style={{ flex: 1 }}>＋ Add Goal</Btn>
          <Btn g={g} variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── ADD TOPIC MODAL ───────────────────────────────────────────────────────────

function AddTopicModal({ goalId, g, onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [url,   setUrl]   = useState('');
  return (
    <Modal title="Add Topic" g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Input g={g} placeholder="Topic title *" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <Input g={g} placeholder="Resource URL (optional)" value={url} onChange={e => setUrl(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn g={g} size="lg" onClick={() => {
            if (title.trim()) { onAdd(goalId, { title, url: url.trim() || null }); onClose(); }
          }} style={{ flex: 1 }}>Add</Btn>
          <Btn g={g} variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── ACTIVE GOAL CARD ──────────────────────────────────────────────────────────

function ActiveGoalCard({
  goal, topics, linkGroups, links, g, aiConfig,
  isActive, onToggle,
  onLogHours, onDeleteGoal, onCompleteGoal,
  onAddTopic, onCompleteTopic, onReplaceTopics,
  onAddLink, onDeleteLink,
}) {
  const [treeView,     setTreeView]     = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiError,      setAiError]      = useState('');
  const [activeQuiz,   setActiveQuiz]   = useState(null);
  const [quizReady,    setQuizReady]    = useState({}); // topicId → true when cached
  const quizCache = useRef({});                          // topicId → quiz[]

  // Pre-fetch quiz silently — never touches aiLoading, never blocks UI
  const prefetchQuiz = async (topic) => {
    if (!topic || quizCache.current[topic.id]) return;
    try {
      const raw = await callAI('quizGenerate',
        `Topic: ${topic.title}\nGoal: ${goal.title}`,
        'Generate 5 multiple-choice quiz questions for this learning topic. Return JSON array with fields: question, options (array of 4), correct (0-based index), explanation.',
        aiConfig || DEFAULT_AI_CONFIG);
      const quiz = parseJSON(raw);
      if (quiz?.length && mountedRef.current) {
        quizCache.current[topic.id] = quiz;
        setQuizReady(prev => ({ ...prev, [topic.id]: true }));
      }
    } catch {} // fully silent
  };

  const goalTopics = topics.filter(t => t.goal_id === goal.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const completedCount = goalTopics.filter(t => t.is_completed).length;
  const topicPct  = goalTopics.length > 0 ? completedCount / goalTopics.length : 0;
  const hoursPct  = goal.target_hours > 0 ? Math.min((goal.completed_hours || 0) / goal.target_hours, 1) : 0;
  const pct       = Math.round(((topicPct + hoursPct) / 2) * 100);

  // Auto-complete when all topics done
  useEffect(() => {
    if (goalTopics.length > 0 && completedCount === goalTopics.length && !goal.is_completed) {
      onCompleteGoal(goal.id, true);
    }
  }, [completedCount, goalTopics.length]);

  const handleAddTopic = async (goalId, raw) => {
    const newTopic = await onAddTopic(goalId, raw);
    setAiLoading(true); setAiError('');
    try {
      const allTopics = [...goalTopics, newTopic];
      const raw2 = await callAI('topicClassify',
        `Goal: ${goal.title}\nTopics: ${JSON.stringify(allTopics.map(t => ({ id: t.id, title: t.title })))}`,
        'Classify and order these learning topics by difficulty/dependency. Return JSON array with fields: id, domain, difficulty (beginner/intermediate/advanced), estimated_mins, sort_order.',
        aiConfig || DEFAULT_AI_CONFIG);
      const classified = parseJSON(raw2);
      if (classified) {
        const merged = classified.map((c, i) => ({ ...(allTopics.find(t => t.id === c.id) || newTopic), ...c, sort_order: i }));
        await onReplaceTopics(goalId, merged);
        // Pre-fetch quiz for the first incomplete topic after classification
        const firstIncomplete = merged.find(t => !t.is_completed);
        if (firstIncomplete) prefetchQuiz(firstIncomplete);
      }
    } catch (e) { setAiError(`AI: ${e.message}`); }
    finally { setAiLoading(false); }
  };

  const generateQuiz = async (topic) => {
    // Instant open from cache
    if (quizCache.current[topic.id]) {
      setActiveQuiz({ quiz: quizCache.current[topic.id], topicTitle: topic.title });
      return;
    }
    if (!mountedRef.current) return;
    setQuizLoading(true); setAiError('');
    try {
      const raw = await callAI('quizGenerate',
        `Topic: ${topic.title}\nGoal: ${goal.title}`,
        'Generate 5 multiple-choice quiz questions for this learning topic. Return JSON array with fields: question, options (array of 4), correct (0-based index), explanation.',
        aiConfig || DEFAULT_AI_CONFIG);
      const quiz = parseJSON(raw);
      if (quiz?.length && mountedRef.current) {
        quizCache.current[topic.id] = quiz;
        setQuizReady(prev => ({ ...prev, [topic.id]: true }));
        setActiveQuiz({ quiz, topicTitle: topic.title });
      }
    } catch (e) {
      if (mountedRef.current) setAiError(`Quiz: ${e.message}`);
    } finally {
      if (mountedRef.current) setQuizLoading(false);
    }
  };

  return (
    <div>
      {/* Goal header card */}
      <GemCard g={g} style={{ borderBottom: isActive ? `3px solid ${g.cardMuted}` : 'none' }}>
        <div onClick={() => onToggle(goal.id)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text bold color={g.cardText} size={15}>{goal.title}</Text>
            <br />
            <Text size={11} color={g.cardMuted}>{goal.category} · {goalTopics.length} topics · {goal.completed_hours || 0}h logged</Text>
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: 999,
            background: 'rgba(255,255,255,0.18)', color: g.cardText,
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>{pct}%</span>
        </div>

        <ProgressBar pct={pct} g={{ ...g, accent: g.cardMuted }} color={g.cardMuted} />
        </div>{/* end tap zone */}

        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {(goal.tags || []).map(t => (
            <span key={t} style={{ padding: '2px 8px', borderRadius: 999,
              background: 'rgba(255,255,255,0.15)', color: g.cardMuted, fontSize: 10 }}>{t}</span>
          ))}

          <button onClick={e => { e.stopPropagation(); onCompleteGoal(goal.id, true); }}
            style={{ background: 'none', border: 'none', color: g.cardMuted, fontSize: 11, cursor: 'pointer' }}>
            ✓ Complete
          </button>
        </div>

      </GemCard>

      {/* Expanded panel */}
      {isActive && (
        <div style={{
          background: `${g.accentLight || g.surface}`,
          border: `1px solid ${g.surfaceBorder}`, borderTop: 'none',
          borderRadius: '0 0 16px 16px', padding: 14,
        }}>
          {/* Topics header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SectionLabel g={g}>{goalTopics.length} Topics ({completedCount} done)</SectionLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn size="sm" variant={treeView ? 'primary' : 'secondary'} g={g}
                onClick={() => setTreeView(v => !v)}>
                {treeView ? '📋 List' : '🌳 Tree'}
              </Btn>
              <Btn size="sm" g={g} onClick={() => setShowAddTopic(true)}>＋ Topic</Btn>
            </div>
          </div>

          {aiLoading && <Text size={12} muted g={g} style={{ display: 'block', marginBottom: 8 }}>🤖 AI working…</Text>}
          {aiError   && <Text size={12} style={{ color: g.urgentBar, display: 'block', marginBottom: 8 }}>{aiError}</Text>}

          {/* Topic list / tree */}
          {treeView
            ? <SkillTree topics={goalTopics} g={g} />
            : goalTopics.map(topic => {
                const locked = (topic.dependencies || []).some(depId => {
                  const dep = goalTopics.find(t => t.id === depId);
                  return dep && !dep.is_completed;
                });
                return (
                  <div key={topic.id} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    background: topic.is_completed ? `${g.okBar}10` : 'rgba(255,255,255,0.65)',
                    border: `1.5px solid ${topic.is_completed ? g.okBar + '44' : g.surfaceBorder}`,
                    borderRadius: 12, padding: '10px 14px', marginBottom: 8,
                    opacity: locked ? 0.4 : 1,
                  }}>
                    <div onClick={() => {
                      if (!locked && !topic.is_completed) {
                        onCompleteTopic(topic.id, goal.id);
                        // Pre-fetch quiz for next incomplete topic
                        const nextTopic = goalTopics.find(t => !t.is_completed && t.id !== topic.id);
                        if (nextTopic) prefetchQuiz(nextTopic);
                      }
                    }}
                      style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        background: topic.is_completed ? g.okBar : locked ? `${g.card}22` : `${g.card}18`,
                        border: `1.5px solid ${topic.is_completed ? g.okBar : g.card}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: locked ? 'not-allowed' : 'pointer' }}>
                      {topic.is_completed && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text bold={!topic.is_completed} g={g} size={13}
                        style={{ textDecoration: topic.is_completed ? 'line-through' : 'none' }}>
                        {topic.title}
                      </Text>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        {topic.domain     && <Text size={11} muted g={g}>{topic.domain}</Text>}
                        {topic.difficulty && <Text size={11} muted g={g}>· {topic.difficulty}</Text>}
                        {topic.estimated_mins && <Text size={11} muted g={g}>· ~{topic.estimated_mins}m</Text>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                      {!topic.is_completed && !locked && (
                        <Btn size="sm" g={g} onClick={() => generateQuiz(topic)}
                          style={{ opacity: quizLoading && !quizCache.current[topic.id] ? 0.4 : 1 }}>
                          {quizReady[topic.id] ? '⚡ Quiz' : quizLoading ? '…' : 'Quiz'}
                        </Btn>
                      )}
                      {topic.url && (
                        <a href={topic.url} target="_blank" rel="noreferrer" style={{
                          fontSize: 12, color: g.accent, textDecoration: 'none',
                          background: `${g.card}14`, border: `1px solid ${g.surfaceBorder}`,
                          borderRadius: 6, padding: '3px 8px',
                        }}>↗</a>
                      )}
                    </div>
                  </div>
                );
              })
          }

        </div>
      )}

      {showAddTopic && (
        <AddTopicModal goalId={goal.id} g={g} onAdd={handleAddTopic} onClose={() => setShowAddTopic(false)} />
      )}
      {activeQuiz && (
        <QuizModal quiz={activeQuiz.quiz} topicTitle={activeQuiz.topicTitle} g={g}
          onClose={() => setActiveQuiz(null)} />
      )}
    </div>
  );
}

// ── COMPLETED GOALS SECTION ───────────────────────────────────────────────────

function CompletedGoals({ goals, topics, g, onReopen, onDelete }) {
  if (!goals.length) return null;

  return (
    <div style={{ marginTop: 8, paddingTop: 16, borderTop: `1.5px solid ${g.surfaceBorder}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Text size={16} bold g={g}>Completed</Text>
        <Text size={11} muted g={g}>({goals.length})</Text>
      </div>

      {/* Fixed-height scroll — ~3 cards visible */}
      <div style={{
        height: Math.min(goals.length, 3) * 76 + (goals.length > 3 ? 8 : 0),
        maxHeight: 236, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {goals.map(goal => {
          const goalTopics = topics.filter(t => t.goal_id === goal.id);
          const completedAt = goal.completed_at ? new Date(goal.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          return (
            <div key={goal.id} style={{
              display: 'flex', alignItems: 'center',
              background: `${g.okBar}10`, border: `1px solid ${g.okBar}33`,
              borderRadius: 12, padding: '10px 14px', flexShrink: 0, gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: g.okBar,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: '#fff', fontSize: 14 }}>✓</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size={13} bold g={g} style={{ display: 'block',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {goal.title}
                </Text>
                <Text size={11} muted g={g}>
                  {goalTopics.length} topics · {goal.completed_hours || 0}h{completedAt ? ` · ${completedAt}` : ''}
                </Text>
              </div>
              <button onClick={() => onReopen(goal.id)} style={{
                background: 'none', border: `1px solid ${g.surfaceBorder}`,
                borderRadius: 8, padding: '3px 10px', fontSize: 11,
                color: g.muted, cursor: 'pointer', flexShrink: 0,
              }}>Reopen</button>
              <button onClick={() => { if (confirm('Delete this goal?')) onDelete(goal.id); }}
                style={{ background: 'none', border: 'none', color: g.muted, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                🗑
              </button>
            </div>
          );
        })}
      </div>

      {goals.length > 3 && (
        <Text size={11} muted g={g} style={{ textAlign: 'center', marginTop: 4 }}>
          ↕ Scroll to see all {goals.length} completed goals
        </Text>
      )}
    </div>
  );
}

// ── MAIN LEARNING VIEW ────────────────────────────────────────────────────────

export default function Learning({
  goals, topics, linkGroups, links, g, aiConfig,
  onAddGoal, onUpdateGoal, onCompleteGoal,
  onLogHours, onDeleteGoal,
  onAddTopic, onCompleteTopic, onReplaceTopics,
  onAddLink, onDeleteLink,
  triggerAddGoal, onAddGoalDone,
}) {
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [showAddGoal,  setShowAddGoal]  = useState(false);

  useEffect(() => {
    if (triggerAddGoal) { setShowAddGoal(true); onAddGoalDone?.(); }
  }, [triggerAddGoal]);

  const activeGoals    = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);

  const handleReopen = (id) => onCompleteGoal(id, false);

  const totalPct = activeGoals.length === 0 ? 0 : Math.round(
    activeGoals.reduce((sum, goal) => {
      const gt = topics.filter(t => t.goal_id === goal.id);
      const tp = gt.length > 0 ? gt.filter(t => t.is_completed).length / gt.length : 0;
      const hp = goal.target_hours > 0 ? Math.min((goal.completed_hours || 0) / goal.target_hours, 1) : 0;
      return sum + ((tp + hp) / 2);
    }, 0) / activeGoals.length * 100
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Text size={26} bold g={g}>Learning </Text>
          <Text size={26} italic color={g.accent}>Goals.</Text>
        </div>
      </div>

      {/* ── Overall progress strip ── */}
      {activeGoals.length > 0 && (
        <Surface g={g} style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text size={12} bold g={g}>{activeGoals.length} active goal{activeGoals.length > 1 ? 's' : ''}</Text>
            <Text size={12} bold g={g}>{totalPct}% overall</Text>
          </div>
          <ProgressBar pct={totalPct} g={g} />
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <Text size={11} muted g={g}>📚 {topics.filter(t => activeGoals.some(g => g.id === t.goal_id) && !t.is_completed).length} topics left</Text>
            <Text size={11} muted g={g}>✓ {topics.filter(t => t.is_completed).length} completed</Text>
            <Text size={11} muted g={g}>🏆 {completedGoals.length} goals done</Text>
          </div>
        </Surface>
      )}

      {/* ── Section 1: Active Goals ── */}
      {activeGoals.length === 0 && (
        <Surface g={g} style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
          <Text muted g={g} size={13}>No active goals. Add your first learning goal.</Text>
        </Surface>
      )}

      {activeGoals.map(goal => (
        <ActiveGoalCard
          key={goal.id}
          goal={goal}
          topics={topics}
          g={g}
          aiConfig={aiConfig}
          isActive={activeGoalId === goal.id}
          onToggle={(id) => setActiveGoalId(prev => prev === id ? null : id)}
          onLogHours={onLogHours}
          onDeleteGoal={onDeleteGoal}
          onCompleteGoal={onCompleteGoal}
          onAddTopic={onAddTopic}
          onCompleteTopic={onCompleteTopic}
          onReplaceTopics={onReplaceTopics}
        />
      ))}

      {/* ── Section 3: Completed Goals ── */}
      <CompletedGoals
        goals={completedGoals}
        topics={topics}
        g={g}
        onReopen={handleReopen}
        onDelete={onDeleteGoal}
      />

      {/* Modals */}
      {showAddGoal && <AddGoalModal g={g} onAdd={onAddGoal} onClose={() => setShowAddGoal(false)} />}
    </div>
  );
}
