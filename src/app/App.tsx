import { AuthView } from '../features/auth/views/AuthView';
import { RecoveryPasswordView } from '../features/auth/views/RecoveryPasswordView';
import { useAuthSession } from '../features/auth/hooks/useAuthSession';
import { signOutCurrentUser } from '../features/auth/services/authService';
import { HomeView } from '../features/home/views/HomeView';

export default function App() {
  const { isLoading, user, isRecoveryMode, reloadUser, leaveRecoveryMode } = useAuthSession();

  const handleAuthSuccess = async () => {
    await reloadUser();
  };

  const handleLogout = async () => {
    await signOutCurrentUser();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <p className="text-sm font-semibold text-gray-500">Loading…</p>
      </div>
    );
  }

  if (isRecoveryMode) {
    return <RecoveryPasswordView onDone={leaveRecoveryMode} />;
  }

  if (!user) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  return <HomeView user={user} onLogout={handleLogout} />;
}
