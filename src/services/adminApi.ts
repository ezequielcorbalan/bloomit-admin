/**
 * adminApi.ts — wrapper for all admin-api calls
 * Base URL comes from VITE_ADMIN_API_URL env var (falls back to localhost for dev)
 */

const BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:8788';

function getToken(): string | null {
  return localStorage.getItem('adminToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && path !== '/admin/login') {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.dispatchEvent(new Event('auth:expired'));
    throw new Error(data.error || 'Sesión expirada');
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  success: boolean;
  data: { token: string; admin: { id: number; email: string; name: string } };
}

export async function login(email: string, password: string, turnstileToken: string): Promise<LoginResponse> {
  return request<LoginResponse>('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, turnstileToken }),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface OverviewData {
  users: {
    total: number;
    active_last_24h: number;
  };
  devices: {
    total: number;
    active: number;
    inactive: number;
    connected_last_24h: number;
  };
  sensors_last_24h: number;
  plant_requests_pending: number;
}

export async function getOverview(): Promise<{ success: boolean; data: OverviewData }> {
  return request('/admin/analytics/overview');
}

export async function getDeviceAnalytics(): Promise<{ success: boolean; data: any }> {
  return request('/admin/analytics/devices');
}

export async function getPlantRequestAnalytics(): Promise<{ success: boolean; data: any }> {
  return request('/admin/analytics/plant-requests');
}

export interface DailyLoginPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export async function getDailyLogins(days = 15): Promise<{ success: boolean; data: DailyLoginPoint[] }> {
  return request(`/admin/analytics/daily-logins?days=${days}`);
}

export interface ConnectedUserItem {
  id_user: number;
  email: string;
  device_count: number;
  last_connected: number; // unix seconds
}

export async function getConnectedUsers(hours = 24): Promise<{ success: boolean; data: ConnectedUserItem[] }> {
  return request(`/admin/analytics/connected-users?hours=${hours}`);
}

// ── Plant Requests ─────────────────────────────────────────────────────────────

export interface PlantRequest {
  id_request: number;
  user_id: number;
  plant_name: string;
  scientific_name: string | null;
  plant_type_id: number | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: number | null;
  resulting_plant_id: number | null;
  created_at: number;
  reviewed_at: number | null;
}

export async function getPlantRequests(status?: string): Promise<{ success: boolean; data: PlantRequest[]; meta: any }> {
  const query = status ? `?status=${status}` : '';
  return request(`/admin/plant-requests${query}`);
}

export async function getPlantRequest(id: number): Promise<{ success: boolean; data: PlantRequest }> {
  return request(`/admin/plant-requests/${id}`);
}

export async function approvePlantRequest(
  id: number,
  data: { plant_name: string; scientific_name?: string; plant_type_id: number; admin_notes?: string }
): Promise<{ success: boolean; data: any }> {
  return request(`/admin/plant-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function rejectPlantRequest(
  id: number,
  admin_notes?: string
): Promise<{ success: boolean; data: any }> {
  return request(`/admin/plant-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ admin_notes }),
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface AdminUserItem {
  id_user: number;
  email: string;
}

export async function getUsers(
  params: { limit?: number; offset?: number; search?: string } = {}
): Promise<{ success: boolean; data: AdminUserItem[]; meta: any }> {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.offset) q.set('offset', String(params.offset));
  if (params.search) q.set('search', params.search);
  return request(`/admin/users?${q.toString()}`);
}

export async function getUser(id: number): Promise<{ success: boolean; data: any }> {
  return request(`/admin/users/${id}`);
}

// ── Admins ────────────────────────────────────────────────────────────────────

export interface AdminItem {
  id_admin: number;
  email: string;
  name: string;
  is_active: boolean;
  created_at: number;
}

export async function getAdmins(): Promise<{ success: boolean; data: AdminItem[] }> {
  return request('/admin/admins');
}

export async function createAdmin(data: {
  email: string;
  name: string;
  password: string;
}): Promise<{ success: boolean; data: AdminItem }> {
  return request('/admin/admins', { method: 'POST', body: JSON.stringify(data) });
}

export async function toggleAdmin(id: number): Promise<{ success: boolean; data: AdminItem }> {
  return request(`/admin/admins/${id}/toggle`, { method: 'PATCH' });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationType {
  id: string;
  label: string;
  description: string;
  sample_body: string;
  supports_snooze: boolean;
  optional_context: string[];
}

export async function getNotificationTypes(): Promise<{ success: boolean; data: NotificationType[] }> {
  return request('/admin/notifications/types');
}

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface PresetNotificationPayload {
  alert_type: string;
  plant_nickname?: string;
  hours_offline?: number;
  sensor_device_id?: number;
  sensor_type?: string;
  current_value?: number;
  threshold?: number;
  severity?: NotificationSeverity;
  message?: string;
}

export interface CustomNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export type SendNotificationInput =
  | {
      target: 'all' | 'specific';
      user_ids?: number[];
      mode: 'preset';
      preset: PresetNotificationPayload;
    }
  | {
      target: 'all' | 'specific';
      user_ids?: number[];
      mode: 'custom';
      custom: CustomNotificationPayload;
    };

export interface SendNotificationResult {
  target_users: number;
  sent: number;
  failed: number;
  failures: Array<{ user_id: number; error: string }>;
}

export async function sendNotification(
  input: SendNotificationInput
): Promise<{ success: boolean; data: SendNotificationResult; message?: string }> {
  return request('/admin/notifications/send', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
