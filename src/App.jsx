import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import BoothKiosk from './components/BoothKiosk';
import MobileRegister from './components/MobileRegister';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io({
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('⚡ Connected to STEM-Xpert Socket Server');
    });

    setSocket(newSocket);

    // Sync path on popstate
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      newSocket.disconnect();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const isMobileView = currentPath === '/register';
  const isAdminView = currentPath === '/admin';

  return (
    <div className="min-h-screen bg-brand-dark">
      {isAdminView ? (
        <AdminDashboard socket={socket} />
      ) : isMobileView ? (
        <MobileRegister socket={socket} />
      ) : (
        <BoothKiosk socket={socket} />
      )}
    </div>
  );
}
