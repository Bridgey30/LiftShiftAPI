import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, HelpCircle, Key, LogIn, RefreshCw, Trash2, Upload } from 'lucide-react';
import { UNIFORM_HEADER_BUTTON_CLASS, UNIFORM_HEADER_ICON_BUTTON_CLASS } from '../../../utils/ui/uiConstants';
import { OnboardingModalShell } from '../ui/OnboardingModalShell';
import { HevyLoginHelp } from './HevyLoginHelp';
import {
  getHevyPassword,
  getHevyUsernameOrEmail,
  saveHevyUsernameOrEmail,
} from '../../../utils/storage/hevyCredentialsStorage';
import { getHevyAuthToken, getHevyAuthExpiresAt, getHevyRefreshToken, getHevyProApiKey } from '../../../utils/storage/dataSourceStorage';
import { hevyBackendWarmupSession } from '../../../utils/api/hevyBackend';

type Intent = 'initial' | 'update';

interface HevyLoginModalProps {
  intent: Intent;
  initialMode?: 'credentials' | 'apiKey';
  errorMessage?: string | null;
  isLoading?: boolean;
  onLogin: (emailOrUsername: string, password: string) => void;
  onLoginWithApiKey: (apiKey: string) => void;
  loginLabel?: string;
  apiKeyLoginLabel?: string;
  hasSavedSession?: boolean;
  onSyncSaved?: () => void;
  onClearCache?: () => void;
  onImportCsv?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

export const HevyLoginModal: React.FC<HevyLoginModalProps> = ({
  intent,
  initialMode = 'credentials',
  errorMessage,
  isLoading = false,
  onLogin,
  onLoginWithApiKey,
  loginLabel = 'Login with Hevy',
  apiKeyLoginLabel = 'Continue with API key',
  hasSavedSession = false,
  onSyncSaved,
  onClearCache,
  onImportCsv,
  onBack,
  onClose,
}) => {
  const [loginMode, setLoginMode] = useState<'credentials' | 'apiKey'>(initialMode);
  const [emailOrUsername, setEmailOrUsername] = useState(() => getHevyUsernameOrEmail() || '');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState(() => getHevyProApiKey() || '');
  const [showLoginHelp, setShowLoginHelp] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const passwordTouchedRef = useRef(false);
  const warmupTriggeredRef = useRef(false);
  const passwordHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds > 0]);

  // Trigger cooldown when rate limit error received or after 3 failed attempts
  useEffect(() => {
    if (!errorMessage || isLoading) return;
    
    const isRateLimited = errorMessage?.toLowerCase().includes('rate') || errorMessage?.toLowerCase().includes('429') || errorMessage?.toLowerCase().includes('too many');
    const isAuthError = errorMessage?.toLowerCase().includes('invalid') || errorMessage?.toLowerCase().includes('wrong') || errorMessage?.toLowerCase().includes('password');
    
    if (isRateLimited) {
      setCooldownSeconds(120);
      setFailedAttempts(0);
    } else if (isAuthError) {
      // Track failed attempts for non-rate-limit errors
      setFailedAttempts((prev) => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          setCooldownSeconds(120);
          return 0;
        }
        return newCount;
      });
    }
  }, [errorMessage, isLoading]);

  const isCooldownActive = cooldownSeconds > 0;

  // Handle password show/hide
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
    // Auto-hide after 5 seconds
    if (passwordHideTimerRef.current) clearTimeout(passwordHideTimerRef.current);
    if (!showPassword) {
      passwordHideTimerRef.current = setTimeout(() => {
        setShowPassword(false);
      }, 5000);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (passwordHideTimerRef.current) clearTimeout(passwordHideTimerRef.current);
    };
  }, []);

  // When in API key mode, back should return to credentials view, not unit/gender screen
  const handleBack = () => {
    if (loginMode === 'apiKey') {
      setLoginMode('credentials');
    } else if (onBack) {
      onBack();
    }
  };

  useEffect(() => {
    const stored = getHevyPassword();
    if (passwordTouchedRef.current) return;
    if (stored) setPassword(stored);
  }, []);

  const hasValidToken = () => {
    const authToken = getHevyAuthToken();
    const refreshToken = getHevyRefreshToken();
    const expiresAt = getHevyAuthExpiresAt();
    if (!authToken || !refreshToken) return false;
    if (!expiresAt) return true;
    const expires = Date.parse(expiresAt);
    if (!Number.isFinite(expires)) return true;
    return expires > Date.now() + 60_000;
  };

  const canRefreshForThisAccount = () => {
    const refreshToken = getHevyRefreshToken();
    if (!refreshToken) return false;
    const savedUsername = getHevyUsernameOrEmail()?.trim().toLowerCase();
    const currentUsername = emailOrUsername.trim().toLowerCase();
    // Allow warmup if no saved username (new user) or if current username matches saved
    return savedUsername && savedUsername === currentUsername;
  };

  const maybeWarmup = () => {
    if (warmupTriggeredRef.current) return;
    if (hasValidToken()) return;
    // Skip warmup if we have a refresh token for this account
    if (canRefreshForThisAccount()) return;
    warmupTriggeredRef.current = true;
    console.log('[HevyLogin] 💻 Starting browser warmup on field focus');
    void hevyBackendWarmupSession(emailOrUsername.trim() || ' warmup');
  };

  const handleUsernameChange = (value: string) => {
    setEmailOrUsername(value);
  };

  return (
    <OnboardingModalShell
      header={
        <div className="flex items-start justify-between gap-3">
          <div className="w-[72px]">
            {(onBack || loginMode === 'apiKey') ? (
              <button
                type="button"
                onClick={handleBack}
                className={UNIFORM_HEADER_ICON_BUTTON_CLASS}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : null}
          </div>

              <div className="text-center mt-12">
                <h2 className="text-2xl font-bold text-slate-200 inline-flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5 text-slate-200" />
              <span>{loginMode === 'apiKey' ? 'Login with API key' : 'Login with Hevy'}</span>
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {loginMode === 'apiKey' ? 'Enter your Hevy Pro API key to sync your workouts.' : 'Login with Hevy directly to auto-sync your workouts.'}
            </p>
          </div>

          <div className="w-[72px] flex justify-end">
            {intent === 'update' && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className={UNIFORM_HEADER_BUTTON_CLASS}
              >
                Close
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      <form
        className="pt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (loginMode === 'apiKey') {
            onLoginWithApiKey(apiKey.trim());
            return;
          }
          const trimmed = emailOrUsername.trim();
          saveHevyUsernameOrEmail(trimmed);
          onLogin(trimmed, password);
        }}
      >
              {hasSavedSession && onSyncSaved && loginMode === 'credentials' ? (
                <button
                  type="button"
                  onClick={onSyncSaved}
                  disabled={isLoading}
                  className={`${UNIFORM_HEADER_BUTTON_CLASS} w-full h-10 text-sm font-semibold disabled:opacity-60 gap-2`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isLoading ? 'Syncing…' : 'Sync your data'}</span>
                </button>
              ) : null}

              {loginMode === 'apiKey' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-200">Hevy Pro API key</label>
                  <input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isLoading}
                    className="mt-1 w-full h-10 rounded-md bg-slate-900/20 border border-slate-700/60 px-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-emerald-500/60"
                    placeholder="Enter your Hevy API key"
                    autoComplete="off"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-200">Hevy username or email</label>
                    <input
                      name="username"
                      value={emailOrUsername}
                      onFocus={() => maybeWarmup()}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      disabled={isLoading}
                      className="mt-1 w-full h-10 rounded-md bg-slate-900/20 border border-slate-700/60 px-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-emerald-500/60"
                      placeholder="Use your Hevy username or email"
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200">Password</label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onFocus={() => maybeWarmup()}
                        onChange={(e) => {
                          passwordTouchedRef.current = true;
                          setPassword(e.target.value);
                        }}
                        disabled={isLoading}
                        className="mt-1 w-full h-10 rounded-md bg-slate-900/20 border border-slate-700/60 px-3 pr-10 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-emerald-500/60"
                        placeholder="Password"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {isCooldownActive ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 text-center">
                  {cooldownSeconds > 0 
                    ? `Too many login attempts. Please wait ${cooldownSeconds}s before trying again.` 
                    : 'Retry now!'}
                </div>
              ) : errorMessage ? (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading || isCooldownActive}
                className={`${UNIFORM_HEADER_BUTTON_CLASS} w-full h-10 text-sm font-semibold disabled:opacity-60 gap-2 justify-center`}
              >
                <span className="truncate">
                  {isLoading ? (loginMode === 'apiKey' ? 'Logging in…' : 'Logging in…') : isCooldownActive ? (cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : 'Retry now!') : 'Login'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                  <div className="flex">
                    {onClearCache ? (
                      <button
                        type="button"
                        onClick={onClearCache}
                        disabled={isLoading}
                        className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 px-2.5 w-full text-[12px] font-semibold disabled:opacity-60 gap-2 justify-center`}
                        title="Clear cache"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Clear cache</span>
                        <span className="sm:hidden">Clear</span>
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLoginHelp((v) => !v)}
                    className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 px-2 w-full text-[11px] font-semibold gap-1.5 justify-center`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span className="whitespace-nowrap">How to login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoginMode((m) => (m === 'apiKey' ? 'credentials' : 'apiKey'))}
                    disabled={isLoading}
                    className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 px-2.5 w-full text-[12px] font-semibold disabled:opacity-60 gap-2 justify-center ${
                      loginMode === 'apiKey' ? 'border-emerald-500/60' : ''
                    }`}
                    title={loginMode === 'apiKey' ? 'Use email + password instead' : 'Use API key instead'}
                  >
                    {loginMode === 'apiKey' ? <LogIn className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                    <span className="whitespace-nowrap">{loginMode === 'apiKey' ? 'Login' : 'API key'}</span>
                  </button>

                  {onImportCsv ? (
                    <button
                      type="button"
                      onClick={onImportCsv}
                      disabled={isLoading}
                      className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 px-2.5 w-full text-[12px] font-semibold disabled:opacity-60 gap-2 justify-center`}
                      title="Import .csv instead"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="flex flex-col items-center leading-[1.05]">
                        <span>Import</span>
                        <span className="text-slate-300 text-[10px]">.csv</span>
                      </span>
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </form>

      {showLoginHelp ? <HevyLoginHelp loginMode={loginMode} /> : null}
    </OnboardingModalShell>
  );
};
