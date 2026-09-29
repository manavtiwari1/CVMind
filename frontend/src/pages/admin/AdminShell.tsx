import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './sections/Dashboard';
import Analytics from './sections/Analytics';
import AIActivity from './sections/AIActivity';
import UserManagement from './sections/UserManagement';
import Payments from './sections/Payments';
import Support from './sections/Support';
import Reports from './sections/Reports';
import SystemHealth from './sections/SystemHealth';
import Settings from './sections/Settings';
import type { AdminStats } from './types';

interface AdminShellProps {
  stats: AdminStats;
  isFetching: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
  setCurrentPage: (page: string) => void;
  secret: string;
  BACKEND: string;
}

export default function AdminShell({
  stats,
  isFetching,
  onRefresh,
  onSignOut,
  setCurrentPage,
  secret,
  BACKEND
}: AdminShellProps) {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    // Analytics tabs routing
    if (activeSection.startsWith('analytics-')) {
      return <Analytics stats={stats} subSection={activeSection} />;
    }
    // User management routing
    if (activeSection.startsWith('users-')) {
      return <UserManagement stats={stats} subSection={activeSection} secret={secret} BACKEND={BACKEND} />;
    }
    // AI activity tabs routing
    if (activeSection.startsWith('ai-')) {
      return <AIActivity stats={stats} subSection={activeSection} />;
    }
    // Payments routing
    if (activeSection.startsWith('payments-')) {
      return <Payments stats={stats} subSection={activeSection} />;
    }
    // Support routing
    if (activeSection.startsWith('support-')) {
      return <Support stats={stats} subSection={activeSection} />;
    }
    // Reports routing
    if (activeSection.startsWith('reports-')) {
      return <Reports stats={stats} />;
    }
    // System health routing
    if (activeSection.startsWith('system-')) {
      return <SystemHealth stats={stats} subSection={activeSection} />;
    }
    // Settings routing
    if (activeSection.startsWith('settings-')) {
      return <Settings stats={stats} subSection={activeSection} />;
    }

    switch (activeSection) {
      case 'dashboard':
      default:
        return <Dashboard stats={stats} />;
    }
  };

  return (
    <div className="admin-v2 admin-shell">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        setCurrentPage={setCurrentPage}
      />

      {/* Main Workspace */}
      <main className="admin-main">
        {/* Topbar */}
        <Topbar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          isFetching={isFetching}
          onRefresh={onRefresh}
          onSignOut={onSignOut}
          setCurrentPage={setCurrentPage}
          stats={stats}
        />

        {/* Content workspace */}
        <div className="admin-content">
          {renderContent()}
        </div>

        {/* Footer */}
        <footer className="admin-footer">
          CVMind Admin Dashboard Console · Session Secured via local memory keys
        </footer>
      </main>
    </div>
  );
}
