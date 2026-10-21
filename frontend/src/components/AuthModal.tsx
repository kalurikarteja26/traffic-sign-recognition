import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { api, setStoredToken } from '../api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  React.useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode, isOpen]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        setStoredToken(res.access_token);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.signup({ email, password, full_name: fullName, phone });
        setStoredToken(res.access_token);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (type: 'driver' | 'admin') => {
    setIsLogin(true);
    setError(null);
    if (type === 'driver') {
      setEmail('driver@aerovision.ai');
      setPassword('password123');
    } else {
      setEmail('admin@aerovision.ai');
      setPassword('admin123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-hidden">
      {/* Ambient Glowing Background Orbs */}
      <div className="ambient-orb-1 absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-600/25 blur-[100px] pointer-events-none" />
      <div className="ambient-orb-2 absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/20 blur-[100px] pointer-events-none" />

      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0 z-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 titanium-panel max-w-md w-full p-6 sm:p-8 border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Clean Modal Header */}
        <div className="mb-6">
          <h2 className="font-heading font-extrabold text-2xl text-white tracking-tight">
            {isLogin ? 'Sign In to AeroVision' : 'Create AeroVision Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isLogin
              ? 'Access vehicle telematics, camera streams & challan dispute radar'
              : 'Join the next-generation intelligent road safety network'}
          </p>
        </div>

        {/* Clean Professional Demo Credentials Bar */}
        <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3 mb-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>QUICK DEMO CREDENTIALS</span>
            <span className="text-[9px] text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">ONE-CLICK</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoFill('driver')}
              className="px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 group-hover:text-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Driver Access
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">driver@aerovision.ai</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('admin')}
              className="px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 group-hover:text-purple-200">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                Admin Access
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">admin@aerovision.ai</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Clean, Professional Form with Styled Cockpit Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aryan Sharma"
                  className="input-titanium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="input-titanium"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="input-titanium"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-titanium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 mt-2 text-sm font-semibold tracking-wide"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Processing...
              </span>
            ) : isLogin ? (
              'Sign In to Platform'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Switch Tab */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {isLogin ? "Don't have an account yet?" : 'Already have an account?'}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 ml-1.5 transition-colors"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};
