import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AkatsukiCloud from '../assets/AkatsukiCloud';
import AvatarSelector from '../components/AvatarSelector';
import { AKATSUKI_BACKGROUNDS } from '../constants/backgrounds';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, erpLogin, selectedAvatarId, setAvatar } = useAuth();

  const [authMode, setAuthMode] = useState('erp'); // 'erp' | 'standard'
  
  // ERP Form State
  const [erpUsername, setErpUsername] = useState('2023bcse042@mit.asia');
  const [erpPassword, setErpPassword] = useState('demo123');

  // Standard Form State
  const [email, setEmail] = useState('alex.cs@college.edu');
  const [password, setPassword] = useState('college123');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleErpSubmit = async (e) => {
    e.preventDefault();
    if (!erpUsername.trim() || !erpPassword.trim()) {
      setError('Please provide ERP Student Username and Password');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await erpLogin(erpUsername.trim(), erpPassword, selectedAvatarId);
      navigate(from, { replace: true });
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'ERP Authentication failed';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStandardSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide College Email or Roll Number and Password');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await login(email.trim(), password, selectedAvatarId);
      navigate(from, { replace: true });
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Login failed';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background with Tsukuyomi Crimson Ambience */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-25 mix-blend-screen"
        style={{ backgroundImage: `url(${AKATSUKI_BACKGROUNDS.auth.url})` }}
      />
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ background: AKATSUKI_BACKGROUNDS.auth.overlay }}
      />

      <div className="relative w-full max-w-md space-y-6">
        {/* Top Brand Logo */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <AkatsukiCloud size={42} />
          </Link>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-mono">
            AKATSUKI GATEWAY
          </h2>
          <p className="text-xs text-zinc-400">
            Intra-college authentication for verified students and research peers
          </p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950/90 border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('erp');
              setError('');
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'erp'
                ? 'bg-red-950/80 text-white border border-red-600/50 shadow-[0_0_15px_rgba(229,9,20,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            <span>Official ERP Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('standard');
              setError('');
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'standard'
                ? 'bg-red-950/80 text-white border border-red-600/50 shadow-[0_0_15px_rgba(229,9,20,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-red-500" />
            <span>Standard College ID</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2 shadow-md">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950/90 border border-red-950/60 shadow-[0_0_40px_rgba(229,9,20,0.18)] backdrop-blur-md">
          {authMode === 'erp' ? (
            /* ERP Login Form */
            <form onSubmit={handleErpSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-[11px] text-zinc-300">
                <span className="text-red-400 font-bold block mb-0.5">🏛️ MIT ERP Portal Integration</span>
                Enter your official student ERP portal credentials. Verified roll number, name, and department are synced automatically.
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  ERP Username or Student Email *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={erpUsername}
                    onChange={(e) => setErpUsername(e.target.value)}
                    placeholder="e.g. 2023bcse042@mit.asia"
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  ERP Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="password"
                    value={erpPassword}
                    onChange={(e) => setErpPassword(e.target.value)}
                    placeholder="Enter ERP password"
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Demo Fill Helper */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErpUsername('2023bcse042@mit.asia');
                    setErpPassword('demo123');
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-red-400" />
                  <span>Auto-fill Demo ERP Credentials (2023bcse042 / demo123)</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(229,9,20,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Authenticating via ERP...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Enter Akatsuki</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Standard College Login Form */
            <form onSubmit={handleStandardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  College Email or Roll Number *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alex.cs@college.edu or CS2026-042"
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Demo Fill Helper */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('alex.cs@college.edu');
                    setPassword('college123');
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-red-400" />
                  <span>Auto-fill Demo Account (alex.cs@college.edu / college123)</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(229,9,20,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Logging in...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Login to Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Avatar Persona Selector (Compact) */}
          <div className="mt-6 pt-6 border-t border-zinc-900">
            <AvatarSelector
              selectedId={selectedAvatarId}
              onSelect={setAvatar}
              compact={true}
            />
          </div>
        </div>

        {/* Link to Registration */}
        <div className="text-center text-xs text-zinc-400">
          <span>New student on campus? </span>
          <Link to="/register" className="text-red-400 hover:text-red-300 font-bold transition-colors">
            Register your profile here →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
