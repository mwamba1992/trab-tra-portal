import http from './http';

export interface Paginated<T> {
  items: T[];
  total: number;
}

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
  /** Date TRA's reply was filed (null when not filed). */
  repliedAt?: string | null;
  /** Decided / hearing concluded: a reply is no longer expected. */
  caseClosed?: boolean;
  replyStatus?: ReplyState;
  /** TRA's own dispute (objection) number linked to this appeal. */
  disputeNo?: string | null;
}

export interface ApplicationItem {
  id: string;
  applicationNo: string | null;
  applicationType: string;
  applicationCategory: string;
  /** Appellant, or Respondent when TRA itself applied. */
  applicantType: string;
  applicantName: string;
  natureOfApplication: string | null;
  taxType: string | null;
  dateOfFiling: string;
  status: string;
  decidedDate: string | null;
  outcome: string | null;
  wonBy: string | null;
  summaryOfDecision: string | null;
  appealId: string | null;
  appealNo: string | null;
  decided: boolean;
  responseCount: number;
}

export interface ApplicationResponse {
  id: string;
  body: string;
  filedByName: string | null;
  createdAt: string;
}

export type ReplyState = 'REPLIED' | 'NOT_REQUIRED' | 'OVERDUE' | 'PENDING';

export interface Reply {
  id: string;
  body: string;
  status: string;
  filedByName: string | null;
  createdAt: string;
}
export interface CaseDoc {
  id: string;
  fileName: string;
  originalName: string;
  documentType: string;
  remarks: string | null;
  uploadedBy: string | null;
  createdAt: string;
}
export interface CaseNote {
  id: string;
  body: string;
  authorId: string;
  authorName: string | null;
  createdAt: string;
}
export interface CaseAssignment {
  id: string;
  action: 'ASSIGNED' | 'REASSIGNED' | 'UNASSIGNED';
  officerName: string | null;
  previousOfficerName: string | null;
  changedByName: string | null;
  createdAt: string;
}
export interface Officer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  role?: { name: string } | null;
  roleId?: string | null;
  caseload?: number;
}

export interface AppealQuery {
  page?: number;
  size?: number;
  scope?: 'mine' | 'all';
  status?: string;
  officerId?: string;
  overdue?: boolean;
  /** Appeal number or appellant name (server-side, case-insensitive). */
  search?: string;
  /** Filed-date range, YYYY-MM-DD, inclusive. */
  dateFrom?: string;
  dateTo?: string;
  reply?: 'filed' | 'pending';
}

export interface SummonsItem {
  summonsAppealId: string;
  appealId: string;
  appealNo: string | null;
  appellantName: string | null;
  summons: { startDate: string; time: string | null; venue: string | null; status: string; judge?: { name: string } | null } | null;
}

export interface DecisionItem {
  id: string;
  appealNo: string | null;
  appellantName: string;
  taxType?: { name: string } | null;
  decidedDate: string | null;
  decidedBy: string | null;
  wonBy: string | null;
  outcomeOfDecision: string;
  summaryOfDecree: string | null;
  judgementFile: string | null;
}

export type FilingType = 'PRELIMINARY_OBJECTION' | 'TRIBUNAL_APPEAL_INTENT';

export interface Filing {
  id: string;
  appealId: string;
  type: FilingType;
  grounds: string;
  status: string;
  filedByName: string | null;
  createdAt: string;
  /** The Board's review of the filing. */
  reviewStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewRemarks?: string | null;
}

export interface NoticeItem {
  id: string;
  noticeNo: string | null;
  appellantName: string;
  description: string | null;
  loggedAt: string;
  dateOfTaxationDecision: string | null;
  dateOfServiceDecision: string | null;
  region: string | null;
  additionalRespondent: string | null;
  paymentStatus: string;
  isExempted: boolean;
  /** Set once the statement of appeal has been lodged. */
  appealId: string | null;
  appealNo: string | null;
}

export type DeadlineKind = 'REPLY' | 'HEARING' | 'TRIBUNAL_APPEAL';

