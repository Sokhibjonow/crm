import { apiRequest } from './api';

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PACKING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export type PaymentMethod = 'CASH' | 'CARD' | 'CLICK' | 'PAYME' | 'DEBT' | 'OTHER';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
  product: { id: string; name: string; sku: string | null };
}

export interface Payment {
  id: string;
  orderId: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  createdAt: string;
}

export interface OrderCustomer {
  id: string;
  name: string;
  phone: string | null;
}

export interface Order {
  id: string;
  storeId: string;
  customerId: string | null;
  number: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: string;
  discount: string;
  total: string;
  paidAmount: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomer | null;
  items: OrderItem[];
  payments: Payment[];
}

export interface OrderListItem {
  id: string;
  number: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: string;
  paidAmount: string;
  createdAt: string;
  customer: OrderCustomer | null;
  _count: { items: number };
}

export interface OrderListResult {
  items: OrderListItem[];
  total: number;
  page: number;
  take: number;
}

export interface ListOrdersParams {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  q?: string;
  page?: number;
  take?: number;
}

export interface OrderItemInput {
  productId: string;
  qty: number;
  unitPrice?: number;
}

export interface CreateOrderInput {
  customerId?: string;
  items: OrderItemInput[];
  discount?: number;
  notes?: string;
}

export interface UpdateOrderInput {
  customerId?: string | null;
  discount?: number;
  notes?: string;
}

export interface AddPaymentInput {
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

export function listOrders(params: ListOrdersParams = {}): Promise<OrderListResult> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.paymentStatus) search.set('paymentStatus', params.paymentStatus);
  if (params.customerId) search.set('customerId', params.customerId);
  if (params.q) search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  if (params.take) search.set('take', String(params.take));
  const qs = search.toString();
  return apiRequest<OrderListResult>(`/orders${qs ? `?${qs}` : ''}`);
}

export function getOrder(id: string): Promise<Order> {
  return apiRequest<Order>(`/orders/${id}`);
}

export function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiRequest<Order>('/orders', { method: 'POST', body: input });
}

export function updateOrder(id: string, input: UpdateOrderInput): Promise<Order> {
  return apiRequest<Order>(`/orders/${id}`, { method: 'PATCH', body: input });
}

export function addOrderItem(id: string, input: OrderItemInput): Promise<Order> {
  return apiRequest<Order>(`/orders/${id}/items`, { method: 'POST', body: input });
}

export function removeOrderItem(id: string, itemId: string): Promise<Order> {
  return apiRequest<Order>(`/orders/${id}/items/${itemId}`, { method: 'DELETE' });
}

export function changeOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return apiRequest<Order>(`/orders/${id}/status`, {
    method: 'POST',
    body: { status },
  });
}

export function addOrderPayment(id: string, input: AddPaymentInput): Promise<Order> {
  return apiRequest<Order>(`/orders/${id}/payments`, { method: 'POST', body: input });
}
