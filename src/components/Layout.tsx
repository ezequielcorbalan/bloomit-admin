import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Leaf, Users, LogOut, ShieldCheck } from 'lucide-react';
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

  function handleLogout() {
    onLogout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-neutral-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-300 flex flex-col shadow-soft">
        {/* Logo */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src={logoIcon} alt="Bloomit" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <p className="font-bold text-neutral-900 text-sm leading-tight">Bloomit Admin</p>
              <p className="text-xs text-neutral-500 leading-tight mt-0.5">Panel de administración</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
