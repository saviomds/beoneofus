'use client';

import { createContext, useContext, useState } from 'react';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  const [activeSection, setActiveSection] = useState('feed');
  const [targetChatUser, setTargetChatUser] = useState(null);

  return (
    <DashboardContext.Provider value={{ activeSection, setActiveSection, targetChatUser, setTargetChatUser }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}