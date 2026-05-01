import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Send,
  Loader2,
  Search,
  X,
  Users,
  UserCheck,
  Megaphone,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import {
  getNotificationTypes,
  getUser,
  getUsers,
  sendNotification,
} from '../services/adminApi';
import type {
  AdminUserItem,
  NotificationType,
  PresetNotificationPayload,
  SendNotificationInput,
  SendNotificationResult,
} from '../services/adminApi';

type Target = 'all' | 'specific';
type Mode = 'preset' | 'custom';

interface SendOutcome {
  result: SendNotificationResult;
  message?: string;
}

interface DeviceOption {
  device_id: number;
  name: string;
  is_active: boolean;
  user_email: string;
}

const TITLE_MAX = 200;
const BODY_MAX = 1000;
const MAX_USER_IDS = 1000;
const CONFIRM_PHRASE = 'ENVIAR';

export function NotificationsPage() {
  const [target, setTarget] = useState<Target>('specific');
  const [selectedUsers, setSelectedUsers] = useState<AdminUserItem[]>([]);

  const [mode, setMode] = useState<Mode>('preset');
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState('');
  const [alertType, setAlertType] = useState<string>('');
  const [plantNickname, setPlantNickname] = useState('');
  const [hoursOffline, setHoursOffline] = useState<string>('');
  const [sensorDeviceId, setSensorDeviceId] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');
  const [threshold, setThreshold] = useState<string>('');

  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');

  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [outcome, setOutcome] = useState<SendOutcome | null>(null);

  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const deviceCacheRef = useRef<Map<number, DeviceOption[]>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setTypesLoading(true);
    getNotificationTypes()
      .then(res => {
        if (cancelled) return;
        setTypes(res.data);
        if (res.data.length > 0) setAlertType(prev => prev || res.data[0].id);
      })
      .catch(err => {
        if (cancelled) return;
        setTypesError(err.message || 'No se pudieron cargar los tipos');
      })
      .finally(() => {
        if (!cancelled) setTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedType = useMemo(
    () => types.find(t => t.id === alertType) ?? null,
    [types, alertType]
  );

  const allowsContext = (key: string) =>
    selectedType?.optional_context.includes(key) ?? false;

  const needsDeviceList =
    mode === 'preset' &&
    target === 'specific' &&
    selectedUsers.length > 0 &&
    (selectedType?.optional_context.includes('sensor_device_id') ?? false);

  useEffect(() => {
    if (!needsDeviceList) {
      setDevices([]);
      setDevicesLoading(false);
      return;
    }
    let cancelled = false;
    setDevicesLoading(true);
    (async () => {
      const cache = deviceCacheRef.current;
      const collected: DeviceOption[] = [];
      const seen = new Set<number>();
      for (const user of selectedUsers) {
        let userDevices = cache.get(user.id_user);
        if (!userDevices) {
          try {
            const res = await getUser(user.id_user);
            const list: DeviceOption[] = ((res.data?.devices ?? []) as Array<{
              device_id: number;
              name?: string | null;
              is_active?: boolean;
            }>).map(d => ({
              device_id: d.device_id,
              name: d.name?.trim() ? d.name : `Dispositivo #${d.device_id}`,
              is_active: !!d.is_active,
              user_email: user.email,
            }));
            cache.set(user.id_user, list);
            userDevices = list;
          } catch {
            userDevices = [];
          }
        }
        if (cancelled) return;
        for (const d of userDevices) {
          if (seen.has(d.device_id)) continue;
          seen.add(d.device_id);
          collected.push(d);
        }
      }
      if (cancelled) return;
      collected.sort(
        (a, b) =>
          a.user_email.localeCompare(b.user_email) || a.device_id - b.device_id
      );
      setDevices(collected);
      setDevicesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [needsDeviceList, selectedUsers]);

  useEffect(() => {
    if (!needsDeviceList) return;
    if (devicesLoading) return;
    if (!sensorDeviceId) return;
    const stillThere = devices.some(d => String(d.device_id) === sensorDeviceId);
    if (!stillThere) setSensorDeviceId('');
  }, [devices, devicesLoading, sensorDeviceId, needsDeviceList]);

  function resetResult() {
    setOutcome(null);
    setSubmitError('');
  }

  const validation = validateForm({
    target,
    selectedUsers,
    mode,
    alertType,
    customTitle,
    customBody,
    typesLoaded: !typesLoading && types.length > 0,
  });

  const needsConfirm = target === 'all';
  const confirmOk = !needsConfirm || confirmText.trim().toUpperCase() === CONFIRM_PHRASE;
  const canSubmit = validation.ok && confirmOk && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    resetResult();
    setSubmitting(true);

    const base = {
      target,
      ...(target === 'specific'
        ? { user_ids: selectedUsers.map(u => u.id_user) }
        : {}),
    };

    let payload: SendNotificationInput;
    if (mode === 'preset') {
      const preset: PresetNotificationPayload = { alert_type: alertType };
      if (plantNickname.trim()) preset.plant_nickname = plantNickname.trim();
      if (allowsContext('hours_offline') && hoursOffline.trim()) {
        const v = Number(hoursOffline);
        if (Number.isFinite(v)) preset.hours_offline = v;
      }
      if (allowsContext('sensor_device_id') && sensorDeviceId.trim()) {
        const v = Number(sensorDeviceId);
        if (Number.isFinite(v)) preset.sensor_device_id = v;
      }
      if (allowsContext('current_value') && currentValue.trim()) {
        const v = Number(currentValue);
        if (Number.isFinite(v)) preset.current_value = v;
      }
      if (allowsContext('threshold') && threshold.trim()) {
        const v = Number(threshold);
        if (Number.isFinite(v)) preset.threshold = v;
      }
      payload = { ...base, mode: 'preset', preset };
    } else {
      payload = {
        ...base,
        mode: 'custom',
        custom: { title: customTitle.trim(), body: customBody.trim() },
      };
    }

    try {
      const res = await sendNotification(payload);
      setOutcome({ result: res.data, message: res.message });
      setConfirmText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notificaciones</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Enviá un push preset o un anuncio custom a los usuarios con dispositivos registrados.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <StepCard step={1} title="Destinatarios" icon={<Users className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleCard
              active={target === 'specific'}
              onClick={() => {
                setTarget('specific');
                resetResult();
              }}
              icon={<UserCheck className="w-5 h-5" />}
              title="Usuarios específicos"
              subtitle="Buscar y elegir hasta 1000 usuarios"
            />
            <ToggleCard
              active={target === 'all'}
              onClick={() => {
                setTarget('all');
                resetResult();
              }}
              icon={<Megaphone className="w-5 h-5" />}
              title="Todos los usuarios"
              subtitle="Broadcast a todos los que tengan push tokens"
            />
          </div>

          {target === 'specific' && (
            <div className="mt-5">
              <UserPicker
                selected={selectedUsers}
                onChange={users => {
                  setSelectedUsers(users);
                  resetResult();
                }}
              />
              {selectedUsers.length >= MAX_USER_IDS && (
                <p className="text-xs text-accent-coral-dark mt-2">
                  Máximo {MAX_USER_IDS} usuarios por envío.
                </p>
              )}
            </div>
          )}
        </StepCard>

        <StepCard step={2} title="Tipo de notificación" icon={<Sparkles className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <ToggleCard
              active={mode === 'preset'}
              onClick={() => {
                setMode('preset');
                resetResult();
              }}
              icon={<Sparkles className="w-5 h-5" />}
              title="Preset"
              subtitle="Misma alerta que dispara el backend"
            />
            <ToggleCard
              active={mode === 'custom'}
              onClick={() => {
                setMode('custom');
                resetResult();
              }}
              icon={<Megaphone className="w-5 h-5" />}
              title="Custom"
              subtitle="Título y cuerpo libres"
            />
          </div>

          {mode === 'preset' ? (
            <PresetForm
              types={types}
              loading={typesLoading}
              error={typesError}
              alertType={alertType}
              onAlertTypeChange={value => {
                setAlertType(value);
                resetResult();
              }}
              plantNickname={plantNickname}
              onPlantNicknameChange={setPlantNickname}
              hoursOffline={hoursOffline}
              onHoursOfflineChange={setHoursOffline}
              sensorDeviceId={sensorDeviceId}
              onSensorDeviceIdChange={setSensorDeviceId}
              currentValue={currentValue}
              onCurrentValueChange={setCurrentValue}
              threshold={threshold}
              onThresholdChange={setThreshold}
              selectedType={selectedType}
              devices={devices}
              devicesLoading={devicesLoading}
              hasUserSelection={target === 'specific' && selectedUsers.length > 0}
              showMultiUserDeviceHint={target === 'specific' && selectedUsers.length > 1}
              targetIsSpecific={target === 'specific'}
            />
          ) : (
            <CustomForm
              title={customTitle}
              onTitleChange={setCustomTitle}
              body={customBody}
              onBodyChange={setCustomBody}
            />
          )}
        </StepCard>

        <StepCard step={3} title="Confirmación" icon={<Send className="w-4 h-4" />}>
          <Summary
            target={target}
            selectedCount={selectedUsers.length}
            mode={mode}
            preset={
              mode === 'preset'
                ? {
                    label: selectedType?.label ?? alertType,
                    sampleBody: selectedType?.sample_body ?? '',
                    plantNickname,
                  }
                : null
            }
            custom={mode === 'custom' ? { title: customTitle, body: customBody } : null}
          />

          {!validation.ok && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent-yellow/40 bg-accent-yellow/10 px-3 py-2 text-sm text-neutral-700">
              <AlertTriangle className="w-4 h-4 text-accent-yellow-dark mt-0.5 shrink-0" />
              <span>{validation.message}</span>
            </div>
          )}

          {needsConfirm && validation.ok && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-neutral-700 mb-1">
                Estás por enviar a <span className="text-accent-coral-dark">todos</span> los usuarios.
                Escribí <span className="font-mono text-accent-coral-dark">{CONFIRM_PHRASE}</span> para habilitar.
              </label>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                className="w-full max-w-xs border border-neutral-300 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-accent-coral focus:outline-none bg-neutral-50"
              />
            </div>
          )}

          {submitError && <SubmitErrorBanner message={submitError} />}

          {outcome && <ResultPanel outcome={outcome} />}

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-soft"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar notificación
            </button>
          </div>
        </StepCard>
      </div>
    </div>
  );
}

// ── Step container ───────────────────────────────────────────────────────────

function StepCard({
  step,
  title,
  icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-300 shadow-soft">
      <header className="px-6 py-4 border-b border-neutral-200 flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <span className="text-primary">{icon}</span>
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function ToggleCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border-2 px-4 py-3 transition-colors ${
        active
          ? 'border-primary bg-primary/5'
          : 'border-neutral-200 hover:border-neutral-300 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            active ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-500'
          }`}
        >
          {icon}
        </span>
        <div>
          <p className={`text-sm font-bold ${active ? 'text-primary' : 'text-neutral-900'}`}>
            {title}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

// ── User picker ──────────────────────────────────────────────────────────────

function UserPicker({
  selected,
  onChange,
}: {
  selected: AdminUserItem[];
  onChange: (users: AdminUserItem[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await getUsers({ search: query.trim(), limit: 10 });
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function addUser(user: AdminUserItem) {
    if (selected.some(u => u.id_user === user.id_user)) return;
    if (selected.length >= MAX_USER_IDS) return;
    onChange([...selected, user]);
    setQuery('');
    setResults([]);
  }

  function removeUser(id: number) {
    onChange(selected.filter(u => u.id_user !== id));
  }

  const filteredResults = results.filter(
    r => !selected.some(s => s.id_user === r.id_user)
  );

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-semibold text-neutral-700 mb-1">
        Buscar usuarios
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Escribí un email..."
          className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute z-20 mt-1 left-0 right-0 bg-white border border-neutral-300 rounded-lg shadow-medium max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-neutral-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-400">Sin resultados</div>
          ) : (
            filteredResults.map(user => (
              <button
                key={user.id_user}
                type="button"
                onClick={() => addUser(user)}
                className="w-full text-left px-4 py-2.5 hover:bg-neutral-100 flex items-center justify-between"
              >
                <span className="text-sm text-neutral-900">{user.email}</span>
                <span className="text-xs text-neutral-400 font-mono">#{user.id_user}</span>
              </button>
            ))
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selected.map(user => (
            <span
              key={user.id_user}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
            >
              <span>{user.email}</span>
              <span className="text-primary/60 font-mono">#{user.id_user}</span>
              <button
                type="button"
                onClick={() => removeUser(user.id_user)}
                className="hover:bg-primary/20 rounded-full p-0.5"
                aria-label={`Quitar ${user.email}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-500 mt-2">
        {selected.length} seleccionado{selected.length === 1 ? '' : 's'}
        {selected.length > 0 ? ` · máx ${MAX_USER_IDS}` : ''}
      </p>
    </div>
  );
}

// ── Preset / custom forms ────────────────────────────────────────────────────

function PresetForm({
  types,
  loading,
  error,
  alertType,
  onAlertTypeChange,
  plantNickname,
  onPlantNicknameChange,
  hoursOffline,
  onHoursOfflineChange,
  sensorDeviceId,
  onSensorDeviceIdChange,
  currentValue,
  onCurrentValueChange,
  threshold,
  onThresholdChange,
  selectedType,
  devices,
  devicesLoading,
  hasUserSelection,
  showMultiUserDeviceHint,
  targetIsSpecific,
}: {
  types: NotificationType[];
  loading: boolean;
  error: string;
  alertType: string;
  onAlertTypeChange: (v: string) => void;
  plantNickname: string;
  onPlantNicknameChange: (v: string) => void;
  hoursOffline: string;
  onHoursOfflineChange: (v: string) => void;
  sensorDeviceId: string;
  onSensorDeviceIdChange: (v: string) => void;
  currentValue: string;
  onCurrentValueChange: (v: string) => void;
  threshold: string;
  onThresholdChange: (v: string) => void;
  selectedType: NotificationType | null;
  devices: DeviceOption[];
  devicesLoading: boolean;
  hasUserSelection: boolean;
  showMultiUserDeviceHint: boolean;
  targetIsSpecific: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500 py-3">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando tipos...
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-accent-coral/10 border border-accent-coral/30 rounded-lg px-4 py-3 text-sm text-accent-coral-dark">
        {error}
      </div>
    );
  }
  if (types.length === 0) {
    return <div className="text-sm text-neutral-400">No hay tipos configurados.</div>;
  }

  const allows = (key: string) => selectedType?.optional_context.includes(key) ?? false;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Tipo de alerta
        </label>
        <div className="relative">
          <select
            value={alertType}
            onChange={e => onAlertTypeChange(e.target.value)}
            className="w-full appearance-none border border-neutral-300 rounded-lg px-3 py-2.5 pr-9 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white"
          >
            {types.map(t => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        {selectedType && (
          <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <p className="text-xs text-neutral-500">{selectedType.description}</p>
            <p className="text-sm text-neutral-700 mt-1">
              <span className="font-semibold">Preview:</span> {selectedType.sample_body}
            </p>
            {selectedType.supports_snooze && (
              <p className="text-xs text-secondary-dark mt-1">Soporta botón de snooze.</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {allows('plant_nickname') && (
          <Field
            label="Nombre de la planta (opcional)"
            value={plantNickname}
            onChange={onPlantNicknameChange}
            placeholder="Cecilia"
          />
        )}
        {allows('hours_offline') && (
          <Field
            label="Horas offline"
            value={hoursOffline}
            onChange={onHoursOfflineChange}
            type="number"
            placeholder="6"
          />
        )}
        {allows('sensor_device_id') && (
          <DeviceField
            value={sensorDeviceId}
            onChange={onSensorDeviceIdChange}
            devices={devices}
            loading={devicesLoading}
            hasUserSelection={hasUserSelection}
            showMultiUserHint={showMultiUserDeviceHint}
            targetIsSpecific={targetIsSpecific}
          />
        )}
        {allows('current_value') && (
          <Field
            label="Valor actual"
            value={currentValue}
            onChange={onCurrentValueChange}
            type="number"
            placeholder="15"
          />
        )}
        {allows('threshold') && (
          <Field
            label="Umbral"
            value={threshold}
            onChange={onThresholdChange}
            type="number"
            placeholder="20"
          />
        )}
      </div>
    </div>
  );
}

function CustomForm({
  title,
  onTitleChange,
  body,
  onBodyChange,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  body: string;
  onBodyChange: (v: string) => void;
}) {
  const titleOver = title.length > TITLE_MAX;
  const bodyOver = body.length > BODY_MAX;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-neutral-700">Título</label>
          <span className={`text-xs ${titleOver ? 'text-accent-coral-dark' : 'text-neutral-400'}`}>
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          maxLength={TITLE_MAX + 50}
          placeholder="Mantenimiento programado"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:outline-none bg-neutral-50 ${
            titleOver ? 'border-accent-coral focus:ring-accent-coral' : 'border-neutral-300 focus:ring-primary'
          }`}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-neutral-700">Cuerpo</label>
          <span className={`text-xs ${bodyOver ? 'text-accent-coral-dark' : 'text-neutral-400'}`}>
            {body.length}/{BODY_MAX}
          </span>
        </div>
        <textarea
          value={body}
          onChange={e => onBodyChange(e.target.value)}
          rows={4}
          maxLength={BODY_MAX + 50}
          placeholder="El sistema estará caído mañana de 2 a 4 AM."
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:outline-none bg-neutral-50 resize-y ${
            bodyOver ? 'border-accent-coral focus:ring-accent-coral' : 'border-neutral-300 focus:ring-primary'
          }`}
        />
      </div>

      {(title || body) && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
            Preview
          </p>
          <p className="text-sm font-semibold text-neutral-900">
            {title || <span className="text-neutral-400">Título...</span>}
          </p>
          <p className="text-sm text-neutral-700 mt-0.5 whitespace-pre-wrap">
            {body || <span className="text-neutral-400">Cuerpo...</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50"
      />
    </div>
  );
}

function DeviceField({
  value,
  onChange,
  devices,
  loading,
  hasUserSelection,
  showMultiUserHint,
  targetIsSpecific,
}: {
  value: string;
  onChange: (v: string) => void;
  devices: DeviceOption[];
  loading: boolean;
  hasUserSelection: boolean;
  showMultiUserHint: boolean;
  targetIsSpecific: boolean;
}) {
  const showSelect = hasUserSelection && (loading || devices.length > 0);
  const showEmpty = hasUserSelection && !loading && devices.length === 0;

  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-700 mb-1">
        Dispositivo
      </label>
      {showSelect ? (
        <div className="relative">
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={loading}
            className="w-full appearance-none border border-neutral-300 rounded-lg px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50 disabled:opacity-60"
          >
            <option value="">{loading ? 'Cargando dispositivos...' : 'Sin dispositivo específico'}</option>
            {devices.map(d => (
              <option key={d.device_id} value={String(d.device_id)}>
                {d.name} · #{d.device_id}
                {showMultiUserHint ? ` — ${d.user_email}` : ''}
                {!d.is_active ? ' (inactivo)' : ''}
              </option>
            ))}
          </select>
          {loading ? (
            <Loader2 className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin pointer-events-none" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>
      ) : (
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="12"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50"
        />
      )}
      {showEmpty && (
        <p className="text-xs text-neutral-500 mt-1">
          Los usuarios seleccionados no tienen dispositivos. Podés ingresar un ID manualmente.
        </p>
      )}
      {targetIsSpecific && !hasUserSelection && (
        <p className="text-xs text-neutral-500 mt-1">
          Seleccioná usuarios para elegir un dispositivo de la lista.
        </p>
      )}
    </div>
  );
}

// ── Summary + result ─────────────────────────────────────────────────────────

function Summary({
  target,
  selectedCount,
  mode,
  preset,
  custom,
}: {
  target: Target;
  selectedCount: number;
  mode: Mode;
  preset: { label: string; sampleBody: string; plantNickname: string } | null;
  custom: { title: string; body: string } | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SummaryBlock title="Destinatarios">
        {target === 'all' ? (
          <p className="text-sm text-neutral-700">
            <span className="font-bold">Todos</span> los usuarios con dispositivos registrados.
          </p>
        ) : (
          <p className="text-sm text-neutral-700">
            <span className="font-bold">{selectedCount}</span> usuario{selectedCount === 1 ? '' : 's'} específico{selectedCount === 1 ? '' : 's'}
          </p>
        )}
      </SummaryBlock>
      <SummaryBlock title={mode === 'preset' ? 'Preset' : 'Custom'}>
        {mode === 'preset' && preset ? (
          <div>
            <p className="text-sm font-semibold text-neutral-900">{preset.label}</p>
            <p className="text-sm text-neutral-700 mt-0.5">
              {preset.plantNickname
                ? `${preset.plantNickname} · ${preset.sampleBody}`
                : preset.sampleBody}
            </p>
          </div>
        ) : custom ? (
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {custom.title || <span className="text-neutral-400">(sin título)</span>}
            </p>
            <p className="text-sm text-neutral-700 mt-0.5 whitespace-pre-wrap">
              {custom.body || <span className="text-neutral-400">(sin cuerpo)</span>}
            </p>
          </div>
        ) : null}
      </SummaryBlock>
    </div>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
      <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function ResultPanel({ outcome }: { outcome: SendOutcome }) {
  const { result, message } = outcome;
  const noTargets = result.target_users === 0;
  return (
    <div
      className={`mt-4 rounded-lg border px-4 py-3 ${
        noTargets
          ? 'border-accent-yellow/40 bg-accent-yellow/10'
          : 'border-secondary/30 bg-secondary/10'
      }`}
    >
      <div className="flex items-start gap-2">
        {noTargets ? (
          <AlertTriangle className="w-4 h-4 text-accent-yellow-dark mt-0.5 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-secondary-dark mt-0.5 shrink-0" />
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-900">
            {noTargets ? 'Sin destinatarios' : 'Notificación enviada'}
          </p>
          {message && <p className="text-sm text-neutral-700 mt-0.5">{message}</p>}
          <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
            <Stat label="Usuarios" value={result.target_users} />
            <Stat label="Enviadas" value={result.sent} highlight="ok" />
            <Stat
              label="Fallidas"
              value={result.failed}
              highlight={result.failed > 0 ? 'error' : 'ok'}
            />
          </div>
          {result.failures.length > 0 && (
            <FailuresPanel failures={result.failures} />
          )}
        </div>
      </div>
    </div>
  );
}

function SubmitErrorBanner({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const ta = document.createElement('textarea');
        ta.value = message;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  }

  return (
    <div className="mt-4 bg-accent-coral/10 border border-accent-coral/30 rounded-lg px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-accent-coral-dark whitespace-pre-wrap break-words">
          {message}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-accent-coral/30 hover:bg-white text-accent-coral-dark transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Copiado
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copiar
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function FailuresPanel({
  failures,
}: {
  failures: Array<{ user_id: number; error: string }>;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const text = useMemo(
    () => failures.map(f => `#${f.user_id} — ${f.error}`).join('\n'),
    [failures]
  );

  async function handleCopy() {
    setCopyError('');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError('No se pudo copiar');
    }
  }

  return (
    <details className="mt-3" open>
      <summary className="text-xs font-semibold text-accent-coral-dark cursor-pointer">
        Ver detalles ({failures.length})
      </summary>
      <div className="mt-2 rounded-md border border-accent-coral/20 bg-white">
        <div className="flex items-center justify-between px-3 py-2 border-b border-accent-coral/10">
          <p className="text-xs font-semibold text-accent-coral-dark">
            {failures.length} error{failures.length === 1 ? '' : 'es'}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-neutral-300 hover:bg-neutral-100 text-neutral-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-secondary-dark" /> Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar errores
              </>
            )}
          </button>
        </div>
        <ul className="px-3 py-2 space-y-1 text-xs text-neutral-700 max-h-56 overflow-y-auto">
          {failures.map((f, i) => (
            <li key={`${f.user_id}-${i}`} className="font-mono break-all">
              #{f.user_id} — {f.error}
            </li>
          ))}
        </ul>
        {copyError && (
          <p className="px-3 pb-2 text-xs text-accent-coral-dark">{copyError}</p>
        )}
      </div>
    </details>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: 'ok' | 'error';
}) {
  const color =
    highlight === 'ok'
      ? 'text-secondary-dark'
      : highlight === 'error'
      ? 'text-accent-coral-dark'
      : 'text-neutral-900';
  return (
    <div className="rounded-md bg-white px-3 py-2 border border-neutral-200">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateForm(input: {
  target: Target;
  selectedUsers: AdminUserItem[];
  mode: Mode;
  alertType: string;
  customTitle: string;
  customBody: string;
  typesLoaded: boolean;
}): { ok: true } | { ok: false; message: string } {
  if (input.target === 'specific' && input.selectedUsers.length === 0) {
    return { ok: false, message: 'Seleccioná al menos un usuario.' };
  }
  if (input.target === 'specific' && input.selectedUsers.length > MAX_USER_IDS) {
    return { ok: false, message: `Máximo ${MAX_USER_IDS} usuarios por envío.` };
  }
  if (input.mode === 'preset') {
    if (!input.typesLoaded) {
      return { ok: false, message: 'Esperá a que carguen los tipos de notificación.' };
    }
    if (!input.alertType) {
      return { ok: false, message: 'Elegí un tipo de alerta.' };
    }
  } else {
    if (!input.customTitle.trim()) {
      return { ok: false, message: 'Falta el título.' };
    }
    if (!input.customBody.trim()) {
      return { ok: false, message: 'Falta el cuerpo.' };
    }
    if (input.customTitle.length > TITLE_MAX) {
      return { ok: false, message: `El título supera los ${TITLE_MAX} caracteres.` };
    }
    if (input.customBody.length > BODY_MAX) {
      return { ok: false, message: `El cuerpo supera los ${BODY_MAX} caracteres.` };
    }
  }
  return { ok: true };
}
