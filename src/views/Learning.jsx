// src/views/Learning.jsx
import { useState } from 'react';
import { Text, SectionLabel, Surface, GemCard, ProgressBar, Tag, Btn, Input, Textarea, Select, Modal, LinkGroupWidget } from '../components/ui';
import { callAI, parseJSON, prompts, DEFAULT_AI_CONFIG } from '../ai/service';

function uuid() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36); }

// ── SKILL TREE SVG ────────────────────────────────────────────────────────────

function SkillTree({ topics, g }) {
  if (!topics.length) return <Text muted g={g} size={13}>No topics yet.</Text>;

  // Simple layered layout by sort_order depth
  const positioned = topics.map((t, i) => ({
    ...t,
    x: 40 + (i % 4) * 72,
    y: 30 + Math.floor(i / 4) * 72,
  }));

  const height = Math.ceil(topics.length / 4) * 72 + 40;

  return (
    <svg width="100%" height={height} viewBox={`0 0 340 ${height}`} style={{ overflow: 'visible' }}>
      {/* Edges */}
      {positioned.map(n =>
        (n.dependencies || []).map(depId => {
          const dep = positioned.find(p => p.id === depId);
          if (!dep) return null;
          return <line key={`${n.id}-${depId}`} x1={dep.x} y1={dep.y} x2={n.x} y2={n.y}
            stroke={`${g.accent}44`} strokeWidth={1.5} strokeDasharray="4 2" />;
        })
      )}
      {/* Nodes */}
      {positioned.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={20}
            fill={n.is_completed ? g.okBar : n.domain ? g.card : `${g.card}44`}
            opacity={n.dependencies?.some(d => !topics.find(t => t.id === d)?.is_completed) ? 0.4 : 1}
          />
          <text x={n.x} y={n.y - 27} textAnchor="middle" fontSize={9} fill={g.muted}
            style={{ maxWidth: 60 }}>
            {n.title.split(' ').slice(0, 2).join(' ')}
          </text>
          {n.is_completed && <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize={14} fill="#fff">✓</text>}
          {!n.is_completed && n.domain && <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={10} fill={g.cardText}>▶</text>}
        </g>
      ))}
    </svg>
  );
}

// ── QUIZ MODAL ────────────────────────────────────────────────────────────────

