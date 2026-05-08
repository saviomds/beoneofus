'use client';

import { createContext, useContext, useState } from 'react';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  const [targetChatUser, setTargetChatUser] = useState(null);

  return (
    <DashboardContext.Provider value={{ targetChatUser, setTargetChatUser }}>
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
