import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, MapPin, Users, BarChart3, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/zones', icon: MapPin, label: 'Zones' },
  { to: '/presence', icon: Users, label: 'Presence' },
  { to: '/insights', icon: BarChart3, label: 'Insights' },
];

function Avatar({ name }) {
  const initials = (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <motion.aside
        initial={{ x: -240 }} animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="hidden md:flex flex-col w-60 bg-white border-r border-slate-100 shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-base">AuraWork</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  {label}
                  {isActive && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <Avatar name={user?.name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </motion.aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top header (logo only — no hamburger needed, bottom tabs handle nav) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">AuraWork</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name={user?.name} />
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4 text-slate-400 hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Page content — extra bottom padding on mobile for the tab bar */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Mobile bottom tab bar (hidden on desktop) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 z-30 safe-area-inset-bottom">
        <div className="flex items-stretch h-16">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className="flex-1">
              {({ isActive }) => (
                <div className="flex flex-col items-center justify-center h-full gap-0.5 relative">
                  {/* Animated pill indicator behind the icon */}
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTab"
                      className="absolute inset-x-2 top-1.5 h-8 bg-indigo-50 rounded-xl"
                      transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                    />
                  )}
                  <motion.div
                    animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                    className="relative z-10"
                  >
                    <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </motion.div>
                  <span className={`text-[10px] font-medium relative z-10 transition-colors duration-200 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  );
}
