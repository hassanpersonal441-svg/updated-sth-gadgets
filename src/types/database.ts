export type StockStatus = 'in_stock' | 'out_of_stock' | 'low_stock';
export type DiscountType = 'percentage' | 'fixed';
export type ProductType = 'product' | 'series_model';

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

export interface ProductSeries {
  id: string; name: string; slug: string; category_id: string | null; brand: string | null;
  description: string; common_specs: Specification[]; common_features: KeyFeature[];
  warranty: string | null; thumbnail_url: string | null; is_active: boolean; sort_order: number;
  created_at: string; updated_at: string; category?: Category | null; model_count?: number;
  min_price?: number; models?: Product[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface KeyFeature {
  icon?: string;
  title: string;
  subtitle?: string;
}

export interface BundleOfferItem {
  name: string;
  detail?: string;
}

export interface BundleOffer {
  id?: string;
  title: string;
  description?: string;
  badge_text?: string;
  bundle_price: number;
  original_price?: number;
  items: BundleOfferItem[];
}

export interface ProductVariant {
  id?: string;
  product_id?: string;
  variant_type: 'color' | string;
  variant_name: string;
  color_value: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  specifications: Specification[];
  key_features?: KeyFeature[];
  bundle_offers?: BundleOffer[];
  price: number;
  old_price: number | null;
  discount: number;
  category_id: string | null;
  sort_order?: number | null;
  sku?: string | null;
  purchase_price?: number;
  wholesale_price?: number | null;
  profit_amount?: number;
  profit_margin?: number;
  stock_status: StockStatus;
  featured: boolean;
  best_seller: boolean;
  new_arrival: boolean;
  free_delivery?: boolean;
  active: boolean;
  product_type?: ProductType;
  series_id?: string | null;
  model_number?: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
  series?: ProductSeries | null;
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

export interface PaymentAccount {
  id: string;
  name: string;
  payment_method_name: string;
  account_name: string;
  account_number: string;
  bank_name?: string | null;
  whatsapp_number?: string | null;
  instructions: string;
  is_active: boolean;
  sort_order: number;
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
  bundle_tier1_threshold?: number;
  bundle_tier1_percent?: number;
  bundle_tier2_threshold?: number;
  bundle_tier2_percent?: number;
  brand_voice_enabled?: boolean;
  auto_rotate_products?: boolean;
  auto_rotate_interval_minutes?: number;
  online_payment_enabled?: boolean;
  online_payment_free_delivery_threshold?: number;
  payment_accounts?: PaymentAccount[];
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
  | 'pending_payment'
  | 'approved'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type OnlinePaymentStatus = 'awaiting_payment' | 'screenshot_sent' | 'under_verification' | 'paid' | 'rejected' | 'cancelled' | 'expired';
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
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_id?: string | null;
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

export interface Payment {
  id: string;
  payment_reference: string;
  order_id: string | null;
  customer_name: string;
  customer_phone: string;
  payment_method: string;
  amount: number;
  status: OnlinePaymentStatus;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
  order?: Order | null;
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
  colorName?: string;
  colorValue?: string;
  stockStatus: StockStatus;
  freeDelivery?: boolean;
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

export type BorrowingStatus = 'active' | 'partially_paid' | 'fully_paid';
export type RepaymentMethod = 'Cash' | 'Bank Transfer' | 'Other';

export interface Repayment {
  id: string;
  repayment_number?: string;
  borrowing_id: string;
  amount: number;
  repayment_date: string;
  payment_method: RepaymentMethod;
  notes?: string | null;
  created_at: string;
}

export interface Borrowing {
  id: string;
  borrowing_number: string;
  lender_name: string;
  whatsapp_number: string;
  email?: string | null;
  borrowed_amount: number;
  total_repaid: number;
  remaining_amount: number;
  borrowing_date: string;
  purpose?: string | null;
  related_order_id?: string | null;
  related_order_number?: string | null;
  notes?: string | null;
  status: BorrowingStatus;
  created_at: string;
  updated_at: string;
  repayments?: Repayment[];
}

export interface FinanceSummary {
  totalBorrowed: number;
  totalRepaid: number;
  totalOutstanding: number;
  activeCount: number;
  partiallyPaidCount: number;
  fullyPaidCount: number;
  recentBorrowings: Borrowing[];
  recentRepayments: Repayment[];
}

export type VendorPurchaseStatus = 'pending' | 'purchased';
export type VendorPaymentStatus = 'unpaid' | 'partial' | 'paid';
export type VendorPaymentMethod = 'cash' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'other';

export interface VendorProfile {
  id: string;
  name: string;
  logo_url: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface VendorPurchase {
  id: string;
  vendor_name: string;
  purchase_number: string;
  order_number: string;
  product_name: string;
  quantity: number;
  wholesale_cost: number;
  status: VendorPurchaseStatus;
  payment_status: VendorPaymentStatus;
  payment_method: VendorPaymentMethod;
  amount_paid: number;
  payment_due_date?: string | null;
  whatsapp_sent_at?: string | null;
  purchase_date: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

