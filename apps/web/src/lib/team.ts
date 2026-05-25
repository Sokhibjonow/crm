import { apiRequest } from './api';
import type { UserRole } from './auth';

export interface TeamMember {
  id: string;
  storeId: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
}

export interface UpdateMemberInput {
  name?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

export function listTeam(): Promise<TeamMember[]> {
  return apiRequest<TeamMember[]>('/team');
}

export function getMember(id: string): Promise<TeamMember> {
  return apiRequest<TeamMember>(`/team/${id}`);
}

export function createMember(input: CreateMemberInput): Promise<TeamMember> {
  return apiRequest<TeamMember>('/team', { method: 'POST', body: input });
}

export function updateMember(id: string, input: UpdateMemberInput): Promise<TeamMember> {
  return apiRequest<TeamMember>(`/team/${id}`, { method: 'PATCH', body: input });
}

export function resetMemberPassword(id: string, password: string): Promise<void> {
  return apiRequest<void>(`/team/${id}/reset-password`, {
    method: 'POST',
    body: { password },
  });
}

export function deactivateMember(id: string): Promise<TeamMember> {
  return apiRequest<TeamMember>(`/team/${id}`, { method: 'DELETE' });
}
