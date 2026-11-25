import React, { useEffect, useState } from 'react';
import { Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { loginWithCredentials, registerLearner, setupInitialAdmin } from '../api.ts';
import { t } from '../i18n.ts';
import type { Lang, UserProfile } from '../types.ts';

interface LoginScreenProps {
  lang: Lang;
  needsAdminSetup: boolean;
  onToggleLang: () => void;
  onAuthenticated: (token: string, user: UserProfile) => void;
  onToast: (msg: string) => void;
}

type AuthTab = 'setup' | 'login' | 'register';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  lang,
  needsAdminSetup,
  onToggleLang,
  onAuthenticated,
  onToast,
}) => {
  const [tab, setTab] = useState<AuthTab>(needsAdminSetup ? 'setup' : 'login');
  const [name, setName] = useState(needsAdminSetup ? 'Dylan' : '');
  const [email, setEmail] = useState(needsAdminSetup ? 'dylan@connecteo.fr' : '');
  const [password, setPassword] = useState('');
  const [showForgotNote, setShowForgotNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  useEffect(() => {
    if (needsAdminSetup) {
      setTab('setup');
    } else if (tab === 'setup') {
      setTab('login');
    }
  }, [needsAdminSetup, tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === 'setup') {
        const res = await setupInitialAdmin({ name, email, password });
        onAuthenticated(res.token, res.user);
      } else if (tab === 'register') {
        const res = await registerLearner({ name, email, password });
        onAuthenticated(res.token, res.user);
      } else {
        const res = await loginWithCredentials({ email, password });
        onAuthenticated(res.token, res.user);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion.';
      setError(msg);
      onToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row items-stretch bg-[#f6f9fa]">
      {/* Left Split: Brand Culture & Photography */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-14 overflow-hidden bg-[#087d7a]">
        {!heroImgFailed && (
          <img
            src="/src/assets/images/login_team_collaboration_1795592939287.jpg"
            alt="Équipe Connecteo en formation"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#00afa9]/88 via-[#087d7a]/90 to-[#096475]/95"
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="bg-white inline-flex items-center px-5 py-3 rounded-xl shadow-sm">
            <img
              src="/connecteo-logo.svg"
              alt="Connecteo"
              className="h-11 w-auto block"
            />
          </div>
        </div>

        <div className="relative z-10 max-w-lg text-white my-auto py-8">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            {t(lang, 'taglineTitle')}
          </h1>
          <p className="text-base text-white/90 leading-relaxed font-medium">
            {t(lang, 'taglineSub')}
          </p>
        </div>

        <div className="relative z-10 text-xs text-white/80 font-medium">
          Connecteo Learning · {t(lang, 'prototypeFooter')}
        </div>
      </div>

      {/* Right Split: Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 sm:px-12 bg-white relative">
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={onToggleLang}
            className="px-3 py-1.5 rounded-lg border border-[#e5ecee] text-xs font-bold text-[#4b626d] hover:bg-[#f6f9fa] transition-colors whitespace-nowrap shrink-0"
            aria-label="Change language"
          >
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>

        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <img src="/connecteo-logo.svg" alt="Connecteo" className="h-9 w-auto" />
            <span className="text-xs font-semibold text-[#808284] tracking-wide">Learning</span>
          </div>

          <h2 className="text-2xl font-extrabold text-[#172b36] tracking-tight">
            {tab === 'setup'
              ? t(lang, 'setupTitle')
              : tab === 'register'
                ? t(lang, 'registerTitle')
                : t(lang, 'loginTitle')}
          </h2>
          <p className="text-sm text-[#64767e] mt-1.5 mb-6">
            {tab === 'setup'
              ? t(lang, 'setupSubtitle')
              : tab === 'register'
                ? t(lang, 'registerSubtitle')
                : t(lang, 'loginSubtitle')}
          </p>

          {/* Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#f6f9fa] border border-[#e5ecee] rounded-lg mb-6">
            {needsAdminSetup && (
              <button
                type="button"
                onClick={() => {
                  setTab('setup');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  tab === 'setup'
                    ? 'bg-white text-[#087d7a] shadow-sm'
                    : 'text-[#64767e] hover:text-[#172b36]'
                }`}
              >
                {t(lang, 'tabSetup')}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === 'login'
                  ? 'bg-white text-[#087d7a] shadow-sm'
                  : 'text-[#64767e] hover:text-[#172b36]'
              }`}
            >
              {t(lang, 'tabLogin')}
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === 'register'
                  ? 'bg-white text-[#087d7a] shadow-sm'
                  : 'text-[#64767e] hover:text-[#172b36]'
              }`}
            >
              {t(lang, 'tabRegister')}
            </button>
          </div>

          {tab === 'setup' && (
            <div className="mb-5 p-3.5 rounded-lg bg-[#e7f7f5] border border-[#bce8e4] text-xs text-[#087d7a] flex items-start gap-2.5 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {lang === 'fr'
                  ? 'Premier lancement : choisissez un mot de passe (6+ caractères) pour activer votre compte Administrateur Connecteo.'
                  : 'First launch: choose a password (6+ characters) to activate your Connecteo Administrator account.'}
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-[#fff0e8] border border-[#f5ccb3] text-xs font-medium text-[#9f5627]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(tab === 'setup' || tab === 'register') && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-bold text-[#64767e] mb-1.5">
                  {t(lang, 'nameLabel')}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#91a0a6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dylan"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:bg-white focus:border-[#00afa9] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-bold text-[#64767e] mb-1.5">
                {t(lang, 'emailLabel')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#91a0a6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.nom@connecteo.fr"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:bg-white focus:border-[#00afa9] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-bold text-[#64767e] mb-1.5">
                {t(lang, 'passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#91a0a6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={tab === 'login' ? 1 : 6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-[#f6f9fa] border border-[#e5ecee] rounded-lg focus:outline-none focus:bg-white focus:border-[#00afa9] transition-colors"
                />
              </div>
            </div>

            {tab === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotNote((prev) => !prev)}
                  className="text-xs font-bold text-[#087d7a] hover:underline"
                >
                  {t(lang, 'forgotPassword')}
                </button>
              </div>
            )}

            {showForgotNote && tab === 'login' && (
              <div className="p-3 rounded-lg bg-[#f6f9fa] border border-[#e5ecee] text-xs text-[#64767e]">
                {t(lang, 'forgotPasswordNote')}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-lg bg-[#00afa9] hover:bg-[#087d7a] text-white text-sm font-bold transition-colors disabled:opacity-60 shadow-sm whitespace-nowrap"
            >
              {submitting
                ? '...'
                : tab === 'setup'
                  ? t(lang, 'setupSubmit')
                  : tab === 'register'
                    ? t(lang, 'registerSubmit')
                    : t(lang, 'loginSubmit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
