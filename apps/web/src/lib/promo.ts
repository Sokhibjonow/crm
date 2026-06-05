import { apiRequest } from './api';

export type PromoCodeType = 'PERCENT' | 'FIXED';

export interface PromoCode {
  id: string;
  storeId: string;
  code: string;
  type: PromoCodeType;
  value: string;
  minOrderTotal: string;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeInput {
  code: string;
  type: PromoCodeType;
  value: number;
  minOrderTotal?: number;
  maxUses?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive?: boolean;
}

export interface PromoPreviewResult {
  code: string;
  discount: string;
}

export function listPromoCodes(): Promise<PromoCode[]> {
  return apiRequest<PromoCode[]>('/promo-codes');
}

export function getPromoCode(id: string): Promise<PromoCode> {
  return apiRequest<PromoCode>(`/promo-codes/${id}`);
}

export function createPromoCode(input: PromoCodeInput): Promise<PromoCode> {
  return apiRequest<PromoCode>('/promo-codes', { method: 'POST', body: input });
}

export function updatePromoCode(id: string, input: Partial<PromoCodeInput>): Promise<PromoCode> {
  return apiRequest<PromoCode>(`/promo-codes/${id}`, { method: 'PATCH', body: input });
}

export function deletePromoCode(id: string): Promise<void> {
  return apiRequest<void>(`/promo-codes/${id}`, { method: 'DELETE' });
}

export function previewPromoCode(code: string, subtotal: number): Promise<PromoPreviewResult> {
  return apiRequest<PromoPreviewResult>('/promo-codes/preview', {
    method: 'POST',
    body: { code, subtotal },
  });
}
