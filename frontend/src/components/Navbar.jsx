import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  PlusCircle, 
  MessageSquare, 
  LayoutDashboard, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Menu, 
  X, 
  Radio, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import AkatsukiCloud from '../assets/AkatsukiCloud';

export const Navbar = () => {
  const { user, isAuthenticated, logout, currentAvatar } = useAuth();
  const { isConnected } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/85 backdrop-blur-xl border-b border-red-950/60 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <AkatsukiCloud size={38} className="group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-widest text-white group-hover:text-red-500 transition-colors uppercase font-mono">
              AKATSUKI
            </span>
            <span className="text-[9px] font-semibold tracking-wider text-red-400 uppercase -mt-1">
              Campus Work Engine
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
              isActive('/')
                ? 'bg-red-950/60 text-white border border-red-600/40 shadow-[0_0_15px_rgba(229,9,20,0.25)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-red-500" />
            <span>Marketplace</span>
          </Link>

          <Link
            to="/post-job"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
              isActive('/post-job')
                ? 'bg-red-950/60 text-white border border-red-600/40 shadow-[0_0_15px_rgba(229,9,20,0.25)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-red-500" />
            <span>Post Role</span>
          </Link>

          {isAuthenticated && (
            <>
              <Link
                to="/conversations"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                  isActive('/conversations')
                    ? 'bg-red-950/60 text-white border border-red-600/40 shadow-[0_0_15px_rgba(229,9,20,0.25)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-red-500" />
                <span>Job Inquiries</span>
              </Link>

              <Link
                to="/my-dashboard"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                  isActive('/my-dashboard')
                    ? 'bg-red-950/60 text-white border border-red-600/40 shadow-[0_0_15px_rgba(229,9,20,0.25)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-red-500" />
                <span>My Hub</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Action / Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Real-time WS connection pill */}
              <div
                className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                  isConnected
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-yellow-950/30 text-yellow-500 border-yellow-500/30'
                }`}
                title={isConnected ? 'Real-Time WebSocket Link Active' : 'Connecting WebSocket...'}
              >
                <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-yellow-500'}`} />
                <span>{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
              </div>

              {/* User Identity Pill */}
              <Link
                to="/my-dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-red-500/40 transition-all group"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-red-500/50 shadow-sm">
                  <img
                    src={currentAvatar?.image}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = currentAvatar?.avatarUrl;
                    }}
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1 max-w-[120px]">
                    {user?.name}
                  </span>
                  <span className="text-[9px] text-zinc-400 line-clamp-1">
                    {user?.roll_number}
                  </span>
                </div>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 transition-all"
                title="Log out of Akatsuki"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-red-500/40 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                <span>College / ERP Login</span>
              </Link>

              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Join Akatsuki</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950/95 border-b border-zinc-800 px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white"
          >
            Marketplace
          </Link>
          <Link
            to="/post-job"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white"
          >
            Post Opportunity
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/conversations"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white"
              >
                Job Inquiries & DMs
              </Link>
              <Link
                to="/my-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white"
              >
                My Dashboard ({user?.roll_number})
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-950/40"
              >
                Log Out
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-zinc-900 text-white font-semibold text-xs border border-zinc-800"
              >
                College / ERP Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs"
              >
                Register Student
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
