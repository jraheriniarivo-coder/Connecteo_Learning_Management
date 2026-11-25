import type {
  BulkImportResult,
  BulkImportUserRow,
  CreateCoursePayload,
  DashboardPayload,
  Lang,
  Role,
  UserProfile,
} from './types.ts';

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Erreur (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchAuthStatus(): Promise<{ needsAdminSetup: boolean; hasEnvPasscode: boolean }> {
  const res = await fetch('/api/auth/status');
  return parseJson(res);
}

export async function setupInitialAdmin(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch('/api/auth/setup-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function loginWithCredentials(payload: {
  email: string;
  password: string;
}): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function registerLearner(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function logoutSession(token: string): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchDashboard(token: string): Promise<DashboardPayload> {
  const res = await fetch('/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(res);
}

export async function createCourseApi(
  token: string,
  payload: CreateCoursePayload
): Promise<void> {
  const res = await fetch('/api/courses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  await parseJson(res);
}

export async function submitLevelQuizApi(
  token: string,
  courseId: number,
  levelNum: number,
  answers: number[]
): Promise<{ passed: boolean; score: number; completedLevels: number[] }> {
  const res = await fetch(`/api/courses/${courseId}/levels/${levelNum}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers }),
  });
  return parseJson(res);
}

export async function createAssignmentApi(
  token: string,
  payload: { learnerId: string; courseId: number; dueDate: string }
): Promise<void> {
  const res = await fetch('/api/assignments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  await parseJson(res);
}

export async function createUserApi(
  token: string,
  payload: { name: string; email: string; password: string; role: Role }
): Promise<{ user: UserProfile }> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function bulkImportUsersApi(
  token: string,
  payload: { users: BulkImportUserRow[]; defaultPassword: string }
): Promise<BulkImportResult> {
  const res = await fetch('/api/users/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateUserRoleApi(
  token: string,
  userId: string,
  role: Role
): Promise<{ user: UserProfile }> {
  const res = await fetch(`/api/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  return parseJson(res);
}

export async function markNotificationsReadApi(token: string): Promise<void> {
  await fetch('/api/notifications/read', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function downloadReportCsvApi(token: string, lang: Lang): Promise<void> {
  const res = await fetch(`/api/reports/export?lang=${lang}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.error === 'string' ? err.error : 'Export impossible');
  }
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'connecteo-learning-report.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
