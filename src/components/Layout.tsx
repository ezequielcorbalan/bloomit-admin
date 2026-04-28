import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Leaf, Users, LogOut, ShieldCheck, Menu, X } from 'lucide-react';
import logoIcon from '/logo-icon.png';

interface LayoutProps {
  children: React.ReactNode;
  adminName: string;
  onLogout: () => void;
}

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/plant-requests', icon: Leaf, label: 'Solicitudes' },
  { to: '/users', icon: Users, label: 'Usuarios' },
  { to: '/admins', icon: ShieldCheck, label: 'Superadmins' },
];

export function Layout({ children, adminName, onLogout }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    onLogout();
    navigate('/login');
  }

  // Close mobile menu when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-neutral-100">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-neutral-300 shadow-soft flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src={logoIcon} alt="Bloomit" className="w-8 h-8 object-contain" />
          </div>
          <p className="font-bold text-neutral-900 text-sm">Bloomit Admin</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-700"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (drawer on mobile, fixed on desktop) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-300 flex flex-col shadow-soft transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Logo + close (mobile) */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src={logoIcon} alt="Bloomit" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <p className="font-bold text-neutral-900 text-sm leading-tight">Bloomit Admin</p>
              <p className="text-xs text-neutral-500 leading-tight mt-0.5">Panel de administración</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-neutral-500'}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
              {adminName[0]?.toUpperCase()}
            </div>
            <p className="text-sm text-neutral-700 font-medium truncate">{adminName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-accent-coral/10 hover:text-accent-coral transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
