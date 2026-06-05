import { apiRequest } from './api';
import type { UserRole } from './auth';

export type ActivityEntityType = 'order' | 'product' | 'customer';

export interface ActivityActor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  user: ActivityActor | null;
}

export interface ActivityList {
  total: number;
  limit: number;
  offset: number;
  items: ActivityEntry[];
}

export interface ActivityQuery {
  limit?: number;
  offset?: number;
  userId?: string;
  entityType?: ActivityEntityType;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function listActivity(q: ActivityQuery = {}): Promise<ActivityList> {
  const params = new URLSearchParams();
  if (q.limit) params.set('limit', String(q.limit));
  if (q.offset) params.set('offset', String(q.offset));
  if (q.userId) params.set('userId', q.userId);
  if (q.entityType) params.set('entityType', q.entityType);
  if (q.action) params.set('action', q.action);
  if (q.dateFrom) params.set('dateFrom', q.dateFrom);
  if (q.dateTo) params.set('dateTo', q.dateTo);
  const qs = params.toString();
  return apiRequest<ActivityList>(`/activity${qs ? `?${qs}` : ''}`);
}