export interface CaseDeadline {
  kind: DeadlineKind;
  appealId: string;
  appealNo: string | null;
  appellantName: string | null;
  /** YYYY-MM-DD */
  dueDate: string;
  /** 0 on the day, negative once past. */
  daysRemaining: number;
  overdue: boolean;
  detail: string | null;
}

const unwrap = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const TraApi = {
  dashboard: () => unwrap<DashboardStats>(http.get('/tra/dashboard')),
  deadlines: () => unwrap<CaseDeadline[]>(http.get('/tra/deadlines')),
  setDisputeNo: (id: string, disputeNo: string) => unwrap<AppealDetail>(http.put(`/tra/appeals/${id}/dispute-no`, { disputeNo })),
  applications: (page = 1, size = 10, search = '') =>
    unwrap<Paginated<ApplicationItem>>(
      http.get('/tra/applications', { params: { page, size, ...(search.trim() ? { search: search.trim() } : {}) } }),
    ),
  applicationResponses: (id: string) => unwrap<ApplicationResponse[]>(http.get(`/tra/applications/${id}/responses`)),
  respondToApplication: (id: string, body: string) => unwrap<ApplicationResponse>(http.post(`/tra/applications/${id}/responses`, { body })),
  notices: (page = 1, size = 10, search = '') =>
    unwrap<Paginated<NoticeItem>>(
      http.get('/tra/notices', { params: { page, size, ...(search.trim() ? { search: search.trim() } : {}) } }),
    ),

  filings: (id: string) => unwrap<Filing[]>(http.get(`/tra/appeals/${id}/filings`)),
  lodgeFiling: (id: string, type: FilingType, grounds: string) =>
    unwrap<Filing>(http.post(`/tra/appeals/${id}/filings`, { type, grounds })),

  appeals: (q: AppealQuery = {}) =>
    unwrap<Paginated<Appeal>>(
      http.get('/tra/appeals', {
        params: {
          page: q.page ?? 1,
          size: q.size ?? 10,
          scope: q.scope ?? 'all',
          ...(q.status ? { status: q.status } : {}),
          ...(q.officerId ? { officerId: q.officerId } : {}),
          ...(q.overdue ? { overdue: 'true' } : {}),
          ...(q.search?.trim() ? { search: q.search.trim() } : {}),
          ...(q.dateFrom ? { dateFrom: q.dateFrom } : {}),
          ...(q.dateTo ? { dateTo: q.dateTo } : {}),
          ...(q.reply ? { reply: q.reply } : {}),
        },
      }),
    ),
  appeal: (id: string) => unwrap<Appeal>(http.get(`/tra/appeals/${id}`)),
  parties: (id: string) => unwrap<AppealParties>(http.get(`/tra/appeals/${id}/parties`)),

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

  summons: (page = 1, size = 10) => unwrap<Paginated<SummonsItem>>(http.get('/tra/summons', { params: { page, size } })),
  decisions: (page = 1, size = 10) => unwrap<Paginated<DecisionItem>>(http.get('/tra/decisions', { params: { page, size } })),

  officers: (page = 1, size = 100) => unwrap<Paginated<Officer>>(http.get('/tra/users', { params: { page, size } })),
  createOfficer: (data: CreateOfficerInput) => unwrap<OfficerRecord>(http.post('/tra/users', data)),
  updateOfficer: (id: string, data: UpdateOfficerInput) => unwrap<OfficerRecord>(http.patch(`/tra/users/${id}`, data)),
  deactivateOfficer: (id: string) => unwrap<OfficerRecord>(http.delete(`/tra/users/${id}`)),

  // Reply-deadline setting
  getReplyDeadlineDays: () => unwrap<{ days: number }>(http.get('/tra/settings/reply-deadline-days')),
  setReplyDeadlineDays: (days: number) => unwrap<{ days: number }>(http.put('/tra/settings/reply-deadline-days', { days })),
};

// ─── Appeal detail page (GET /tra/appeals/:id, /parties, /documents; files via GET /uploads/:fileName) ───

