import { apiRequest } from './api';

export interface CustomerTelegramLink {
  connected: boolean;
  code: string | null;
  url: string | null;
  botUsername: string | null;
}

export function getCustomerTelegramLink(customerId: string): Promise<CustomerTelegramLink> {
  return apiRequest<CustomerTelegramLink>(`/customers/${customerId}/telegram-link`);
}

export function regenerateCustomerTelegramLink(
  customerId: string,
): Promise<CustomerTelegramLink> {
  return apiRequest<CustomerTelegramLink>(`/customers/${customerId}/telegram-link`, {
    method: 'POST',
  });
}

export function disconnectCustomerTelegram(customerId: string): Promise<void> {
  return apiRequest<void>(`/customers/${customerId}/telegram-link`, { method: 'DELETE' });
}
