import { BrowserRouter } from 'react-router-dom';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { NetworkStatusProvider } from './network/NetworkStatusContext';
import { OfflineBanner } from './components/OfflineBanner';
import { Toaster } from './components/Toaster';
import { AppRoutes } from './route/Routes';

function App() {
  return (
    <WorkspaceProvider>
      <SocketProvider>
        <ToastProvider>
          <NetworkStatusProvider>
            <BrowserRouter>
              <OfflineBanner />
              <AppRoutes />
            </BrowserRouter>
            <Toaster />
          </NetworkStatusProvider>
        </ToastProvider>
      </SocketProvider>
    </WorkspaceProvider>
  );
}

export default App;
