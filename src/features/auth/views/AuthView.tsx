import type { FormEvent } from 'react';
import { APP_CONFIG } from '../../../shared/config/appConfig';
import { isIOS } from '../../../shared/platform/capacitor';
import { useAuthViewModel } from '../hooks/useAuthViewModel';

interface AuthViewProps {
  onAuthSuccess: () => void | Promise<void>;
}

function EmailVerificationWait({
  email,
  onBackToLogin,
}: {
  email: string;
  onBackToLogin: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 paper-texture flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 border border-gray-100 text-center">
        <h2 className="text-lg font-black text-gray-900">Check your email</h2>
        <p className="text-sm text-gray-600 mt-3">
          We sent a confirmation link to <span className="font-bold">{email}</span>.
        </p>
        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full mt-8 py-4 purple-gradient text-white font-black rounded-2xl shadow-xl text-sm uppercase tracking-widest"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

export function AuthView({ onAuthSuccess }: AuthViewProps) {
  const viewModel = useAuthViewModel(onAuthSuccess);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void viewModel.submit();
  };

  if (viewModel.mode === 'verify') {
    return (
      <EmailVerificationWait
        email={viewModel.pendingVerifyEmail || viewModel.email}
        onBackToLogin={viewModel.backToLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 paper-texture flex flex-col relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 right-0 h-72 purple-gradient rounded-b-[64px] shadow-lg pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 pt-12 pb-12 w-full max-w-md mx-auto h-full overflow-y-auto custom-scrollbar">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">
            {APP_CONFIG.appName}
          </h1>
          <p className="text-[11px] font-bold text-white/80 uppercase tracking-[0.2em] mt-2">
            {viewModel.mode === 'login'
              ? 'Welcome back'
              : viewModel.mode === 'register'
                ? 'Create your account'
                : 'Reset your password'}
          </p>
        </div>

        <div className="w-full bg-white rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-500 border border-gray-100">
          {viewModel.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold mb-6 border border-red-100">
              <span className="leading-tight">{viewModel.error}</span>
            </div>
          )}

          {viewModel.successMessage && (
            <div className="bg-green-50 text-green-700 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold mb-6 border border-green-100">
              <span className="leading-tight">{viewModel.successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {viewModel.mode === 'register' && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name"
                  value={viewModel.name}
                  onChange={(event) => viewModel.setName(event.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                />
              </div>
            )}

            <div className="relative">
              <input
                type="email"
                placeholder="Email address"
                value={viewModel.email}
                onChange={(event) => viewModel.setEmail(event.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
              />
            </div>

            {(viewModel.mode === 'login' || viewModel.mode === 'register') && (
              <div className="relative">
                <input
                  type={viewModel.showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={viewModel.password}
                  onChange={(event) => viewModel.setPassword(event.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-4 pr-12 text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                />
                <button
                  type="button"
                  onClick={viewModel.toggleShowPassword}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  {viewModel.showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            )}

            {viewModel.mode === 'login' && (
              <button
                type="button"
                onClick={viewModel.switchToForgot}
                className="w-full text-right text-[10px] font-black text-purple-600 uppercase tracking-widest hover:opacity-70 -mt-1"
              >
                Forgot Password?
              </button>
            )}

            {viewModel.mode === 'register' && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Password Rules
                </p>
                {viewModel.passwordRules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] ${
                        rule.passed ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      ✓
                    </div>
                    <span
                      className={`text-[10px] font-bold ${rule.passed ? 'text-gray-700' : 'text-gray-400'}`}
                    >
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {viewModel.mode === 'register' && (
              <div className="relative">
                <input
                  type={viewModel.showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={viewModel.confirmPassword}
                  onChange={(event) => viewModel.setConfirmPassword(event.target.value)}
                  className={`w-full bg-gray-50 border rounded-2xl py-3.5 px-4 text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    viewModel.confirmPassword.length > 0 && !viewModel.doPasswordsMatch
                      ? 'border-red-200 focus:ring-red-400'
                      : 'border-gray-100 focus:ring-purple-400'
                  }`}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={viewModel.isLoading}
              className="w-full py-4 mt-2 purple-gradient text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all tracking-widest text-sm uppercase"
            >
              {viewModel.isLoading ? <span className="animate-pulse">…</span> : null}
              {viewModel.mode === 'login'
                ? 'Log In'
                : viewModel.mode === 'register'
                  ? 'Sign Up'
                  : 'Send reset link'}
            </button>

            {viewModel.mode === 'forgot' && (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 leading-tight">
                  We’ll email you a link to reset your password if an account exists.
                </p>
                <button
                  type="button"
                  onClick={viewModel.backToLogin}
                  className="w-full py-3 bg-white border border-purple-200 text-purple-600 font-black rounded-2xl shadow-sm active:scale-[0.98] transition-all text-[10px] uppercase tracking-widest"
                >
                  Back to Login
                </button>
              </div>
            )}
          </form>

          {viewModel.mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  or
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <button
                type="button"
                onClick={() => {
                  void viewModel.continueWithGoogle();
                }}
                disabled={viewModel.isLoading}
                className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl shadow-sm flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all text-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {viewModel.mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
              </button>

              {isIOS() && (
                <button
                  type="button"
                  onClick={() => {
                    void viewModel.continueWithApple();
                  }}
                  disabled={viewModel.isLoading}
                  className="w-full py-3.5 bg-black text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-sm mt-3"
                >
                  <svg width="18" height="18" viewBox="0 0 814 1000" fill="white" aria-hidden>
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269.4-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.8-49 192.3-49 31 0 108.2 5.8 162.7 62.5zM547.1 95.5c25.2-29.6 43.4-71.6 43.4-113.6 0-5.8-.6-11.6-1.9-17.4-41.5 1.9-91 28.3-120.6 59.2-22.5 24.5-43.4 66.5-43.4 109.1 0 6.4 1.3 12.8 1.9 14.7 2.6.6 7.1 1.3 11.6 1.3 37 0 83.4-24.8 109-53.3z" />
                  </svg>
                  {viewModel.mode === 'login' ? 'Continue with Apple' : 'Sign up with Apple'}
                </button>
              )}
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          {viewModel.mode !== 'forgot' && (
            <button
              type="button"
              onClick={() => viewModel.switchMode(viewModel.mode === 'login' ? 'register' : 'login')}
              className="text-xs font-bold text-gray-500 hover:text-purple-600 transition-colors"
            >
              {viewModel.mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <span className="text-purple-600 underline underline-offset-4">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span className="text-purple-600 underline underline-offset-4">Log in</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
