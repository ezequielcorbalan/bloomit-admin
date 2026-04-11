import { useState, useEffect } from 'react';
import { login as apiLogin } from '../services/adminApi';

interface AdminUser {
  id: number;
  email: string;
  name: string;
}

export function useAuth() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const stored = localStorage.getItem('adminUser');
    if (token && stored) {
      try {
        setAdmin(JSON.parse(stored));
      } catch {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string, turnstileToken: string) {
    const res = await apiLogin(email, password, turnstileToken);
    localStorage.setItem('adminToken', res.data.token);
    localStorage.setItem('adminUser', JSON.stringify(res.data.admin));
    setAdmin(res.data.admin);
  }

  function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAdmin(null);
  }

  return { admin, loading, login, logout };
}
