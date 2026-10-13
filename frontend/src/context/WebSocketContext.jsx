import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const wsRef = useRef(null);
  const listenersRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);

  const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000/ws';

  const connect = useCallback(() => {
    if (!token || !isAuthenticated) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const socketUrl = `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('⚡ Connected to Akatsuki Real-Time WebSocket stream');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent(data);
          // Broadcast to all active subscribers (e.g. active chat room)
          listenersRef.current.forEach((cb) => {
            try {
              cb(data);
            } catch (err) {
              console.error('Error in WS subscriber callback:', err);
            }
          });
        } catch (err) {
          console.error('Failed to parse WebSocket message frame:', err, event.data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt automatic reconnection after 3 seconds if still authenticated
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('Akatsuki WebSocket error:', error);
        ws.close();
      };
    } catch (err) {
      console.error('Could not initialize WebSocket:', err);
    }
  }, [token, isAuthenticated, WS_BASE_URL]);

  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, token, connect]);

  // Subscribe to raw incoming websocket events
  const subscribe = useCallback((callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  // Send typing event over WebSocket
  const sendTyping = useCallback((conversationId, isTyping = true) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({
        event: 'typing',
        conversation_id: conversationId,
        is_typing: isTyping,
      });
      wsRef.current.send(payload);
    }
  }, []);

  const value = {
    isConnected,
    lastEvent,
    subscribe,
    sendTyping,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
