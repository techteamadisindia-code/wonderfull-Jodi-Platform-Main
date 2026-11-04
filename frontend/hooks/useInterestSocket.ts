'use client';

/**
 * useInterestSocket — Authenticated Socket.IO hook for real-time interest events.
 *
 * Security & Architecture:
 * - Server-side authentication: Passes JWT token via `auth: { token }` in handshake.
 * - Server-controlled room assignment: The server verifies the token signature and
 *   automatically places the connection into `user:<userId>`. The client NEVER
 *   controls or emits its own room name.
 * - Dynamic token retrieval: Fetches fresh token from `getAuthToken()` on connect
 *   and each reconnect attempt.
 * - Reconnection: Handles reconnection gracefully, refreshing auth credentials automatically.
 * - Cleanup: Disconnects socket and unbinds listeners on unmount.
 * - Singleton: Exactly one socket connection per mount.
 */

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../lib/api';

export type InterestRestoredPayload = {
  interest: {
    _id: string;
    sender: string | { _id: string; [key: string]: any };
    receiver: string | { _id: string; [key: string]: any };
    status: string;
    [key: string]: any;
  };
  restoredBy: string;
};

type InterestSocketCallbacks = {
  onInterestRestored?: (payload: InterestRestoredPayload) => void;
};

/**
 * Resolves the Socket.IO server URL.
 * - In browser production: same origin (window.location.origin) so cookies/sessions align.
 * - In browser dev: NEXT_PUBLIC_API_URL base or localhost:5000.
 */
function getSocketUrl(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const isLocal =
    process.env.NODE_ENV !== 'production' &&
    /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(hostname);

  if (isLocal) {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }
    return `${window.location.protocol}//${hostname}:5000`;
  }
  return window.location.origin;
}

/**
 * React hook that establishes an authenticated Socket.IO connection and
 * listens for server-originated interestRestored events.
 *
 * @param callbacks - Event handler callbacks
 */
export function useInterestSocket(callbacks: InterestSocketCallbacks): void {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks up-to-date without re-connecting the socket
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = getAuthToken();
    if (!token) return; // Not signed in — do not open unauthenticated connection

    const socketUrl = getSocketUrl();
    if (!socketUrl) return;

    // Connect with server-side authentication handshake.
    // Passing a dynamic auth callback ensures reconnect attempts query current token.
    const socket = io(socketUrl, {
      auth: (cb) => {
        const currentToken = getAuthToken();
        cb({ token: currentToken || '' });
      },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('interestRestored', (payload: InterestRestoredPayload) => {
      callbacksRef.current.onInterestRestored?.(payload);
    });

    socket.on('connect_error', (err: Error) => {
      // Non-fatal: real-time events are progressive enhancements
      console.warn('[InterestSocket] Connection error:', err.message);
    });

    return () => {
      socket.off('interestRestored');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Run once per mount
}
