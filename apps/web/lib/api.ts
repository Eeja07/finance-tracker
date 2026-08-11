// Finance Tracker API Client
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  themePreference?: string;
  currency?: string;
  isEmailVerified: boolean;
  createdAt?: string;
}

export interface WhatsappStatus {
  status: string;
  connectedUser: string | null;
  hasQr: boolean;
  qrDataUrl?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'BANK' | 'EWALLET' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT';
  accountNumber?: string;
  balance: number;
  color: string;
  icon?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  icon?: string;
  color?: string;
  isSystemDefault: boolean;
  userId?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  date: string;
  description: string;
  recipientOrPayer?: string;
  notes?: string;
  receiptUrl?: string;
  itemImageUrl?: string;
  account?: Account;
  category?: Category;
  createdAt: string;
}

export interface InstallmentPayment {
  id: string;
  installmentId: string;
  tenorNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface Installment {
  id: string;
  title: string;
  provider: string;
  totalAmount: number;
  monthlyAmount: number;
  totalTenorMonths: number;
  remainingTenorMonths: number;
  startDate: string;
  dueDateDay: number;
  interestRate: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  account?: Account;
  payments?: InstallmentPayment[];
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  month: number;
  year: number;
  amountLimit: number;
  spent: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
  category?: Category;
}

export interface DashboardSummary {
  totalAssets: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashflow: number;
  categoryBreakdown: { name: string; color: string; amount: number }[];
  accountCount: number;
}

export interface DailyExpenseSummary {
  date: string;
  totalExpense: number;
  count: number;
  transactions: Transaction[];
  categoryBreakdown: Record<string, number>;
}

// Token Helpers
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
const setToken = (t: string) => localStorage.setItem('access_token', t);
const clearToken = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export { getToken, setToken, clearToken };

function buildUrl(path: string): string {
  let base = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== 'undefined') {
    // If NEXT_PUBLIC_API_URL is missing, empty, or points to localhost while in the browser,
    // dynamically fallback to current browser origin + /api so mobile/external requests work!
    if (!base || base.includes('localhost')) {
      const origin = window.location.origin;
      if (origin.includes(':3001')) {
        base = `${window.location.protocol}//${window.location.hostname}:3000/api`;
      } else {
        base = `${origin}/api`;
      }
    }
  }

  if (!base) {
    base = 'http://localhost:3000/api';
  }

  base = base.replace(/\/+$/, '');
  let clean = path;
  if (base.endsWith('/api') && clean.startsWith('/api/')) {
    clean = clean.substring(4);
  }
  if (!clean.startsWith('/')) clean = '/' + clean;

  return `${base}${clean}`;
}

export async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const url = buildUrl(path);

  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json.message) ? json.message.join(', ') : json.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}

// Auth API
export const authApi = {
  register: (body: { email: string; password: string; fullName: string }) =>
    request<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: async () => {
    const res = await request<User | { user: User }>('/auth/me');
    return 'user' in res ? (res as { user: User }) : { user: res as User };
  },

  refreshToken: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};

// Users / Profile API
export const usersApi = {
  getProfile: () => request<User>('/users/profile'),
  updateProfile: (body: { fullName?: string; phone?: string; currency?: string }) =>
    request<User>('/users/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  updateTheme: (theme: string) =>
    request<{ id: string; themePreference: string }>('/users/theme', {
      method: 'PATCH',
      body: JSON.stringify({ theme }),
    }),
};

// Accounts API
export const accountsApi = {
  list: () => request<Account[]>('/accounts'),
  getOne: (id: string) => request<Account>(`/accounts/${id}`),
  create: (body: { name: string; type: string; balance?: number; color?: string; accountNumber?: string }) =>
    request<Account>('/accounts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<{ name: string; type: string; balance: number; color: string; accountNumber: string }>) =>
    request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archive: (id: string) => request<Account>(`/accounts/${id}`, { method: 'DELETE' }),
};

// Categories API
export const categoriesApi = {
  list: (type?: string) => request<Category[]>(`/categories${type ? `?type=${type}` : ''}`),
  create: (body: { name: string; type: string; icon?: string; color?: string }) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string) => request<Category>(`/categories/${id}`, { method: 'DELETE' }),
};

// Transactions API
export const transactionsApi = {
  list: (params?: { page?: number; limit?: number; accountId?: string; categoryId?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.accountId) q.set('accountId', params.accountId);
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    if (params?.type) q.set('type', params.type);
    return request<{ items: Transaction[]; total: number; page: number; totalPages: number }>(`/transactions?${q}`);
  },
  getSummary: () => request<DashboardSummary>('/transactions/summary'),
  getDaily: (date?: string) => request<DailyExpenseSummary>(`/transactions/daily${date ? `?date=${date}` : ''}`),
  create: (body: { accountId: string; categoryId: string; type: string; amount: number; description: string; recipientOrPayer?: string; notes?: string; date?: string; receiptUrl?: string; itemImageUrl?: string }) =>
    request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<{ accountId: string; categoryId: string; type: string; amount: number; description: string; recipientOrPayer?: string; notes?: string; date?: string; receiptUrl?: string; itemImageUrl?: string }>) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => request<Transaction>(`/transactions/${id}`, { method: 'DELETE' }),
};

// Budgets API
export const budgetsApi = {
  list: (month?: number, year?: number) => {
    const q = new URLSearchParams();
    if (month) q.set('month', String(month));
    if (year) q.set('year', String(year));
    return request<Budget[]>(`/budgets?${q}`);
  },
  upsert: (body: { categoryId: string; amountLimit: number; month?: number; year?: number }) =>
    request<Budget>('/budgets', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string) => request<Budget>(`/budgets/${id}`, { method: 'DELETE' }),
};

// Installments API
export const installmentsApi = {
  list: (status?: string) => request<Installment[]>(`/installments${status ? `?status=${status}` : ''}`),
  getOne: (id: string) => request<Installment>(`/installments/${id}`),
  create: (body: { title: string; provider: string; totalAmount: number; monthlyAmount: number; totalTenorMonths: number; startDate: string; dueDateDay: number; accountId?: string; interestRate?: number; notes?: string }) =>
    request<Installment>('/installments', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<{ title: string; provider: string; totalAmount: number; monthlyAmount: number; totalTenorMonths: number; startDate: string; dueDateDay: number; accountId?: string; interestRate?: number; notes?: string; status?: string }>) =>
    request<Installment>(`/installments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => request<Installment>(`/installments/${id}`, { method: 'DELETE' }),
  pay: (paymentId: string, body?: { accountId?: string; paidDate?: string }) =>
    request<InstallmentPayment>(`/installments/payments/${paymentId}/pay`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
};

// WhatsApp API
export const whatsappApi = {
  getStatus: () => request<{ status: string; connectedUser: string | null; hasQr: boolean }>('/whatsapp/status'),
  resetSession: () => request<{ success: boolean }>('/whatsapp/reset-session', { method: 'POST' }),
  sendWebhookTest: (from: string, body: string) =>
    request<{ success: boolean }>('/whatsapp/webhook', { method: 'POST', body: JSON.stringify({ from, body }) }),
};
