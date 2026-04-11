import { useEffect, useState } from 'react';
import { ShieldCheck, Plus, PowerOff, Power, Loader2, X } from 'lucide-react';
import { getAdmins, createAdmin, toggleAdmin } from '../services/adminApi';
import type { AdminItem } from '../services/adminApi';

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

interface NewAdminModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewAdminModal({ onClose, onCreated }: NewAdminModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createAdmin({ email, name, password });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-large w-full max-w-md border border-neutral-300">
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Nuevo superadmin</h3>
            <p className="text-sm text-neutral-500 mt-0.5">Solo cuentas @bloomit.com.ar</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Nombre completo"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Email corporativo</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="nombre@bloomit.com.ar"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Contraseña inicial</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50"
            />
          </div>
          {error && <p className="text-sm text-accent-coral-dark">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 font-medium">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminsPage() {
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await getAdmins();
      setAdmins(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(admin: AdminItem) {
    setToggling(admin.id_admin);
    try {
      const res = await toggleAdmin(admin.id_admin);
      setAdmins(prev => prev.map(a => a.id_admin === admin.id_admin ? res.data : a));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Superadmins</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {admins.length} cuenta{admins.length !== 1 ? 's' : ''} de administración
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo admin
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-accent-coral/10 border border-accent-coral/30 rounded-lg px-4 py-3 text-sm text-accent-coral-dark">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden shadow-soft">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">No hay admins registrados</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Admin</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Creado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {admins.map(admin => (
                <tr key={admin.id_admin} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {admin.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">{admin.name}</p>
                        <p className="text-xs text-neutral-400 font-mono">ID {admin.id_admin}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{admin.email}</td>
                  <td className="px-6 py-4">
                    {admin.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary/10 text-secondary-dark">
                        <ShieldCheck className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-200 text-neutral-600">
                        <PowerOff className="w-3 h-3" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-500">{formatDate(admin.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggle(admin)}
                      disabled={toggling === admin.id_admin}
                      title={admin.is_active ? 'Desactivar' : 'Activar'}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        admin.is_active
                          ? 'bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral'
                          : 'bg-secondary/10 hover:bg-secondary/20 text-secondary-dark'
                      }`}
                    >
                      {toggling === admin.id_admin ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : admin.is_active ? (
                        <><PowerOff className="w-3.5 h-3.5" /> Desactivar</>
                      ) : (
                        <><Power className="w-3.5 h-3.5" /> Activar</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <NewAdminModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
