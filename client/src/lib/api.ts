const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trao_auth_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; name?: string }) =>
    fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchApi('/auth/me'),

  // Kits
  getKits: () => fetchApi<{ kits: any[] }>('/kits'),
  getKit: (id: string) => fetchApi<{ kit: any }>(`/kits/${id}`),
  generateKit: (data: { jd: string; company_url: string; days: number }) =>
    fetchApi<{ kit: any }>('/kits/generate', { method: 'POST', body: JSON.stringify(data) }),
  updateKit: (id: string, kit: any) =>
    fetchApi<{ kit: any }>(`/kits/${id}`, { method: 'PUT', body: JSON.stringify({ kit }) }),
  regenerateSection: (id: string, data: { section: string; days?: number }) =>
    fetchApi<{ kit: any; message: string }>(`/kits/${id}/regenerate-section`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteKit: (id: string) => fetchApi(`/kits/${id}`, { method: 'DELETE' }),

  // Practice Mode
  getPracticeProgress: (kitId: string) => fetchApi(`/practice/${kitId}`),
  recordCardConfidence: (kitId: string, cardId: string, confidence: number) =>
    fetchApi(`/practice/${kitId}/record`, {
      method: 'POST',
      body: JSON.stringify({ cardId, confidence }),
    }),

  // Mock Interview
  evaluateMockAnswer: (data: { questionPrompt: string; answerOutline: string; candidateAnswer: string }) =>
    fetchApi<{ score: number; strengths: string[]; missingElements: string[]; feedback: string }>(
      '/mock-interview/evaluate',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  // Batch
  uploadBatch: (cases: any[]) =>
    fetchApi('/batch/upload', {
      method: 'POST',
      body: JSON.stringify(cases),
    }),
};
