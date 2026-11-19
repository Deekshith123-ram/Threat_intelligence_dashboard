import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BrainCircuit,
  Database,
  FileDown,
  LayoutDashboard,
  Menu,
  Moon,
  Network,
  ScanSearch,
  Settings,
  ShieldAlert,
  Sun,
  Target,
  X,
} from 'lucide-react';
import { CyberGuardLogo } from './components/CyberGuardLogo';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import { AIAnalyzerView } from './pages/AIAnalyzerView';
import { AnalyticsView } from './pages/AnalyticsView';
import { DashboardView } from './pages/DashboardView';
import { MitreAttackView } from './pages/MitreAttackView';
import { ReportGeneratorView } from './pages/ReportGeneratorView';
import { SecurityAlertsView } from './pages/SecurityAlertsView';
import { SecurityScannerView } from './pages/SecurityScannerView';
import { SettingsView } from './pages/SettingsView';
import { ThreatIntelligenceView } from './pages/ThreatIntelligenceView';
import { ThreatManagerView } from './pages/ThreatManagerView';
import type { NavSection } from './types/security';

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analyzer', label: 'AI Threat Analyzer', icon: BrainCircuit },
  { id: 'scanner', label: 'Security Scanner', icon: ScanSearch },
  { id: 'threats', label: 'Threat Manager', icon: ShieldAlert },
  { id: 'intelligence', label: 'Threat Intelligence', icon: Network },
  { id: 'mitre', label: 'MITRE ATT&CK', icon: Target },
  { id: 'alerts', label: 'Security Alerts', icon: Bell },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Report Generator', icon: FileDown },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const AppShell: React.FC = () => {
  const {
    activeNav,
    setActiveNav,
    alerts,
    threats,
    theme,
    toggleTheme,
    systemStatus,
    storageNotice,
    loadDemoData,
    isLoading,
  } = useSecurity();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unreadAlerts = alerts.filter((a) => !a.isRead).length;
  const currentItem = NAV_ITEMS.find((n) => n.id === activeNav) ?? NAV_ITEMS[0];

  const handleSelectNav = (id: NavSection) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
  };

  const renderPage = () => {
    switch (activeNav) {
      case 'dashboard':
        return <DashboardView />;
      case 'analyzer':
        return <AIAnalyzerView />;
      case 'scanner':
        return <SecurityScannerView />;
      case 'threats':
        return <ThreatManagerView />;
      case 'intelligence':
        return <ThreatIntelligenceView />;
      case 'mitre':
        return <MitreAttackView />;
      case 'alerts':
        return <SecurityAlertsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'reports':
        return <ReportGeneratorView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#060A13] dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#090F1E]/95">
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
          <CyberGuardLogo size={36} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
              CyberGuard Mini
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Threat Intelligence SOC
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'alerts' && unreadAlerts > 0 && (
                  <span
                    className={`font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                    }`}
                  >
                    {unreadAlerts}
                  </span>
                )}
                {item.id === 'threats' && threats.length > 0 && (
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      active ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {threats.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <Activity className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>Storage Mode</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {systemStatus.supabaseConfigured
                ? 'Supabase PostgreSQL'
                : 'Demo Storage (localStorage)'}
            </div>
          </div>

          {threats.length === 0 && (
            <button
              type="button"
              onClick={() => void loadDemoData()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Demo Data</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white dark:bg-[#090F1E] border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CyberGuardLogo size={30} />
                <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  CyberGuard Mini
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'alerts' && unreadAlerts > 0 && (
                      <span className="font-mono text-xs">{unreadAlerts}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (3-zone compact layout) */}
        <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-[#060A13]/85 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="lg:hidden font-display font-bold text-slate-900 dark:text-white whitespace-nowrap">
                CyberGuard Mini
              </span>
              <span className="hidden lg:inline text-slate-400">CyberGuard Mini</span>
              <span aria-hidden="true" className="text-slate-400">
                /
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {currentItem.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton variant="compact" />

            <button
              type="button"
              onClick={() => handleSelectNav('alerts')}
              aria-label="Open Security Alerts"
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-[10px] font-mono font-bold text-white flex items-center justify-center">
                  {unreadAlerts}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {storageNotice && (
            <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              {storageNotice}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4 py-8">
              <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-slate-200/70 dark:bg-slate-800/60 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : (
            renderPage()
          )}
        </main>
      </div>

      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <SecurityProvider>
      <AppShell />
    </SecurityProvider>
  );
}
