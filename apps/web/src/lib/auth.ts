import { apiRequest } from './api';
import { clearAuthCookie, setAuthCookie } from './cookies';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE' | 'COURIER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  storeId: string;
  storeName: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterInput {
  storeName: string;
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input });
  setAuthCookie(res.token);
  return res;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input });
  setAuthCookie(res.token);
  return res;
}

export function logout() {
  clearAuthCookie();
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me');
}

export async function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', { method: 'PATCH', body: input });
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  return apiRequest<void>('/auth/change-password', { method: 'POST', body: input });
}
