import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';

const WS_URL = import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_URL?.replace('/api','') ?? 'http://localhost:3001';

// ── useSocket — connects to the org WebSocket room ────────────────────────────

export function useSocket() {
  const { org }   = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected]   = useState(false);
  const [presence,  setPresence]    = useState([]);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!org) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Dynamically import socket.io-client to avoid it in the main bundle
    import('socket.io-client').then(({ io }) => {
      const socket = io(WS_URL, {
        auth:       { token, orgId: org.id, page: window.location.pathname },
        transports: ['websocket','polling'],
        reconnectionAttempts: 5,
        reconnectionDelay:    1000,
      });

      socketRef.current = socket;

      socket.on('connect',    () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      socket.on('presence:updated', (users) => {
        setPresence(users.filter(u => u.userId !== localStorage.getItem('userId')));
      });

      // Forward all events to registered listeners
      socket.onAny((event, data) => {
        const listeners = listenersRef.current[event] ?? [];
        listeners.forEach(fn => fn(data));
      });

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        if (socket.connected) {
          socket.emit('presence:ping', { page: window.location.pathname });
        }
      }, 15_000);

      return () => {
        clearInterval(heartbeat);
        socket.disconnect();
      };
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [org?.id]);

  // Update page on navigation
  useEffect(() => {
    socketRef.current?.emit('presence:page', { page: window.location.pathname });
  }, [window.location.pathname]);

  const on = useCallback((event, fn) => {
    if (!listenersRef.current[event]) listenersRef.current[event] = [];
    listenersRef.current[event].push(fn);
    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter(l => l !== fn);
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { connected, presence, on, emit, socket: socketRef.current };
}

// ── useEntityPresence — who else is viewing the same entity ──────────────────

export function useEntityPresence(entityType, entityId) {
  const { on, emit } = useSocket();
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    if (!entityId) return;
    emit('entity:focus', { entityType, entityId });

    const offFocus = on('entity:focus', (data) => {
      if (data.entityType === entityType && data.entityId === entityId) {
        setViewers(prev => {
          const exists = prev.find(v => v.userId === data.userId);
          return exists ? prev : [...prev, { userId: data.userId, name: data.userName }];
        });
      }
    });

    const offBlur = on('entity:blur', (data) => {
      if (data.entityType === entityType && data.entityId === entityId) {
        setViewers(prev => prev.filter(v => v.userId !== data.userId));
      }
    });

    return () => {
      emit('entity:blur', { entityType, entityId });
      offFocus();
      offBlur();
    };
  }, [entityType, entityId]);

  return viewers;
}

// ── useRealtimeData — refetch when server pushes an update ───────────────────

export function useRealtimeData(resource, refetchFn) {
  const { on } = useSocket();

  useEffect(() => {
    return on('data:updated', (data) => {
      if (data.resource === resource || data.resource === '*') {
        refetchFn();
      }
    });
  }, [resource, refetchFn]);
}

// ── PresenceAvatars component ─────────────────────────────────────────────────

export function PresenceAvatars({ viewers = [], maxShow = 3 }) {
  if (!viewers.length) return null;

  const shown   = viewers.slice(0, maxShow);
  const overflow = viewers.length - maxShow;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:0 }}>
      {shown.map((v, i) => (
        <div
          key={v.userId}
          title={`${v.name} is viewing`}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: COLORS[i % COLORS.length],
            border: '2px solid var(--color-background-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600, color: '#fff',
            marginLeft: i > 0 ? -8 : 0,
            cursor: 'default',
            zIndex: shown.length - i,
            position: 'relative',
          }}
        >
          {v.name?.charAt(0).toUpperCase() ?? '?'}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--color-background-secondary)', border:'2px solid var(--color-background-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--color-text-secondary)', marginLeft:-8, position:'relative' }}>
          +{overflow}
        </div>
      )}
    </div>
  );
}

const COLORS = ['#2D4A35','#0F6E56','#185FA5','#854F0B','#993C1D'];

// ── OnlineIndicator component ─────────────────────────────────────────────────

export function OnlineIndicator({ connected }) {
  return (
    <div
      title={connected ? 'Live updates active' : 'Connecting…'}
      style={{
        width: 7, height: 7, borderRadius: '50%',
        background: connected ? '#5DCAA5' : '#B4B2A9',
        transition: 'background 0.3s',
      }}
    />
  );
}
