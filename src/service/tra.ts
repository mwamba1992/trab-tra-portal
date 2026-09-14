import http from './http';

export interface Paginated<T> { items: T[]; total: number; }

// Role-aware dashboard. Supervisor and officer share the shape via optional fields.
export interface DashboardStats {
  role?: 'supervisor' | 'officer';
  // supervisor
  totalAppeals?: number;
  unassigned?: number;
  pendingReplies?: number;
  overdue?: number;
  upcomingHearings?: number;
  // officer
  myCases?: number;
  myPendingReplies?: number;
  myOverdue?: number;
  myUpcomingHearings?: number;
  // shared
  decided?: number;
}

export interface Appeal {
  id: string;
  appealNo: string | null;
  appellantName: string;
  dateOfFiling: string;
  statusTrend: string;
  outcomeOfDecision: string;
  taxType?: { name: string } | null;
  region?: { name: string } | null;
  paymentStatus?: string;
  traReplied?: boolean;
  // TRA case-management annotations
  assignedOfficerId?: string | null;
  assignedOfficerName?: string | null;
  assignedById?: string | null;
  assignedByName?: string | null;
  assignedAt?: string | null;
  replyDueDate?: string | null;
  daysRemaining?: number | null;
  overdue?: boolean;
}

export interface Reply { id: string; body: string; status: string; filedByName: string | null; createdAt: string; }
export interface CaseDoc { id: string; fileName: string; originalName: string; documentType: string; remarks: string | null; uploadedBy: string | null; createdAt: string; }
export interface CaseNote { id: string; body: string; authorId: string; authorName: string | null; createdAt: string; }
export interface CaseAssignment {
  id: string;
  action: 'ASSIGNED' | 'REASSIGNED' | 'UNASSIGNED';
  officerName: string | null;
  previousOfficerName: string | null;
  changedByName: string | null;
  createdAt: string;
}
export interface Officer { id: string; firstName: string; lastName: string; email: string; phone?: string; status: string; role?: { name: string } | null; roleId?: string | null; caseload?: number; }

export interface AppealQuery {
  page?: number;
  size?: number;
  scope?: 'mine' | 'all';
  status?: string;
  officerId?: string;
  overdue?: boolean;
}

const unwrap = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const TraApi = {
  dashboard: () => unwrap<DashboardStats>(http.get('/tra/dashboard')),

  appeals: (q: AppealQuery = {}) =>
    unwrap<Paginated<Appeal>>(http.get('/tra/appeals', {
      params: {
        page: q.page ?? 1,
        size: q.size ?? 10,
        scope: q.scope ?? 'all',
        ...(q.status ? { status: q.status } : {}),
        ...(q.officerId ? { officerId: q.officerId } : {}),
        ...(q.overdue ? { overdue: 'true' } : {}),
      },
    })),
  appeal: (id: string) => unwrap<Appeal>(http.get(`/tra/appeals/${id}`)),
  parties: (id: string) => unwrap<{ appellants: any[]; respondents: any[] }>(http.get(`/tra/appeals/${id}/parties`)),

  // Assignment (supervisor)
  assign: (id: string, officerId: string) => unwrap<Appeal>(http.post(`/tra/appeals/${id}/assign`, { officerId })),
  unassign: (id: string) => unwrap<Appeal>(http.delete(`/tra/appeals/${id}/assign`)),
  assignments: (id: string) => unwrap<CaseAssignment[]>(http.get(`/tra/appeals/${id}/assignments`)),

  // Internal notes
  notes: (id: string) => unwrap<CaseNote[]>(http.get(`/tra/appeals/${id}/notes`)),
  addNote: (id: string, body: string) => unwrap<CaseNote>(http.post(`/tra/appeals/${id}/notes`, { body })),

  replies: (id: string) => unwrap<Reply[]>(http.get(`/tra/appeals/${id}/reply`)),
  fileReply: (id: string, body: string) => unwrap<Reply>(http.post(`/tra/appeals/${id}/reply`, { body })),

  documents: (id: string) => unwrap<CaseDoc[]>(http.get(`/tra/appeals/${id}/documents`)),
  uploadDocument: (id: string, file: File, documentType = 'EVIDENCE', remarks = '') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentType', documentType);
    if (remarks) fd.append('remarks', remarks);
    return unwrap<CaseDoc>(http.post(`/tra/appeals/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },

  summons: (page = 1, size = 10) => unwrap<Paginated<any>>(http.get('/tra/summons', { params: { page, size } })),
  decisions: (page = 1, size = 10) => unwrap<Paginated<any>>(http.get('/tra/decisions', { params: { page, size } })),

  officers: (page = 1, size = 100) => unwrap<Paginated<Officer>>(http.get('/tra/users', { params: { page, size } })),
  createOfficer: (data: Record<string, unknown>) => unwrap<any>(http.post('/tra/users', data)),
  updateOfficer: (id: string, data: Record<string, unknown>) => unwrap<any>(http.patch(`/tra/users/${id}`, data)),
  deactivateOfficer: (id: string) => unwrap<any>(http.delete(`/tra/users/${id}`)),

  // Reply-deadline setting
  getReplyDeadlineDays: () => unwrap<{ days: number }>(http.get('/tra/settings/reply-deadline-days')),
  setReplyDeadlineDays: (days: number) => unwrap<{ days: number }>(http.put('/tra/settings/reply-deadline-days', { days })),
};
