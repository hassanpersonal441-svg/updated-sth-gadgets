import type { BackupModule } from '@/types/database';

export const ALL_BACKUP_MODULES: BackupModule[] = [
  'categories',
  'products',
  'product_images',
  'coupons',
  'coupon_usage',
  'customers',
  'orders',
  'order_items',
  'invoices',
  'invoice_items',
  'settings',
];

/**
 * Resolve module dependencies for Selective Restore
 */
export function resolveModuleDependencies(selected: BackupModule[]): {
  modulesToRestore: BackupModule[];
  autoAddedDependencies: BackupModule[];
} {
  const set = new Set<BackupModule>(selected);
  const autoAdded: BackupModule[] = [];

  const addDep = (mod: BackupModule) => {
    if (!set.has(mod)) {
      set.add(mod);
      autoAdded.push(mod);
    }
  };

  if (set.has('products')) {
    addDep('categories');
  }
  if (set.has('product_images')) {
    addDep('products');
    addDep('categories');
  }
  if (set.has('order_items')) {
    addDep('orders');
  }
  if (set.has('invoice_items')) {
    addDep('invoices');
  }
  if (set.has('coupon_usage')) {
    addDep('coupons');
  }

  return {
    modulesToRestore: Array.from(set),
    autoAddedDependencies: autoAdded,
  };
}
