// frontend/src/api.ts
// Unified API client for AeroVision Platform

const API_BASE = '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('aerovision_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('aerovision_token', token);
}

export function clearStoredToken() {
  localStorage.removeItem('aerovision_token');
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearStoredToken();
    if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred.';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export const api = {
  // Auth
  signup: (data: any) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => clearStoredToken(),
  getProfile: () => request('/auth/me'),
  updateProfile: (data: any) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: any) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  exportData: () => request('/auth/export-data'),
  deleteAccount: () => request('/auth/delete-account', { method: 'DELETE' }),

  // Dashboard
  getDashboardSummary: () => request('/dashboard/summary'),

  // Vehicles
  getVehicles: () => request('/vehicles'),
  addVehicle: (data: any) => request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  createVehicle: (data: any) => request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  getVehicle: (id: number) => request(`/vehicles/${id}`),
  updateVehicle: (id: number, data: any) => request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVehicle: (id: number) => request(`/vehicles/${id}`, { method: 'DELETE' }),

  // Challans
  getChallans: (status?: string, vehicleId?: number, search?: string, stateFilter?: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status_filter', status);
    if (stateFilter && stateFilter !== 'all') params.append('state_filter', stateFilter);
    if (vehicleId) params.append('vehicle_id', vehicleId.toString());
    if (search) params.append('search', search);
    return request(`/challans?${params.toString()}`);
  },
  getChallanRegions: () => request('/challans/regions'),
  getChallansSummary: () => request('/challans/summary'),
  createChallan: (data: any) => request('/challans', { method: 'POST', body: JSON.stringify(data) }),
  uploadChallanDoc: (formData: FormData) => request('/challans/upload', { method: 'POST', body: formData }),
  updateChallan: (id: number, data: any) => request(`/challans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  recordChallanPayment: (id: number, data: any) => request(`/challans/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'PAID', ...data }) }),
  createDispute: (id: number, data: any) => request(`/challans/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'DISPUTED', ...data }) }),
  deleteChallan: (id: number) => request(`/challans/${id}`, { method: 'DELETE' }),
  seedExampleChallans: () => request('/challans/seed-examples', { method: 'POST' }),

  // Rules & Quizzes
  getRules: (category?: string, riskTier?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (riskTier) params.append('risk_tier', riskTier);
    if (search) params.append('search', search);
    return request(`/rules?${params.toString()}`);
  },
  getSignRules: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    return request(`/rules?${params.toString()}`);
  },
  getMistakeAwareness: () => request('/rules/mistakes'),
  getQuizQuestions: (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    return request(`/rules/quizzes?${params.toString()}`);
  },
  submitQuiz: (data: any) => request('/rules/quizzes/submit', { method: 'POST', body: JSON.stringify(data) }),
  getQuizHistory: () => request('/rules/quizzes/history'),

  // Dashcam Vault
  getStorageQuota: () => request('/vault/quota'),
  getVideos: (vehicleId?: number) => {
    const params = new URLSearchParams();
    if (vehicleId) params.append('vehicle_id', vehicleId.toString());
    return request(`/vault/videos?${params.toString()}`);
  },
  uploadVideo: (formData: FormData) => request('/vault/videos/upload', { method: 'POST', body: formData }),
  getVideoDetails: (id: number) => request(`/vault/videos/${id}`),
  getVideoStreamUrl: (id: number) => `/api/vault/videos/${id}/stream`,
  addBookmark: (id: number, data: any) => request(`/vault/videos/${id}/bookmark`, { method: 'POST', body: JSON.stringify(data) }),
  deleteVideo: (id: number) => request(`/vault/videos/${id}`, { method: 'DELETE' }),

  // AI Perception
  analyzeVideo: (videoId: number) => request(`/ai/analyze-video/${videoId}`, { method: 'POST' }),
  predictFrame: (formData: FormData) => request('/ai/predict-frame', { method: 'POST', body: formData }),
  updateEventFeedback: (eventId: number, feedback: string) => request(`/ai/events/${eventId}/feedback`, { method: 'PUT', body: JSON.stringify({ feedback }) }),
  getModelEvaluation: () => request('/ai/evaluation'),
  getModelStatus: () => request('/ai/evaluation'),

  // Admin
  getAdminMetrics: () => request('/admin/metrics'),
  getAdminUsers: () => request('/admin/users'),
  getAdminAuditLogs: () => request('/admin/audit-logs'),
  getAdminSystemHealth: () => request('/admin/system-health'),
};
