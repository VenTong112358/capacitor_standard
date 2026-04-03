import { useState } from 'react';
import { supabase } from '../services/supabase';
import { PASSWORD_RULES } from '../auth/passwordRules';

interface RecoveryPasswordViewProps {
  onDone: () => void;
}

export function RecoveryPasswordView({ onDone }: RecoveryPasswordViewProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isPasswordValid = PASSWORD_RULES.every((r) => r.test(password));
  const match = password === confirm && password.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isPasswordValid) {
      setError('Please ensure your password meets all criteria.');
      return;
    }
    if (!match) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const { error: upd } = await supabase.auth.updateUser({ password });
      if (upd) {
        setError(upd.message);
        return;
      }
      await supabase.auth.signOut();
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen paper-texture flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 border border-gray-100">
        <h1 className="text-xl font-black text-gray-900 text-center">Set new password</h1>
        <p className="text-sm text-gray-600 text-center mt-2">Choose a new password for your account.</p>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-xs font-bold mt-4 border border-red-100">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-4 pr-14 text-sm font-bold"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 text-xs font-bold text-gray-500"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm font-bold"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 purple-gradient text-white font-black rounded-2xl shadow-xl text-sm uppercase tracking-widest"
          >
            {loading ? '…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
