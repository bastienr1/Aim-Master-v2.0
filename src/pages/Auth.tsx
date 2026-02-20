import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Eye, EyeOff, Crosshair, Zap } from 'lucide-react';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account created! You can now sign in.');
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0F1923] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#FF4655]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#53CADC]/5 rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF4655] to-[#FF4655]/70 mb-4 shadow-lg shadow-[#FF4655]/20">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-['Rajdhani'] text-4xl font-bold text-[#ECE8E1] tracking-tight">
            AIM<span className="text-[#FF4655]">MASTER</span>
          </h1>
          <p className="text-[#9CA8B3] text-sm mt-1 font-['Inter']">
            Competitive FPS Training Companion
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1C2B36] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/30">
          {/* Tab toggle */}
          <div className="flex bg-[#0F1923] rounded-xl p-1 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-['Inter'] transition-all duration-200 ${
                isLogin
                  ? 'bg-[#FF4655] text-white shadow-lg shadow-[#FF4655]/20'
                  : 'text-[#9CA8B3] hover:text-[#ECE8E1]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-['Inter'] transition-all duration-200 ${
                !isLogin
                  ? 'bg-[#FF4655] text-white shadow-lg shadow-[#FF4655]/20'
                  : 'text-[#9CA8B3] hover:text-[#ECE8E1]'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9CA8B3] mb-1.5 font-['Inter'] uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0F1923] border border-white/10 rounded-xl px-4 py-3 text-[#ECE8E1] text-sm font-['Inter'] placeholder-[#5A6872] focus:outline-none focus:border-[#FF4655]/50 focus:ring-1 focus:ring-[#FF4655]/20 transition-all"
                placeholder="trainee@aimmaster.gg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9CA8B3] mb-1.5 font-['Inter'] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-[#0F1923] border border-white/10 rounded-xl px-4 py-3 text-[#ECE8E1] text-sm font-['Inter'] placeholder-[#5A6872] focus:outline-none focus:border-[#FF4655]/50 focus:ring-1 focus:ring-[#FF4655]/20 transition-all pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6872] hover:text-[#9CA8B3] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-xl px-4 py-3 text-[#FF4655] text-sm font-['Inter']">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-[#3DD598]/10 border border-[#3DD598]/20 rounded-xl px-4 py-3 text-[#3DD598] text-sm font-['Inter']">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FF4655] to-[#FF4655]/80 text-white py-3 rounded-xl font-semibold font-['Inter'] text-sm hover:from-[#FF4655]/90 hover:to-[#FF4655]/70 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FF4655]/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {isLogin ? 'Enter the Arena' : 'Create Account'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer features */}
        <div className="mt-6 flex items-center justify-center gap-6 text-[#5A6872] text-xs font-['Inter']">
          <div className="flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5" />
            <span>KovaaK's Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>AI Coach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
}
