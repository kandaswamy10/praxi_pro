// src/hooks/useData.js
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [linkGroups, setLinkGroups] = useState([]);
  const [links, setLinks]           = useState([]);
  const [ready, setReady]           = useState(false);

  const store = useMemo(() => {
    if (!session || !profile) return null;
    return createStore(session.user.id, profile.storage_mode);
  }, [session, profile?.storage_mode]);

  useEffect(() => {
    if (!store) return;
    (async () => {
      const [e, g, t, lg, l] = await Promise.all([
        store.getAll('events'),
        store.getAll('learning_goals'),
        store.getAll('topics'),
        store.getAll('link_groups'),
        store.getAll('links'),
      ]);
      setEvents(e.data || []);
      setGoals(g.data || []);
      setTopics(t.data || []);
      setLinkGroups(lg.data || []);
      setLinks(l.data || []);
      setReady(true);
    })();
  }, [store]);

  const addEvent = useCallback(async (payload) => {
    const item = { ...payload, id: uuid(), created_at: new Date().toISOString(), is_completed: false, alarm_fired: false };
    setEvents(prev => [item, ...prev]);
    await store?.upsert('events', item);
    return item;
  }, [store]);

  const updateEvent = useCallback(async (id, updates) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    const current = events.find(e => e.id === id);
    if (current) await store?.upsert('events', { ...current, ...updates });
  }, [store, events]);

  const deleteEvent = useCallback(async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    await store?.remove('events', id);
  }, [store]);

  const addGoal = useCallback(async (payload) => {
    const item = { ...payload, id: uuid(), completed_hours: 0, is_shared: false, share_token: null, created_at: new Date().toISOString() };
    setGoals(prev => [item, ...prev]);
    await store?.upsert('learning_goals', item);
    return item;
  }, [store]);

  const updateGoal = useCallback(async (id, updates) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    const current = goals.find(g => g.id === id);
    if (current) await store?.upsert('learning_goals', { ...current, ...updates });
  }, [store, goals]);

  const logHours = useCallback(async (goalId, hours) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const next = Math.min(goal.completed_hours + Number(hours), goal.target_hours);
    await updateGoal(goalId, { completed_hours: next });
  }, [goals, updateGoal]);

  const deleteGoal = useCallback(async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    setTopics(prev => prev.filter(t => t.goal_id !== id));
    await store?.remove('learning_goals', id);
  }, [store]);

  const addTopic = useCallback(async (goalId, payload) => {
    const item = { ...payload, id: uuid(), goal_id: goalId, is_completed: false, quiz: [], created_at: new Date().toISOString() };
    setTopics(prev => [...prev, item]);
    await store?.upsert('topics', item);
    return item;
  }, [store]);

  const updateTopic = useCallback(async (id, updates) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const current = topics.find(t => t.id === id);
    if (current) await store?.upsert('topics', { ...current, ...updates });
  }, [store, topics]);

  const completeTopic = useCallback(async (topicId, goalId) => {
    await updateTopic(topicId, { is_completed: true, completed_at: new Date().toISOString() });
    const goalTopics = topics.filter(t => t.goal_id === goalId);
    const done = goalTopics.filter(t => t.is_completed || t.id === topicId).length;
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      const hoursFromTopics = goalTopics.reduce((s, t) => s + (t.estimated_mins || 30), 0) / 60;
      const increment = goalTopics.length > 0 ? hoursFromTopics / goalTopics.length : 0;
      await updateGoal(goalId, { completed_hours: Math.min(goal.completed_hours + increment, goal.target_hours) });
    }
  }, [topics, goals, updateTopic, updateGoal]);

  const replaceTopics = useCallback(async (goalId, newTopics) => {
    const items = newTopics.map((t, i) => ({ ...t, goal_id: goalId, sort_order: i }));
    setTopics(prev => [...prev.filter(t => t.goal_id !== goalId), ...items]);
    await Promise.all(items.map(t => store?.upsert('topics', t)));
  }, [store]);

  const addLinkGroup = useCallback(async (tabId, name, isDefault = false) => {
    const item = { id: uuid(), tab_id: tabId, name, is_default: isDefault, is_shared: false, share_token: null, created_at: new Date().toISOString() };
    setLinkGroups(prev => [...prev, item]);
    await store?.upsert('link_groups', item);
    return item;
  }, [store]);

  const addLink = useCallback(async (groupId, title, url) => {
    const item = { id: uuid(), group_id: groupId, title, url, created_at: new Date().toISOString() };
    setLinks(prev => [...prev, item]);
    await store?.upsert('links', item);
    return item;
  }, [store]);

  const deleteLink = useCallback(async (id) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    await store?.remove('links', id);
  }, [store]);

  const topicsForGoal = useCallback((goalId) =>
    topics.filter(t => t.goal_id === goalId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  [topics]);

  const linksForGroup = useCallback((groupId) =>
    links.filter(l => l.group_id === groupId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  [links]);

  const groupsForTab = useCallback((tabId) =>
    linkGroups.filter(g => g.tab_id === tabId),
  [linkGroups]);

  return {
    ready, events, goals, topics, linkGroups, links,
    addEvent, updateEvent, deleteEvent,
    addGoal, updateGoal, logHours, deleteGoal,
    addTopic, updateTopic, completeTopic, replaceTopics,
    addLinkGroup, addLink, deleteLink,
    topicsForGoal, linksForGroup, groupsForTab,
  };
}
