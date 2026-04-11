import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import {
  getPlantRequests,
  approvePlantRequest,
  rejectPlantRequest,
} from '../services/adminApi';
import type { PlantRequest } from '../services/adminApi';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-accent-yellow/20 text-accent-yellow-dark',
  approved: 'bg-secondary/10 text-secondary-dark',
  rejected: 'bg-accent-coral/10 text-accent-coral-dark',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

interface ApproveModalProps {
  request: PlantRequest;
  onClose: () => void;
  onApproved: () => void;
}

function ApproveModal({ request, onClose, onApproved }: ApproveModalProps) {
  const [plantName, setPlantName] = useState(request.plant_name);
  const [scientificName, setScientificName] = useState(request.scientific_name || '');
  const [plantTypeId, setPlantTypeId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleApprove() {
    if (!plantTypeId) { setError('Seleccioná un tipo de planta'); return; }
    setLoading(true);
    setError('');
    try {
      await approvePlantRequest(request.id_request, {
        plant_name: plantName,
        scientific_name: scientificName || undefined,
        plant_type_id: parseInt(plantTypeId),
        admin_notes: adminNotes || undefined,
      });
      onApproved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-large w-full max-w-md border border-neutral-300">
        <div className="p-6 border-b border-neutral-200">
          <h3 className="text-lg font-bold text-neutral-900">Aprobar solicitud</h3>
          <p className="text-sm text-neutral-500 mt-1">Crear planta para: <strong>{request.plant_name}</strong></p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Nombre de la planta</label>
            <input value={plantName} onChange={e => setPlantName(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Nombre científico (opcional)</label>
            <input value={scientificName} onChange={e => setScientificName(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Tipo de planta (ID)</label>
            <input
              type="number"
              placeholder="ej: 1"
              value={plantTypeId}
              onChange={e => setPlantTypeId(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Notas internas (opcional)</label>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none bg-neutral-50" />
          </div>
          {error && <p className="text-sm text-accent-coral-dark">{error}</p>}
        </div>
        <div className="p-6 border-t border-neutral-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 font-medium">Cancelar</button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Aprobar y crear planta
          </button>
        </div>
      </div>
    </div>
  );
}

interface RejectModalProps {
  request: PlantRequest;
  onClose: () => void;
  onRejected: () => void;
}

function RejectModal({ request, onClose, onRejected }: RejectModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReject() {
    setLoading(true);
    try {
      await rejectPlantRequest(request.id_request, notes || undefined);
      onRejected();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-large w-full max-w-md border border-neutral-300">
        <div className="p-6 border-b border-neutral-200">
          <h3 className="text-lg font-bold text-neutral-900">Rechazar solicitud</h3>
          <p className="text-sm text-neutral-500 mt-1">Solicitud: <strong>{request.plant_name}</strong></p>
        </div>
        <div className="p-6">
          <label className="block text-sm font-semibold text-neutral-700 mb-1">Motivo (opcional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Ej: Ya existe esta planta en el catálogo."
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent-coral focus:outline-none resize-none bg-neutral-50" />
        </div>
        <div className="p-6 border-t border-neutral-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 font-medium">Cancelar</button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-coral hover:bg-accent-coral-dark disabled:bg-accent-coral-light text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlantRequestsPage() {
  const [requests, setRequests] = useState<PlantRequest[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<PlantRequest | null>(null);
  const [rejecting, setRejecting] = useState<PlantRequest | null>(null);

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await getPlantRequests(filter === 'all' ? undefined : filter);
      setRequests(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRequests(); }, [filter]);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobadas' },
    { key: 'rejected', label: 'Rechazadas' },
    { key: 'all', label: 'Todas' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Solicitudes de plantas</h1>
        <p className="text-neutral-500 text-sm mt-1">Revisá y aprobá las solicitudes de los usuarios</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              filter === key
                ? 'bg-primary text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-200 border border-neutral-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden shadow-soft">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-neutral-500">
            <p>No hay solicitudes {filter !== 'all' ? filters.find(f => f.key === filter)?.label.toLowerCase() : ''}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Planta</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Usuario</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {requests.map(req => (
                <tr key={req.id_request} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-neutral-900">{req.plant_name}</p>
                    {req.scientific_name && <p className="text-xs text-neutral-500 italic">{req.scientific_name}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">ID {req.user_id}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[req.status]}`}>
                      {STATUS_ICON[req.status]}
                      {req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-500">{formatDate(req.created_at)}</td>
                  <td className="px-6 py-4">
                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setApproving(req)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                        </button>
                        <button
                          onClick={() => setRejecting(req)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral text-xs font-semibold rounded-lg transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rechazar
                        </button>
                      </div>
                    )}
                    {req.status !== 'pending' && req.admin_notes && (
                      <p className="text-xs text-neutral-400 max-w-40 truncate" title={req.admin_notes}>
                        {req.admin_notes}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {approving && (
        <ApproveModal
          request={approving}
          onClose={() => setApproving(null)}
          onApproved={() => { setApproving(null); loadRequests(); }}
        />
      )}
      {rejecting && (
        <RejectModal
          request={rejecting}
          onClose={() => setRejecting(null)}
          onRejected={() => { setRejecting(null); loadRequests(); }}
        />
      )}
    </div>
  );
}
