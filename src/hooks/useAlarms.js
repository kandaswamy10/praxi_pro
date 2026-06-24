// src/hooks/useAlarms.js
import { useEffect, useRef, useState } from 'react';

export function useAlarms(events) {
  const [alarmQueue, setAlarmQueue] = useState([]);
  const fired = useRef(new Set());

  // Request notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      events.forEach(event => {
        if (!event.alarm_lead_min || event.is_completed) return;
        const [year, month, day] = event.date.split('-').map(Number);
        const [hour, min] = (event.time || '00:00').split(':').map(Number);
        const eventMs = new Date(year, month - 1, day, hour, min).getTime();
        const fireAt = eventMs - event.alarm_lead_min * 60 * 1000;
        const key = `${event.id}-${fireAt}`;
        if (now >= fireAt && !fired.current.has(key)) {
          fired.current.add(key);
          triggerAlarm(event);
        }
      });
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [events]);

  const triggerAlarm = (event) => {
    setAlarmQueue(prev => [...prev, event]);
    if (Notification.permission === 'granted') {
      const n = new Notification(`⏰ ${event.title}`, {
        body: `${event.date} at ${event.time || 'All day'}`,
        icon: '/icon-192.png',
      });
      if (event.url) n.onclick = () => window.open(event.url, '_blank');
    }
  };

  const dismiss = (eventId) =>
    setAlarmQueue(prev => prev.filter(e => e.id !== eventId));

  const snooze = (event, minutes) => {
    dismiss(event.id);
    const snoozeKey = `${event.id}-snooze-${Date.now()}`;
    const fireAt = Date.now() + minutes * 60 * 1000;
    // Re-fire after snooze duration
    setTimeout(() => {
      if (!fired.current.has(snoozeKey)) {
        fired.current.add(snoozeKey);
        triggerAlarm(event);
      }
    }, minutes * 60 * 1000);
  };

  const getClockDeepLink = (event) => {
    const label = encodeURIComponent(`${event.title} — ${event.date} ${event.time || ''}`);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isIOS
      ? `clock-alarm://?name=${label}`
      : `intent://alarm#Intent;scheme=alarm;S.android.intent.extra.alarm.MESSAGE=${label};package=com.android.deskclock;end`;
  };

  return { alarmQueue, dismiss, snooze, getClockDeepLink };
}
