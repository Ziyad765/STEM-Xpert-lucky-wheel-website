import React, { useState, useEffect } from 'react';
import BoothKiosk from './components/BoothKiosk';
import MobileRegister from './components/MobileRegister';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const isMobileView = currentPath === '/register';
  const isAdminView = currentPath === '/admin';

  return (
    <div className="min-h-screen bg-brand-dark">
      {isAdminView ? (
        <AdminDashboard />
      ) : isMobileView ? (
        <MobileRegister />
      ) : (
        <BoothKiosk />
      )}
    </div>
  );
}
