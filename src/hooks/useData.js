// src/hooks/useData.js
import { useState, useEffect, useRef } from 'react';
import { createStore } from '../lib/storage';
import { useAuth } from './useAuth.jsx';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
}

export function useData() {
  const { session, profile } = useAuth();
  const [events, setEvents]         = useState([]);
  const [goals, setGoals]           = useState([]);
  const [topics, setTopics]         = useState([]);
  const [linkGroups, setLinkGroups]     = useState([]);
  const [links, setLinks]               = useState([]);
  const [meetingNotes, setMeetingNotes] = useState([]);
  const [ready, setReady]               = useState(false);

  // Refs so plain async functions always see latest state
  const eventsRef      = useRef(events);
  const goalsRef       = useRef(goals);
  const topicsRef      = useRef(topics);
  const notesRef       = useRef(meetingNotes);
  const storeRef       = useRef(null);

  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);
  useEffect(() => { topicsRef.current = topics; }, [topics]);
  useEffect(() => { notesRef.current = meetingNotes; }, [meetingNotes]);

  // Rebuild store when session/profile changes
  useEffect(() => {
    if (!session || !profile) return;
    storeRef.current = createStore(session.user.id, profile.storage_mode);

    // Load all data
    (async () => {
      try {
        const [e, g, t, lg, l, mn] = await Promise.all([
          storeRef.current.getAll('events'),
          storeRef.current.getAll('learning_goals'),
          storeRef.current.getAll('topics'),
          storeRef.current.getAll('link_groups'),
          storeRef.current.getAll('links'),
          storeRef.current.getAll('meeting_notes'),
        ]);
        setEvents(e.data || []);
        setGoals(g.data || []);
        setTopics(t.data || []);
        setLinkGroups(lg.data || []);
        setLinks(l.data || []);
        setMeetingNotes(mn.data || []);
      } catch (err) {
        console.warn('Data load error:', err);
      } finally {
        setReady(true);
      }
    })();
  }, [session?.user?.id, profile?.storage_mode]);

  // ── EVENTS ──────────────────────────────────────────────────────────────────
  const addEvent = async (payload) => {
    const item = { ...payload, id: uuid(), created_at: new Date().toISOString(), is_completed: false, alarm_fired: false };
    setEvents(prev => [item, ...prev]);
    await storeRef.current?.upsert('events', item);
    return item;
  };

  const updateEvent = async (id, updates) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    const current = eventsRef.current.find(e => e.id === id);
    if (current) await storeRef.current?.upsert('events', { ...current, ...updates });
  };

  const deleteEvent = async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    await storeRef.current?.remove('events', id);
  };

  // ── GOALS ───────────────────────────────────────────────────────────────────
  const addGoal = async (payload) => {
    const item = { ...payload, id: uuid(), completed_hours: 0, is_shared: false, share_token: null, created_at: new Date().toISOString() };
    setGoals(prev => [item, ...prev]);
    await storeRef.current?.upsert('learning_goals', item);
    return item;
  };

  const updateGoal = async (id, updates) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    const current = goalsRef.current.find(g => g.id === id);
    if (current) await storeRef.current?.upsert('learning_goals', { ...current, ...updates });
  };

  const logHours = async (goalId, hours) => {
    const goal = goalsRef.current.find(g => g.id === goalId);
    if (!goal) return;
    const next = Math.min(goal.completed_hours + Number(hours), goal.target_hours);
    await updateGoal(goalId, { completed_hours: next });
  };

  const deleteGoal = async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    setTopics(prev => prev.filter(t => t.goal_id !== id));
    await storeRef.current?.remove('learning_goals', id);
  };

  // ── TOPICS ──────────────────────────────────────────────────────────────────
  const addTopic = async (goalId, payload) => {
    const item = { ...payload, id: uuid(), goal_id: goalId, is_completed: false, quiz: [], created_at: new Date().toISOString() };
    setTopics(prev => [...prev, item]);
    await storeRef.current?.upsert('topics', item);
    return item;
  };

  const updateTopic = async (id, updates) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const current = topicsRef.current.find(t => t.id === id);
    if (current) await storeRef.current?.upsert('topics', { ...current, ...updates });
  };

  const completeTopic = async (topicId, goalId) => {
    await updateTopic(topicId, { is_completed: true, completed_at: new Date().toISOString() });
    const goalTopics = topicsRef.current.filter(t => t.goal_id === goalId);
    const goal = goalsRef.current.find(g => g.id === goalId);
    if (goal && goalTopics.length > 0) {
      const increment = (goal.target_hours / goalTopics.length) * 0.5;
      await updateGoal(goalId, { completed_hours: Math.min(goal.completed_hours + increment, goal.target_hours) });
    }
  };

  const replaceTopics = async (goalId, newTopics) => {
    const items = newTopics.map((t, i) => ({ ...t, goal_id: goalId, sort_order: i }));
    setTopics(prev => [...prev.filter(t => t.goal_id !== goalId), ...items]);
    await Promise.all(items.map(t => storeRef.current?.upsert('topics', t)));
  };

  // ── LINK GROUPS ─────────────────────────────────────────────────────────────
  const addLinkGroup = async (tabId, name, isDefault = false) => {
    const item = { id: uuid(), tab_id: tabId, name, is_default: isDefault, is_shared: false, share_token: null, created_at: new Date().toISOString() };
    setLinkGroups(prev => [...prev, item]);
    await storeRef.current?.upsert('link_groups', item);
    return item;
  };

  const addLink = async (groupId, title, url) => {
    const item = { id: uuid(), group_id: groupId, title, url, created_at: new Date().toISOString() };
    setLinks(prev => [...prev, item]);
    await storeRef.current?.upsert('links', item);
    return item;
  };

  const deleteLink = async (id) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    await storeRef.current?.remove('links', id);
  };

  // ── MEETING NOTES ────────────────────────────────────────────────────────────
  const addMeetingNote = async (payload) => {
    const item = { ...payload, id: uuid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setMeetingNotes(prev => [item, ...prev]);
    await storeRef.current?.upsert('meeting_notes', item);
    return item;
  };

  const updateMeetingNote = async (id, updates) => {
    const updated_at = new Date().toISOString();
    setMeetingNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updated_at } : n));
    const current = notesRef.current.find(n => n.id === id);
    if (current) await storeRef.current?.upsert('meeting_notes', { ...current, ...updates, updated_at });
  };

  const deleteMeetingNote = async (id) => {
    setMeetingNotes(prev => prev.filter(n => n.id !== id));
    await storeRef.current?.remove('meeting_notes', id);
  };

  return {
    ready, events, goals, topics, linkGroups, links, meetingNotes,
    addEvent, updateEvent, deleteEvent,
    addGoal, updateGoal, logHours, deleteGoal,
    addTopic, updateTopic, completeTopic, replaceTopics,
    addLinkGroup, addLink, deleteLink,
    addMeetingNote, updateMeetingNote, deleteMeetingNote,
  };
}
