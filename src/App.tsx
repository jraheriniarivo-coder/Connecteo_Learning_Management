import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Compass,
  LayoutGrid,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  downloadReportCsvApi,
  fetchAuthStatus,
  fetchDashboard,
  logoutSession,
  markNotificationsReadApi,
} from './api.ts';
import { CoursePlayerView } from './components/CoursePlayerView.tsx';
import { CreateCourseModal } from './components/CreateCourseModal.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import {
  AssignmentsView,
  CoursesCatalogView,
  ReportsView,
  SettingsView,
  SkillsView,
} from './components/SecondaryViews.tsx';
import { roleLabels, t } from './i18n.ts';
import type { DashboardPayload, Lang, Role, UserProfile, ViewId } from './types.ts';

export default function App() {
  const [lang, setLang] = useState<Lang>('fr');
  const [needsAdminSetup, setNeedsAdminSetup] = useState<boolean>(true);
  const [bootLoading, setBootLoading] = useState<boolean>(true);

  // Bearer token strictly stored in React memory (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);

  const [currentView, setCurrentView] = useState<ViewId>('overview');
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const [previewRole, setPreviewRole] = useState<Role | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 3400);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    let active = true;
    fetchAuthStatus()
      .then((res) => {
        if (active) setNeedsAdminSetup(res.needsAdminSetup);
      })
      .catch(() => {
        if (active) setNeedsAdminSetup(false);
      })
      .finally(() => {
        if (active) setBootLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadDashboard = useCallback(
    async (authToken: string) => {
      try {
        const data = await fetchDashboard(authToken);
        setDashboard(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur de chargement.';
        showToast(msg);
        setToken(null);
        setDashboard(null);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (token) {
      loadDashboard(token);
    }
  }, [token, loadDashboard]);

  // Close popovers on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const handleAuthenticated = (newToken: string, user: UserProfile) => {
    setToken(newToken);
    setNeedsAdminSetup(false);
    setPreviewRole(user.role);
    setCurrentView('overview');
    setActiveCourseId(null);
    showToast(t(lang, 'loginSuccess'));
  };

  const handleLogout = async () => {
    const activeToken = token;
    setProfileOpen(false);
    setNotifOpen(false);
    setToken(null);
    setDashboard(null);
    setPreviewRole(null);
    setActiveCourseId(null);
    setCurrentView('overview');
    if (activeToken) {
      await logoutSession(activeToken).catch(() => {});
    }
    const status = await fetchAuthStatus().catch(() => ({ needsAdminSetup: false }));
    setNeedsAdminSetup(status.needsAdminSetup);
    showToast(t(lang, 'logoutSuccess'));
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'fr' ? 'en' : 'fr'));
  };

  const handleNavigate = (view: ViewId) => {
    setActiveCourseId(null);
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleExportCsv = async () => {
    if (!token) return;
    try {
      await downloadReportCsvApi(token, lang);
      showToast(t(lang, 'exportReady'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export impossible.');
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (!token) return;
    await markNotificationsReadApi(token).catch(() => {});
    await loadDashboard(token);
  };

  if (bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fa] text-xs font-semibold text-[#64767e]">
        Connecteo Learning...
      </div>
    );
  }

  if (!token || !dashboard) {
    return (
      <>
        <LoginScreen
          lang={lang}
          needsAdminSetup={needsAdminSetup}
          onToggleLang={handleToggleLang}
          onAuthenticated={handleAuthenticated}
          onToast={showToast}
        />
        {toastMsg && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#172b36] text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg"
          >
            {toastMsg}
          </div>
        )}
      </>
    );
  }

  const actualRole = dashboard.user.role;
  const canPreviewRoles = actualRole === 'admin' || actualRole === 'management';
  const effectiveRole: Role = canPreviewRoles && previewRole ? previewRole : actualRole;

  const canSeeReports =
    effectiveRole === 'admin' ||
    effectiveRole === 'management' ||
    effectiveRole === 'manager';
  const canSeeSettings = effectiveRole !== 'staff';

  const navItems: Array<{ id: ViewId; label: string; icon: React.ReactNode; visible: boolean }> = [
    { id: 'overview', label: t(lang, 'overview'), icon: <LayoutGrid className="w-4 h-4" />, visible: true },
    { id: 'courses', label: t(lang, 'courses'), icon: <BookOpen className="w-4 h-4" />, visible: true },
    { id: 'assignments', label: t(lang, 'assignments'), icon: <TrendingUp className="w-4 h-4" />, visible: true },
    { id: 'skills', label: t(lang, 'skills'), icon: <Compass className="w-4 h-4" />, visible: true },
    { id: 'reports', label: t(lang, 'reports'), icon: <BarChart3 className="w-4 h-4" />, visible: canSeeReports },
  ];

  const activeCourse =
    activeCourseId !== null
      ? dashboard.courses.find((c) => c.id === activeCourseId) ?? null
      : null;

  const unreadCount = dashboard.notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex bg-[#f6f9fa] text-[#172b36]">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#172b36]/30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[248px] bg-white border-r border-[#e5ecee] px-4 pt-6 pb-4 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => handleNavigate('overview')}
          className="flex items-center gap-2 px-2.5 pb-7 text-left focus:outline-none"
          aria-label="Connecteo Learning"
        >
          <img src="/connecteo-logo.svg" alt="Connecteo" className="h-9 w-auto block shrink-0" />
          <span className="text-[11px] font-semibold text-[#808284] pt-2.5 whitespace-nowrap">
            Learning
          </span>
        </button>

        <div className="px-3 pb-3 text-[10px] font-bold tracking-[1.3px] text-[#91a0a6] uppercase">
          {t(lang, 'workspace')}
        </div>

        <nav className="space-y-1" aria-label="Navigation principale">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const isActive = !activeCourse && currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#e8f8f6] text-[#087d7a]'
                      : 'text-[#64767e] hover:bg-[#f5f9f9] hover:text-[#172b36]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        <div className="mt-auto space-y-3 pt-4">
          <div className="flex items-center gap-2.5 bg-[#f7fafb] border border-[#e5ecee] px-3 py-2.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-[#087d7a] shrink-0" />
            <div className="min-w-0">
              <strong className="block text-[11px] text-[#172b36] truncate">
                {t(lang, 'localEngine')}
              </strong>
              <small className="block text-[10px] text-[#64767e] truncate">
                {t(lang, 'sessionSecured')}
              </small>
            </div>
          </div>

          {canSeeSettings && (
            <button
              type="button"
              onClick={() => handleNavigate('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap ${
                !activeCourse && currentView === 'settings'
                  ? 'bg-[#e8f8f6] text-[#087d7a]'
                  : 'text-[#64767e] hover:bg-[#f5f9f9] hover:text-[#172b36]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{t(lang, 'settings')}</span>
            </button>
          )}

          <div className="border-t border-[#e5ecee] pt-3 px-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#d8f1ed] text-[#087d7a] grid place-items-center text-xs font-extrabold shrink-0">
              {dashboard.user.initials}
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs text-[#172b36] truncate">
                {dashboard.user.name}
              </strong>
              <small className="block text-[10px] text-[#64767e] truncate">
                {roleLabels[dashboard.user.role][lang]}
              </small>
              <span className="block text-[9px] font-semibold text-[#087d7a] truncate mt-0.5">
                {t(lang, 'slogan')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate(canSeeSettings ? 'settings' : 'overview')}
              aria-label={t(lang, 'settings')}
              className="p-1.5 rounded-md text-[#91a0a6] hover:text-[#172b36] hover:bg-[#f6f9fa]"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-[248px] min-w-0 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-[72px] bg-white/95 backdrop-blur-sm border-b border-[#e5ecee] px-4 sm:px-9 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Menu"
              className="lg:hidden p-2 rounded-lg border border-[#e5ecee] text-[#172b36] bg-white"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-[#91a0a6] truncate">
              <span className="hidden sm:inline">{t(lang, 'workspace')}</span>
              <span className="hidden sm:inline text-[#c7d0d4]">/</span>
              <strong className="text-xs text-[#4c626c] tracking-normal truncate">
                {activeCourse ? activeCourse.title[lang] : t(lang, currentView)}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canPreviewRoles && (
              <label className="hidden md:flex items-center gap-2 text-xs text-[#64767e]">
                <span className="whitespace-nowrap">{t(lang, 'previewRole')}</span>
                <select
                  aria-label={t(lang, 'previewRole')}
                  value={effectiveRole}
                  onChange={(e) => {
                    const next = e.target.value as Role;
                    setPreviewRole(next);
                    if (next === 'staff' && (currentView === 'reports' || currentView === 'settings')) {
                      setCurrentView('overview');
                    }
                    showToast(`${t(lang, 'previewRole')} : ${roleLabels[next][lang]}`);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-[#e5ecee] bg-white text-xs text-[#172b36]"
                >
                  {(Object.keys(roleLabels) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r][lang]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={handleToggleLang}
              aria-label="Change language"
              className="h-9 px-3 rounded-lg border border-[#e5ecee] bg-white hover:bg-[#f6f9fa] text-xs font-bold text-[#4b626d] whitespace-nowrap"
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>

            {/* Notifications Popover */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setProfileOpen(false);
                }}
                aria-label={t(lang, 'notificationsTitle')}
                className="h-9 w-9 rounded-lg border border-[#e5ecee] bg-white hover:bg-[#f6f9fa] grid place-items-center text-[#4b626d] relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#00afa9] text-white text-[10px] font-bold grid place-items-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#e5ecee] rounded-xl shadow-lg z-30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#e5ecee] bg-[#f6f9fa] flex items-center justify-between">
                    <strong className="text-xs text-[#172b36]">
                      {t(lang, 'notificationsTitle')}
                    </strong>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkNotificationsRead}
                        className="text-[11px] font-bold text-[#087d7a] hover:underline"
                      >
                        {t(lang, 'markAllRead')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#f0f3f4]">
                    {dashboard.notifications.length === 0 ? (
                      <div className="p-4 text-xs text-[#64767e] text-center">
                        {t(lang, 'noNotifications')}
                      </div>
                    ) : (
                      dashboard.notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 text-xs leading-relaxed ${
                            n.read ? 'text-[#64767e]' : 'bg-[#e7f7f5]/40 text-[#172b36] font-medium'
                          }`}
                        >
                          {n.message[lang]}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                aria-label="Profil"
                className="w-9 h-9 rounded-full bg-[#d8f1ed] text-[#087d7a] text-xs font-extrabold grid place-items-center hover:ring-2 hover:ring-[#00afa9]/40 transition-all"
              >
                {dashboard.user.initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-[#e5ecee] rounded-xl shadow-lg z-30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#e5ecee] bg-[#f6f9fa]">
                    <strong className="block text-xs text-[#172b36]">
                      {dashboard.user.name}
                    </strong>
                    <small className="block text-[11px] text-[#64767e] mt-0.5">
                      {t(lang, 'connectedAs')} : {roleLabels[dashboard.user.role][lang]}
                    </small>
                  </div>
                  {canSeeSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        handleNavigate('settings');
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#172b36] hover:bg-[#f6f9fa] flex items-center gap-2.5"
                    >
                      <Award className="w-3.5 h-3.5 text-[#087d7a]" />
                      {t(lang, 'settings')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#bc7545] hover:bg-[#fff0e8] flex items-center gap-2.5 border-t border-[#f0f3f4]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t(lang, 'logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-5 sm:p-8 max-w-[1440px] w-full mx-auto flex flex-col">
          <div className="flex-1">
            {activeCourse ? (
              <CoursePlayerView
                lang={lang}
                token={token}
                course={activeCourse}
                onBack={() => setActiveCourseId(null)}
                onProgressUpdated={() => loadDashboard(token)}
                onToast={showToast}
              />
            ) : currentView === 'overview' ? (
              <OverviewView
                lang={lang}
                data={dashboard}
                effectiveRole={effectiveRole}
                actualRole={actualRole}
                onNavigate={handleNavigate}
                onOpenCourse={(id) => setActiveCourseId(id)}
                onOpenCreateCourse={() => setCreateCourseOpen(true)}
                onExportCsv={handleExportCsv}
              />
            ) : currentView === 'courses' ? (
              <CoursesCatalogView
                lang={lang}
                token={token}
                data={dashboard}
                effectiveRole={effectiveRole}
                onOpenCourse={(id) => setActiveCourseId(id)}
                onOpenCreateCourse={() => setCreateCourseOpen(true)}
                onRefresh={() => loadDashboard(token)}
                onExportCsv={handleExportCsv}
                onToggleLang={handleToggleLang}
                onToast={showToast}
              />
            ) : currentView === 'assignments' ? (
              <AssignmentsView
                lang={lang}
                token={token}
                data={dashboard}
                effectiveRole={effectiveRole}
                onOpenCourse={(id) => setActiveCourseId(id)}
                onOpenCreateCourse={() => setCreateCourseOpen(true)}
                onRefresh={() => loadDashboard(token)}
                onExportCsv={handleExportCsv}
                onToggleLang={handleToggleLang}
                onToast={showToast}
              />
            ) : currentView === 'skills' ? (
              <SkillsView
                lang={lang}
                token={token}
                data={dashboard}
                effectiveRole={effectiveRole}
                onOpenCourse={(id) => setActiveCourseId(id)}
                onOpenCreateCourse={() => setCreateCourseOpen(true)}
                onRefresh={() => loadDashboard(token)}
                onExportCsv={handleExportCsv}
                onToggleLang={handleToggleLang}
                onToast={showToast}
              />
            ) : currentView === 'reports' ? (
              <ReportsView
                lang={lang}
                token={token}
                data={dashboard}
                effectiveRole={effectiveRole}
                onOpenCourse={(id) => setActiveCourseId(id)}
                onOpenCreateCourse={() => setCreateCourseOpen(true)}
                onRefresh={() => loadDashboard(token)}
                onExportCsv={handleExportCsv}
                onToggleLang={handleToggleLang}
                onToast={showToast}
              />
            ) : (
              <SettingsView
                lang={lang}
                token={token}
                data={dashboard}
                effectiveRole={effectiveRole}
                onOpenCourse={(id) => setActiveCourseId(id)}
                onOpenCreateCourse={() => setCreateCourseOpen(true)}
                onRefresh={() => loadDashboard(token)}
                onExportCsv={handleExportCsv}
                onToggleLang={handleToggleLang}
                onToast={showToast}
              />
            )}
          </div>

          <footer className="mt-10 pt-4 border-t border-[#e5ecee] flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-[#91a0a6]">
            <span>Connecteo Learning LMS · {t(lang, 'prototypeFooter')}</span>
            <span>{t(lang, 'footerNote')}</span>
          </footer>
        </main>
      </div>

      {createCourseOpen && (
        <CreateCourseModal
          lang={lang}
          token={token}
          skills={dashboard.skills}
          onClose={() => setCreateCourseOpen(false)}
          onCreated={() => loadDashboard(token)}
          onToast={showToast}
        />
      )}

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#172b36] text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
