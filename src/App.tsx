import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1923] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#FF4655]/30 border-t-[#FF4655] rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
          <p className="text-[#9CA8B3] text-sm font-['Inter']">Loading AIM MASTER...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      {/*
        Every `toast(...)` call (useGoals, saved drills) renders here; without a
        Toaster they were silent. sonner's own dark theme, not the shadcn wrapper:
        the app never sets the `.dark` class its tokens depend on.
      */}
      <Toaster theme="dark" position="bottom-right" />
    </AuthProvider>
  );
}
