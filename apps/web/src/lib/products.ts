import { apiRequest } from './api';

export interface Product {
  id: string;
  storeId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  tags: string[];
  size: string | null;
  color: string | null;
  stock: number;
  lowStockThreshold: number;
  costPrice: string;
  salePrice: string;
  supplier: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  take: number;
}

export interface ProductInput {
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  tags?: string[];
  size?: string;
  color?: string;
  stock?: number;
  lowStockThreshold?: number;
  costPrice?: number;
  salePrice?: number;
  supplier?: string;
  isActive?: boolean;
}

export interface ListProductsParams {
  q?: string;
  category?: string;
  tags?: string[];
  lowStock?: boolean;
  includeArchived?: boolean;
  page?: number;
  take?: number;
}

export function listProducts(params: ListProductsParams = {}): Promise<ProductListResult> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.category) search.set('category', params.category);
  if (params.tags && params.tags.length > 0) {
    search.set('tags', params.tags.join(','));
  }
  if (params.lowStock) search.set('lowStock', 'true');
  if (params.includeArchived) search.set('includeArchived', 'true');
  if (params.page) search.set('page', String(params.page));
  if (params.take) search.set('take', String(params.take));
  const qs = search.toString();
  return apiRequest<ProductListResult>(`/products${qs ? `?${qs}` : ''}`);
}

export function listProductCategories(): Promise<string[]> {
  return apiRequest<string[]>('/products/categories');
}

export function listProductTags(): Promise<string[]> {
  return apiRequest<string[]>('/products/tags');
}

export function lookupProductByBarcode(code: string): Promise<Product> {
  return apiRequest<Product>(`/products/lookup/by-barcode/${encodeURIComponent(code)}`);
}

export function getProduct(id: string): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return apiRequest<Product>('/products', { method: 'POST', body: input });
}

export function updateProduct(id: string, input: ProductInput): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`, { method: 'PATCH', body: input });
}

export function deleteProduct(id: string): Promise<void> {
  return apiRequest<void>(`/products/${id}`, { method: 'DELETE' });
}

export interface AdjustStockInput {
  delta: number;
  reason?: string;
}

export function adjustProductStock(id: string, input: AdjustStockInput): Promise<Product> {
  return apiRequest<Product>(`/products/${id}/stock-adjust`, { method: 'POST', body: input });
}
