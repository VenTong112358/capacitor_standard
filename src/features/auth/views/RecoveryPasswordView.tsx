import type { FormEvent } from 'react';
import { useRecoveryPasswordViewModel } from '../hooks/useRecoveryPasswordViewModel';

interface RecoveryPasswordViewProps {
  onDone: () => void | Promise<void>;
}

export function RecoveryPasswordView({ onDone }: RecoveryPasswordViewProps) {
  const viewModel = useRecoveryPasswordViewModel(onDone);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void viewModel.submit();
  };

  return (
    <div className="min-h-screen paper-texture flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 border border-gray-100">
        <h1 className="text-xl font-black text-gray-900 text-center">Set new password</h1>
        <p className="text-sm text-gray-600 text-center mt-2">Choose a new password for your account.</p>
        {viewModel.error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-xs font-bold mt-4 border border-red-100">
            {viewModel.error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <input
              type={viewModel.showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={viewModel.password}
              onChange={(event) => viewModel.setPassword(event.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-4 pr-14 text-sm font-bold"
            />
            <button
              type="button"
              onClick={viewModel.toggleShowPassword}
              className="absolute inset-y-0 right-0 pr-4 text-xs font-bold text-gray-500"
            >
              {viewModel.showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={viewModel.showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={viewModel.confirmPassword}
            onChange={(event) => viewModel.setConfirmPassword(event.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm font-bold"
          />
          <button
            type="submit"
            disabled={viewModel.isLoading}
            className="w-full py-4 purple-gradient text-white font-black rounded-2xl shadow-xl text-sm uppercase tracking-widest"
          >
            {viewModel.isLoading ? '…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
