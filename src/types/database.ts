export type StockStatus = 'in_stock' | 'out_of_stock' | 'low_stock';
export type DiscountType = 'percentage' | 'fixed';

export interface Specification {
  label: string;
  value: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  specifications: Specification[];
  price: number;
  old_price: number | null;
  discount: number;
  category_id: string | null;
  sku?: string | null;
  purchase_price?: number;
  wholesale_price?: number | null;
  profit_amount?: number;
  profit_margin?: number;
  stock_status: StockStatus;
  featured: boolean;
  best_seller: boolean;
  new_arrival: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  product_images?: ProductImage[];
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order: number;
  maximum_discount: number | null;
  expiry_date: string | null;
  usage_limit: number | null;
  times_used: number;
  active: boolean;
  created_at: string;
}

export interface Settings {
  id: number;
  business_name: string;
  logo_url: string | null;
  whatsapp_number: string;
  email: string | null;
  address: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  business_greeting: string;
  order_message_template: string;
  currency: string;
  currency_symbol: string;
  prevent_negative_profit?: boolean;
  delivery_charges?: number;
  free_shipping_threshold?: number;
  payment_method_title?: string;
  courier_partners?: string;
  dispatch_window?: string;
  dispatch_note?: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  full_name: string | null;
  created_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type OrderSource = 'whatsapp' | 'web';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  variant_name?: string | null;
  product_image?: string | null;
  unit_price: number;
  purchase_price?: number;
  quantity: number;
  line_total: number;
  created_at: string;
  product?: Product | null;
}

export interface Order {
  id: string;
  order_number: string | null; // NULL for pending orders, STH-0001+ when approved
  status: OrderStatus;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  subtotal: number;
  delivery_charges: number;
  coupon_discount: number;
  bundle_discount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  order_source: OrderSource;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  admin_notification_sent?: boolean;
  customer_notification_sent?: boolean;
  admin_notes: string | null;
  order_items?: OrderItem[];
}

export interface CartItem {
  id: string; // unique cart entry id (e.g. productId + variant)
  productId: string;
  productName: string;
  slug: string;
  price: number;
  imageUrl: string;
  quantity: number;
  variantName?: string;
  stockStatus: StockStatus;
}

export type InvoiceStatus = 'Draft' | 'Pending' | 'Confirmed' | 'Paid' | 'Delivered' | 'Cancelled';
export type InvoicePaymentStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Refunded';
export type InvoicePaymentMethod = 'Cash on Delivery' | 'Cash' | 'Bank Transfer' | 'Easypaisa' | 'JazzCash' | 'Other';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id?: string | null;
  product_name: string;
  product_image?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  created_at?: string;
  product?: Product | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp?: string | null;
  customer_email?: string | null;
  customer_address: string;
  customer_city: string;
  invoice_date: string;
  due_date?: string | null;
  subtotal: number;
  item_discount: number;
  coupon_discount: number;
  delivery_charges: number;
  grand_total: number;
  coupon_code?: string | null;
  coupon_id?: string | null;
  payment_method: InvoicePaymentMethod;
  payment_status: InvoicePaymentStatus;
  amount_paid: number;
  remaining_amount: number;
  invoice_status: InvoiceStatus;
  notes?: string | null;
  terms?: string | null;
  created_at: string;
  updated_at: string;
  invoice_items?: InvoiceItem[];
}

export type BackupType = 'manual' | 'safety_prerestore' | 'automated';
export type RestoreType = 'full' | 'selective';
export type BackupStatus = 'success' | 'failed' | 'in_progress';
export type RestoreStatus = 'in_progress' | 'success' | 'failed' | 'rolled_back';

export type BackupModule =
  | 'products'
  | 'categories'
  | 'product_images'
  | 'coupons'
  | 'coupon_usage'
  | 'customers'
  | 'orders'
  | 'order_items'
  | 'invoices'
  | 'invoice_items'
  | 'settings';

export interface BackupRecord {
  id: string;
  backup_name: string;
  backup_type: BackupType;
  file_path: string;
  file_size: number;
  backup_version: string;
  schema_version: string;
  created_by?: string | null;
  created_at: string;
  status: BackupStatus;
  record_counts: Record<string, number>;
  checksum?: string | null;
}

export interface RestoreHistoryRecord {
  id: string;
  restore_number: string;
  backup_id?: string | null;
  restore_type: RestoreType;
  selected_modules: BackupModule[];
  safety_backup_id?: string | null;
  started_at: string;
  completed_at?: string | null;
  status: RestoreStatus;
  records_restored: Record<string, number>;
  records_failed: Record<string, number>;
  error_message?: string | null;
  rollback_status: 'none' | 'pending' | 'success' | 'failed';
  restored_by?: string | null;
  backup?: BackupRecord | null;
  safety_backup?: BackupRecord | null;
}

export interface RestorePreviewData {
  backup: BackupRecord;
  schemaVersion: string;
  compatible: boolean;
  moduleCounts: Record<string, number>;
  totalRecords: number;
}


