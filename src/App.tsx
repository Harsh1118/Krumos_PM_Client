import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { Toaster } from './components/Toaster';
import { AppRoutes } from './route/Routes';

function App() {
  return (
    <WorkspaceProvider>
      <SocketProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster />
        </ToastProvider>
      </SocketProvider>
    </WorkspaceProvider>
  );
}

export default App;
