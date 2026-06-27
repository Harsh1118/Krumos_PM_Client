import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useWorkspaces } from './WorkspaceContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuthStore();
  const { activeWorkspace } = useWorkspaces();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const serverUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    console.log(`Connecting Socket to ${serverUrl}...`);

    const newSocket = io(serverUrl, {
      query: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connection established');
      setIsConnected(true);

      // Join active workspace room if already loaded
      if (activeWorkspace) {
        newSocket.emit('join_workspace', activeWorkspace.slug);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket connection disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  // Handle active workspace room changes
  useEffect(() => {
    if (socket && isConnected && activeWorkspace) {
      console.log(`Joining workspace socket channel: ${activeWorkspace.slug}`);
      socket.emit('join_workspace', activeWorkspace.slug);
    }
  }, [socket, isConnected, activeWorkspace?.slug]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
