import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import BoothKiosk from './components/BoothKiosk';
import MobileRegister from './components/MobileRegister';
import AdminDashboard from './components/AdminDashboard';
import { Monitor, Smartphone, Settings } from 'lucide-react';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Initialize socket connection
  useEffect(() => {
    // In dev, Vite proxies /socket.io to backend localhost:5000
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

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const isMobileView = currentPath === '/register';
  const isAdminView = currentPath === '/admin';

  return (
    <div className="relative min-h-screen bg-brand-dark">
      
      {/* View Switcher Bar (Floating bottom pill for easy exhibition navigation) */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-brand-navy/90 backdrop-blur-md border border-brand-border/80 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-xs">
        <button
          onClick={() => navigateTo('/')}
          className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
            !isMobileView && !isAdminView
              ? 'bg-brand-orange text-white font-bold shadow-md shadow-brand-orange/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Booth Kiosk Screen</span>
          <span className="sm:hidden">Kiosk</span>
        </button>

        <button
          onClick={() => navigateTo('/register')}
          className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
            isMobileView
              ? 'bg-brand-orange text-white font-bold shadow-md shadow-brand-orange/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mobile Registration Form</span>
          <span className="sm:hidden">Mobile</span>
        </button>

        <button
          onClick={() => navigateTo('/admin')}
          className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
            isAdminView
              ? 'bg-brand-orange text-white font-bold shadow-md shadow-brand-orange/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Admin & Leads</span>
          <span className="sm:hidden">Admin</span>
        </button>
      </nav>

      {/* Main Routed View */}
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