export interface AppealAmount {
  id: string;
  amount: number | string;
  currency: string;
}

/** Full appeal payload from GET /tra/appeals/:id (appeal entity + TRA case annotations). */
export interface AppealDetail extends Appeal {
  natureOfAppeal?: string | null;
  assessmentNo?: string | null;
  taxedOffice?: string | null;
  remarks?: string | null;
  amounts?: AppealAmount[];
  decidedDate?: string | null;
  decidedBy?: string | null;
  wonBy?: string | null;
  summaryOfDecree?: string | null;
  /** UUID file name, downloadable through GET /uploads/:fileName. */
  judgementFile?: string | null;
  expectedDecisionDate?: string | null;
  /** Last day to give notice of appeal to the Tribunal (decided appeals only). */
  tribunalDueDate?: string | null;
  tribunalDaysRemaining?: number | null;
  tribunalWindowLapsed?: boolean;
  tribunalIntentFiledAt?: string | null;
}

export interface PartyAppellant {
  id: string;
  appellantId: string;
  role: string;
  orderNo: number;
  appellant?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    tinNumber?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}
export interface PartyRespondent {
  id: string;
  respondentId: string;
  role: string;
  orderNo: number;
  respondent?: { id: string; name: string; organization?: string | null } | null;
}
export interface AppealParties {
  appellants: PartyAppellant[];
  respondents: PartyRespondent[];
}

export interface CaseDocument extends CaseDoc {
  sourceType?: string;
  fileSize?: number | string | null;
}

/** Document types TRA may attach (backend DocumentType enum minus JUDGEMENT, which the Board issues). */
export const TRA_DOCUMENT_TYPES = ['EVIDENCE', 'SUPPORTING', 'ANNEXTURE', 'OTHER'] as const;
export type TraDocumentType = (typeof TRA_DOCUMENT_TYPES)[number];
/** Mirrors backend common/upload.config.ts. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

export const TraCaseApi = {
  appeal: (id: string) => unwrap<AppealDetail>(http.get(`/tra/appeals/${id}`)),
  parties: (id: string) => unwrap<AppealParties>(http.get(`/tra/appeals/${id}/parties`)),
  documents: (id: string) => unwrap<CaseDocument[]>(http.get(`/tra/appeals/${id}/documents`)),
  uploadDocument: (id: string, file: File, documentType: TraDocumentType, remarks = '') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentType', documentType);
    if (remarks.trim()) fd.append('remarks', remarks.trim());
    return unwrap<CaseDocument>(http.post(`/tra/appeals/${id}/documents`, fd, { timeout: 120000 }));
  },
  /** Stored upload as a Blob (the download route needs the JWT, so plain links cannot be used). */
  fileBlob: (fileName: string) =>
    http.get<Blob>(`/uploads/${encodeURIComponent(fileName)}`, { responseType: 'blob', timeout: 120000 }).then((r) => r.data),
};

// ─── TRA officer management (GET/POST /tra/users, PATCH /tra/users/:id; backend dto/officer.dto.ts) ───

/** Backend UserStatus enum. */
export type OfficerStatus = 'active' | 'inactive' | 'suspended';

export interface OfficerRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: OfficerStatus;
  role: { name: string } | null;
  roleId: string | null;
  caseload: number;
  createdAt: string;
}

export interface CreateOfficerInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  isAdmin: boolean;
}

/** Email and password are not editable after creation. */
export interface UpdateOfficerInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isAdmin?: boolean;
  status?: OfficerStatus;
}

export const OfficerApi = {
  list: (page = 1, size = 10) => unwrap<Paginated<OfficerRecord>>(http.get('/tra/users', { params: { page, size } })),
  create: (data: CreateOfficerInput) => unwrap<OfficerRecord>(http.post('/tra/users', data)),
  update: (id: string, data: UpdateOfficerInput) => unwrap<OfficerRecord>(http.patch(`/tra/users/${id}`, data)),
};
