import type { UserRole } from './auth';

// Single source of truth for "who can do what". Used to gate UI (sidebar,
// buttons) on the client and mirrored by @Roles() guards on the backend.
export type Action =
  // Customers
  | 'customer.view'
  | 'customer.create'
  | 'customer.edit'
  | 'customer.delete'
  // Products
  | 'product.view'
  | 'product.create'
  | 'product.edit'
  | 'product.delete'
  // Inventory (stock adjustments)
  | 'inventory.view'
  | 'inventory.adjust'
  // Orders
  | 'order.view'
  | 'order.create'
  | 'order.edit'
  | 'order.cancel'
  | 'order.confirm' // NEW -> CONFIRMED
  | 'order.pack' // CONFIRMED -> PACKING
  | 'order.ship' // PACKING -> SHIPPED
  | 'order.deliver' // SHIPPED -> DELIVERED
  | 'order.return' // DELIVERED -> RETURNED
  | 'order.payment.add'
  // Reports
  | 'report.view'
  // Activity / audit log
  | 'activity.view'
  // Team
  | 'team.view'
  | 'team.manage'
  // Settings
  | 'settings.store'
  | 'settings.profile';

const MATRIX: Record<UserRole, Action[]> = {
  OWNER: [
    'customer.view',
    'customer.create',
    'customer.edit',
    'customer.delete',
    'product.view',
    'product.create',
    'product.edit',
    'product.delete',
    'inventory.view',
    'inventory.adjust',
    'order.view',
    'order.create',
    'order.edit',
    'order.cancel',
    'order.confirm',
    'order.pack',
    'order.ship',
    'order.deliver',
    'order.return',
    'order.payment.add',
    'report.view',
    'activity.view',
    'team.view',
    'team.manage',
    'settings.store',
    'settings.profile',
  ],
  MANAGER: [
    'customer.view',
    'customer.create',
    'customer.edit',
    'customer.delete',
    'product.view',
    'product.create',
    'product.edit',
    'product.delete',
    'inventory.view',
    'inventory.adjust',
    'order.view',
    'order.create',
    'order.edit',
    'order.cancel',
    'order.confirm',
    'order.pack',
    'order.ship',
    'order.deliver',
    'order.return',
    'order.payment.add',
    'report.view',
    'activity.view',
    'team.view',
    'settings.profile',
  ],
  CASHIER: [
    'customer.view',
    'customer.create',
    'product.view',
    'order.view',
    'order.create',
    'order.edit',
    'order.confirm',
    'order.payment.add',
    'settings.profile',
  ],
  WAREHOUSE: [
    'product.view',
    'inventory.view',
    'inventory.adjust',
    'order.view',
    'order.pack',
    'order.ship',
    'settings.profile',
  ],
  COURIER: [
    'order.view',
    'order.ship',
    'order.deliver',
    'order.payment.add',
    'settings.profile',
  ],
};

export function can(role: UserRole | undefined, action: Action): boolean {
  if (!role) return false;
  return MATRIX[role].includes(action);
}

/** Top-level nav sections the role is allowed to open. */
export function navItemsFor(role: UserRole | undefined): Array<
  | 'dashboard'
  | 'customers'
  | 'orders'
  | 'products'
  | 'inventory'
  | 'reports'
  | 'activity'
  | 'team'
  | 'settings'
> {
  const items: ReturnType<typeof navItemsFor> = ['dashboard'];
  if (can(role, 'customer.view')) items.push('customers');
  if (can(role, 'order.view')) items.push('orders');
  if (can(role, 'product.view')) items.push('products');
  if (can(role, 'inventory.view')) items.push('inventory');
  if (can(role, 'report.view')) items.push('reports');
  if (can(role, 'activity.view')) items.push('activity');
  if (can(role, 'team.view')) items.push('team');
  items.push('settings');
  return items;
}
