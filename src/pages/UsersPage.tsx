import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronRight, Cpu, Leaf } from 'lucide-react';
import { getUsers, getUser } from '../services/adminApi';
import type { AdminUserItem } from '../services/adminApi';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers({ limit, offset, search: search || undefined });
      setUsers(res.data);
      setTotal(res.meta.total);
    } finally {
      setLoading(false);
    }
  }, [search, offset]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setOffset(0);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Usuarios</h1>
        <p className="text-neutral-500 text-sm mt-1">{total} usuarios registrados</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar por email..."
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg transition-colors">
          Buscar
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setOffset(0); }}
            className="px-4 py-2.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-600 text-sm font-medium rounded-lg transition-colors">
            Limpiar
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden shadow-soft">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">No se encontraron usuarios</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map(user => (
                <UserRow key={user.id_user} user={user} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-neutral-500">
            Mostrando {offset + 1}–{Math.min(offset + limit, total)} de {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg disabled:opacity-40 hover:bg-neutral-100 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg disabled:opacity-40 hover:bg-neutral-100 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({ user }: { user: AdminUserItem }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function toggleExpand() {
    if (!expanded && !detail) {
      setDetailLoading(true);
      try {
        const res = await getUser(user.id_user);
        setDetail(res.data);
      } finally {
        setDetailLoading(false);
      }
    }
    setExpanded(!expanded);
  }

  return (
    <>
      <tr className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={toggleExpand}>
        <td className="px-6 py-4 text-sm text-neutral-500 font-mono">#{user.id_user}</td>
        <td className="px-6 py-4 text-sm text-neutral-900 font-medium">{user.email}</td>
        <td className="px-6 py-4 text-right">
          <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform inline-block ${expanded ? 'rotate-90' : ''}`} />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={3} className="px-6 pb-4 bg-neutral-50 border-b border-neutral-100">
            {detailLoading ? (
              <div className="py-3 text-sm text-neutral-400">Cargando...</div>
            ) : detail ? (
              <div className="grid grid-cols-2 gap-4 pt-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase mb-2 tracking-wider">
                    <Cpu className="w-3.5 h-3.5 text-primary" /> Dispositivos ({detail.devices.length})
                  </div>
                  {detail.devices.length === 0 ? (
                    <p className="text-sm text-neutral-400">Sin dispositivos</p>
                  ) : (
                    <ul className="space-y-1">
                      {detail.devices.slice(0, 5).map((d: any) => (
                        <li key={d.device_id} className="text-sm text-neutral-700 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${d.is_active ? 'bg-secondary' : 'bg-neutral-300'}`} />
                          {d.name || `Dispositivo #${d.device_id}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase mb-2 tracking-wider">
                    <Leaf className="w-3.5 h-3.5 text-primary" /> Solicitudes ({detail.plant_requests.length})
                  </div>
                  {detail.plant_requests.length === 0 ? (
                    <p className="text-sm text-neutral-400">Sin solicitudes</p>
                  ) : (
                    <ul className="space-y-1">
                      {detail.plant_requests.slice(0, 5).map((r: any) => (
                        <li key={r.id_request} className="text-sm text-neutral-700">
                          {r.plant_name} — <span className="text-neutral-400">{r.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}