function QuizModal({ quiz, topicTitle, g, onClose }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const q = quiz[current];
  const score = Object.entries(answers).filter(([i, a]) => quiz[Number(i)].correctIndex === a).length;

  if (submitted) {
    return (
      <Modal title="Quiz Complete!" g={g} onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{score >= 4 ? '🏆' : score >= 3 ? '👍' : '📚'}</div>
          <Text size={22} bold g={g}>{score}/5</Text>
          <br /><Text size={14} muted g={g} style={{ marginTop: 8, display: 'block' }}>
            {score >= 4 ? 'Excellent! You\'ve mastered this topic.' : score >= 3 ? 'Good job! Review the ones you missed.' : 'Keep studying — you\'ll get it!'}
          </Text>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quiz.map((q, i) => (
              <div key={i} style={{ background: `${answers[i] === q.correctIndex ? g.okBar : g.urgentBar}18`,
                border: `1px solid ${answers[i] === q.correctIndex ? g.okBar : g.urgentBar}44`,
                borderRadius: 10, padding: '10px 14px', textAlign: 'left' }}>
                <Text size={12} bold g={g}>{q.question}</Text>
                <br /><Text size={11} muted g={g}>✓ {q.options[q.correctIndex]}</Text>
                {q.explanation && <><br /><Text size={11} color={g.muted}>{q.explanation}</Text></>}
              </div>
            ))}
          </div>
          <Btn g={g} size="lg" style={{ marginTop: 16 }} onClick={onClose}>Done</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Quiz: ${topicTitle}`} g={g} onClose={onClose}>
      <div style={{ marginBottom: 12 }}>
        <Text size={11} muted g={g}>Question {current + 1} of {quiz.length}</Text>
        <div style={{ marginTop: 6, height: 4, background: `${g.card}18`, borderRadius: 2 }}>
          <div style={{ width: `${(current / quiz.length) * 100}%`, height: '100%', background: g.accent, borderRadius: 2 }} />
        </div>
      </div>
      <Text size={15} bold g={g} style={{ display: 'block', marginBottom: 16 }}>{q.question}</Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => setAnswers(prev => ({ ...prev, [current]: i }))}
            style={{
              background: answers[current] === i ? `${g.card}20` : 'rgba(255,255,255,0.7)',
              border: `1.5px solid ${answers[current] === i ? g.card : g.surfaceBorder}`,
              borderRadius: 10, padding: '11px 14px', cursor: 'pointer',
              textAlign: 'left', fontSize: 13, color: g.text, fontFamily: 'system-ui',
            }}>{opt}</button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <Btn variant="secondary" g={g} onClick={() => setCurrent(c => Math.max(0, c-1))}
          style={{ opacity: current === 0 ? 0.3 : 1 }}>← Back</Btn>
        {current < quiz.length - 1
          ? <Btn g={g} onClick={() => setCurrent(c => c+1)} style={{ opacity: answers[current] == null ? 0.4 : 1 }}>Next →</Btn>
          : <Btn g={g} onClick={() => setSubmitted(true)} style={{ opacity: Object.keys(answers).length < quiz.length ? 0.4 : 1 }}>Submit</Btn>
        }
      </div>
    </Modal>
  );
}

// ── ADD TOPIC FORM ────────────────────────────────────────────────────────────

function AddTopicModal({ goalId, g, onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!title.trim()) return;
    setLoading(true); setError('');
    try {
      await onAdd(goalId, { id: uuid(), title: title.trim(), url: url.trim() || null, domain: null, difficulty: null, estimated_mins: 30, dependencies: [], sort_order: 0 });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Add Topic" g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input g={g} placeholder="Topic title *" value={title} onChange={e => setTitle(e.target.value)} />
        <Input g={g} placeholder="URL (optional)" value={url} onChange={e => setUrl(e.target.value)} />
        {error && <Text size={12} color={g.urgentBar}>{error}</Text>}
        <Btn g={g} size="lg" onClick={handleAdd} style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Processing with AI…' : 'Add Topic'}
        </Btn>
      </div>
    </Modal>
  );
}

// ── ADD GOAL FORM ─────────────────────────────────────────────────────────────

function AddGoalModal({ g, onAdd, onClose }) {
  const [form, setForm] = useState({ title: '', category: 'Programming', target_hours: 20, due_date: '', tags: '', color: g.card });
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <Modal title="New Learning Goal" g={g} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input g={g} placeholder="Goal title *" value={form.title} onChange={f('title')} />
        <Select g={g} value={form.category} onChange={f('category')}>
          {['Programming','Language','Design','Business','Science','Health','Other'].map(c => <option key={c}>{c}</option>)}
        </Select>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input g={g} type="number" placeholder="Target hours" value={form.target_hours} onChange={f('target_hours')} />
          <Input g={g} type="date" value={form.due_date} onChange={f('due_date')} />
        </div>
        <Input g={g} placeholder="Tags (comma separated)" value={form.tags} onChange={f('tags')} />
        <Btn g={g} size="lg" onClick={() => {
          if (!form.title.trim()) return;
          onAdd({ ...form, target_hours: Number(form.target_hours), tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) });
          onClose();
        }}>Create Goal</Btn>
      </div>
    </Modal>
  );
}

// ── MAIN VIEW ─────────────────────────────────────────────────────────────────

export default function Learning({ goals, topics, linkGroups, links, g, aiConfig,
  onAddGoal, onUpdateGoal, onLogHours, onDeleteGoal,
  onAddTopic, onCompleteTopic, onReplaceTopics,
  onAddLinkGroup, onAddLink, onDeleteLink,
}) {
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [treeView, setTreeView] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null); // { quiz, topicTitle }
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [logHoursId, setLogHoursId] = useState(null);
  const [logVal, setLogVal] = useState('');

  const activeGoal = goals.find(g => g.id === activeGoalId);
  const activeTopics = activeGoalId ? topics.filter(t => t.goal_id === activeGoalId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) : [];

  const tabGroups = linkGroups.filter(lg => lg.tab_id === 'learning');

  // ── AI: classify + reorder all topics on add ──────────────────────────────
  const handleAddTopic = async (goalId, raw) => {
    const newTopic = await onAddTopic(goalId, raw);
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const allTopics = [...topics.filter(t => t.goal_id === goalId), newTopic];

    setAiLoading(true); setAiError('');
    try {
      const raw2 = await callAI(
        'topicClassify',
        prompts.topicClassify.user(goal, allTopics),
        prompts.topicClassify.system,
        aiConfig || DEFAULT_AI_CONFIG
      );
      const classified = parseJSON(raw2);
      const merged = classified.map((c, i) => {
        const existing = allTopics.find(t => t.id === c.id) || newTopic;
        return { ...existing, ...c, sort_order: i };
      });
      await onReplaceTopics(goalId, merged);
    } catch (e) {
      setAiError(`AI classification failed: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // ── AI: generate quiz ─────────────────────────────────────────────────────
  const generateQuiz = async (topic) => {
    setAiLoading(true); setAiError('');
    try {
      const raw = await callAI('quizGenerate', prompts.quizGenerate.user(topic), prompts.quizGenerate.system, aiConfig || DEFAULT_AI_CONFIG);
      const quiz = parseJSON(raw);
      setActiveQuiz({ quiz, topicTitle: topic.title });
    } catch (e) {
      setAiError(`Quiz generation failed: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const goalProgress = (goal) => {
    const goalTopics = topics.filter(t => t.goal_id === goal.id);
    const topicPct = goalTopics.length > 0 ? goalTopics.filter(t => t.is_completed).length / goalTopics.length : 0;
    const hoursPct = goal.target_hours > 0 ? Math.min(goal.completed_hours / goal.target_hours, 1) : 0;
    return Math.round(((topicPct + hoursPct) / 2) * 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Text size={26} bold g={g}>Learning </Text>
          <Text size={26} italic color={g.accent}>Goals.</Text>
        </div>
        <Btn g={g} size="sm" onClick={() => setShowAddGoal(true)}>＋ Goal</Btn>
      </div>

      {/* Goal cards */}
      {goals.length === 0 && (
        <Surface g={g}>
          <Text muted g={g} size={13}>No learning goals yet. Add your first goal to get started.</Text>
        </Surface>
      )}

      {goals.map(goal => {
        const pct = goalProgress(goal);
        const isActive = activeGoalId === goal.id;
        return (
          <div key={goal.id}>
            <GemCard g={g} style={{ cursor: 'pointer', borderBottom: isActive ? `3px solid ${g.cardMuted}` : 'none' }}
              onClick={() => setActiveGoalId(isActive ? null : goal.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <Text bold color={g.cardText} size={15}>{goal.title}</Text>
                  <br /><Text size={11} color={g.cardMuted}>{goal.category} · Due {goal.due_date || 'TBD'}</Text>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.18)', color: g.cardText, fontSize: 12, fontWeight: 600 }}>
                  {pct}%
                </span>
              </div>
              <ProgressBar pct={pct} g={{ ...g, accent: g.cardMuted }} color={g.cardMuted} />
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {(goal.tags || []).map(t => (
                  <span key={t} style={{ padding: '2px 8px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.15)', color: g.cardMuted, fontSize: 10 }}>{t}</span>
                ))}
                <button onClick={(e) => { e.stopPropagation(); setLogHoursId(goal.id); }}
                  style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none',
                    color: g.cardText, borderRadius: 8, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                  + Log hours
                </button>
                <button onClick={(e) => { e.stopPropagation(); /* share */ }}
                  style={{ background: 'none', border: 'none', color: g.cardMuted, fontSize: 11, cursor: 'pointer' }}>
                  ↗ Share
                </button>
              </div>
              {logHoursId === goal.id && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                  <input type="number" min={0.5} step={0.5} value={logVal} onChange={e => setLogVal(e.target.value)}
                    placeholder="Hours" style={{ background: 'rgba(255,255,255,0.2)', border: 'none',
                      color: g.cardText, borderRadius: 8, padding: '5px 10px', fontSize: 12, width: 80 }} />
                  <button onClick={() => { onLogHours(goal.id, logVal); setLogHoursId(null); setLogVal(''); }}
                    style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: g.cardText,
                      borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>Save</button>
                </div>
              )}
            </GemCard>

            {/* Expanded topics */}
            {isActive && (
              <div style={{ background: `${g.accentLight}`, border: `1px solid ${g.surfaceBorder}`,
                borderTop: 'none', borderRadius: '0 0 16px 16px', padding: 14 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <SectionLabel g={g}>{activeTopics.length} Topics</SectionLabel>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn size="sm" variant={treeView ? 'primary' : 'secondary'} g={g}
                      onClick={() => setTreeView(v => !v)}>
                      {treeView ? '📋 List' : '🌳 Tree'}
                    </Btn>
                    <Btn size="sm" g={g} onClick={() => setShowAddTopic(true)}>＋ Topic</Btn>
                  </div>
                </div>

                {aiLoading && (
                  <div style={{ padding: '8px 0', textAlign: 'center' }}>
                    <Text size={12} muted g={g}>🤖 AI is classifying and ordering topics…</Text>
                  </div>
                )}
                {aiError && <Text size={12} color={g.urgentBar}>{aiError}</Text>}

                {treeView
                  ? <SkillTree topics={activeTopics} g={g} />
                  : activeTopics.map((topic, i) => {
                    const locked = (topic.dependencies || []).some(depId => {
                      const dep = activeTopics.find(t => t.id === depId);
                      return dep && !dep.is_completed;
                    });
                    return (
                      <div key={topic.id} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        background: topic.is_completed ? `${g.okBar}10` : 'rgba(255,255,255,0.65)',
                        border: `1.5px solid ${topic.is_completed ? g.okBar+'44' : g.surfaceBorder}`,
                        borderRadius: 12, padding: '10px 14px', marginBottom: 8,
                        opacity: locked ? 0.4 : 1,
                      }}>
                        <div onClick={() => !locked && !topic.is_completed && onCompleteTopic(topic.id, goal.id)}
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
                          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                            {topic.domain && <Text size={11} muted g={g}>{topic.domain}</Text>}
                            {topic.difficulty && <Text size={11} muted g={g}>· {topic.difficulty}</Text>}
                            {topic.estimated_mins && <Text size={11} muted g={g}>· ~{topic.estimated_mins}m</Text>}
                          </div>
                          {(topic.dependencies || []).length > 0 && (
                            <Text size={10} muted g={g}>
                              needs: {topic.dependencies.map(d => activeTopics.find(t => t.id === d)?.title || '?').join(', ')}
                            </Text>
                          )}
                        </div>
                        {!topic.is_completed && !locked && (
                          <Btn size="sm" g={g} onClick={() => generateQuiz(topic)}
                            style={{ opacity: aiLoading ? 0.4 : 1 }}>Quiz</Btn>
                        )}
                        {topic.url && (
                          <a href={topic.url} target="_blank" rel="noreferrer"
                            style={{ fontSize: 12, color: g.accent }}>↗</a>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
        );
      })}

      {/* Link groups */}
      <LinkGroupWidget
        groups={tabGroups} links={links.filter(l => tabGroups.some(g => g.id === l.group_id))}
        g={g}
        onAddGroup={(name) => onAddLinkGroup('learning', name)}
        onAddLink={onAddLink}
        onDeleteLink={onDeleteLink}
      />

      {/* Modals */}
      {showAddGoal && <AddGoalModal g={g} onAdd={onAddGoal} onClose={() => setShowAddGoal(false)} />}
      {showAddTopic && activeGoalId && (
        <AddTopicModal goalId={activeGoalId} g={g} onAdd={handleAddTopic} onClose={() => setShowAddTopic(false)} />
      )}
      {activeQuiz && (
        <QuizModal quiz={activeQuiz.quiz} topicTitle={activeQuiz.topicTitle} g={g}
          onClose={() => setActiveQuiz(null)} />
      )}
    </div>
  );
}
