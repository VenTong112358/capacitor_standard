import type { User } from '@supabase/supabase-js';

interface HomeViewProps {
  user: User;
  onLogout: () => void;
}

export function HomeView({ user, onLogout }: HomeViewProps) {
  return (
    <div className="min-h-screen paper-texture flex flex-col">
      <div className="purple-gradient px-6 pt-14 pb-16 rounded-b-[48px] shadow-lg">
        <h1 className="text-2xl font-black text-white tracking-tight">Capacitor Standard</h1>
        <p className="text-xs font-semibold text-white/80 mt-1">Signed in</p>
      </div>
      <div className="flex-1 px-6 -mt-8 pb-10">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-4">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
            <p className="text-sm font-bold text-gray-900 break-all">{user.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User id</p>
            <p className="text-xs font-mono text-gray-700 break-all">{user.id}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-3.5 mt-4 bg-gray-900 text-white font-bold rounded-2xl shadow-md active:scale-[0.98] transition text-sm"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
