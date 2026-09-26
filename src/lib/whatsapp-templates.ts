export type WhatsAppTemplateGroup = 'Order Workflow' | 'Purchase / Fulfillment' | 'Delivery' | 'Customer Communication' | 'Payment Management';

export interface WhatsAppTemplateDefault {
  template_key: string;
  title: string;
  group_name: WhatsAppTemplateGroup;
  audience: 'customer' | 'internal';
  body: string;
  variables: string[];
}

const common = ['customer_name', 'order_number', 'whatsapp_number', 'city', 'address', 'order_items', 'subtotal', 'delivery_charges', 'discount', 'total', 'payment_method', 'order_status', 'tracking_number', 'store_name'];

export const WHATSAPP_TEMPLATE_DEFAULTS: WhatsAppTemplateDefault[] = [
  ['order_received', 'New Order Received', 'Order Workflow', 'customer', 'Hello {{customer_name}},\n\nThank you for placing your order with {{store_name}}.\n\nYour order {{order_number}} has been received and is currently under review.\n\nOrder Total: PKR {{total}}\n\nOur team will review your order and contact you shortly.\n\nThank you for choosing {{store_name}}.', ['customer_name', 'order_number', 'total', 'store_name']],
  ['order_review', 'Order Under Review', 'Order Workflow', 'customer', 'Hello {{customer_name}},\n\nYour order {{order_number}} has been received and is currently under review.\n\nWe are verifying your order details and will update you shortly.\n\nThank you for your patience.\n\n{{store_name}}', ['customer_name', 'order_number', 'store_name']],
  ['order_approved', 'Order Approved', 'Order Workflow', 'customer', 'Hello {{customer_name}},\n\nGreat news! Your order {{order_number}} has been approved successfully.\n\nOrder Total: PKR {{total}}\n\nWe will now proceed with order fulfillment.\n\nThank you for shopping with {{store_name}}.', ['customer_name', 'order_number', 'total', 'store_name']],
  ['order_rejected', 'Order Rejected', 'Order Workflow', 'customer', 'Hello {{customer_name}},\n\nWe are sorry, but your order {{order_number}} could not be processed at this time.\n\nIf you need any assistance, please contact {{store_name}}.\n\nThank you for understanding.', ['customer_name', 'order_number', 'store_name']],
  ['order_cancelled', 'Order Cancelled', 'Order Workflow', 'customer', 'Hello {{customer_name}},\n\nYour order {{order_number}} has been cancelled as requested.\n\nIf you have any questions, please contact {{store_name}}.\n\nThank you.', ['customer_name', 'order_number', 'store_name']],
  ['order_confirmation', 'Order Confirmation', 'Order Workflow', 'customer', 'Hello {{customer_name}},\n\nThis message confirms your order {{order_number}} with {{store_name}}.\n\nOrder Total: PKR {{total}}\n\nThank you for shopping with us.', ['customer_name', 'order_number', 'total', 'store_name']],
  ['purchase_pending', 'Purchase Pending', 'Purchase / Fulfillment', 'customer', 'Hello {{customer_name}},\n\nYour order {{order_number}} is being prepared.\n\nWe are currently arranging the requested products and will update you once your order is ready for dispatch.\n\nThank you for your patience.', ['customer_name', 'order_number']],
  ['product_purchased', 'Product Purchased', 'Purchase / Fulfillment', 'customer', 'Hello {{customer_name}},\n\nYour order {{order_number}} is now being prepared for dispatch.\n\nWe will notify you once it has been shipped.\n\nThank you for choosing {{store_name}}.', ['customer_name', 'order_number', 'store_name']],
  ['product_received', 'Product Received', 'Purchase / Fulfillment', 'customer', 'Hello {{customer_name}},\n\nYour order {{order_number}} is now ready for dispatch.\n\nWe will share the delivery details with you shortly.\n\nThank you for shopping with {{store_name}}.', ['customer_name', 'order_number', 'store_name']],
  ['order_dispatched', 'Order Dispatched', 'Delivery', 'customer', 'Hello {{customer_name}},\n\nYour order {{order_number}} has been dispatched.\n\n{{tracking_number}}\n\nYour order is now on its way.\n\nThank you for shopping with {{store_name}}.', ['customer_name', 'order_number', 'tracking_number', 'store_name']],
  ['out_for_delivery', 'Out for Delivery', 'Delivery', 'customer', 'Hello {{customer_name}},\n\nYour order {{order_number}} is out for delivery.\n\nPlease keep your phone available so our delivery team can contact you if needed.\n\nThank you for choosing {{store_name}}.', ['customer_name', 'order_number', 'store_name']],
  ['order_delivered', 'Order Delivered', 'Delivery', 'customer', 'Hello {{customer_name}},\n\nYour order {{order_number}} has been marked as delivered.\n\nWe hope you are happy with your purchase from {{store_name}}.\n\nThank you for shopping with us.', ['customer_name', 'order_number', 'store_name']],
  ['delivery_delayed', 'Delivery Delayed', 'Delivery', 'customer', 'Hello {{customer_name}},\n\nYour order {{order_number}} is experiencing a delivery delay.\n\nWe apologize for the inconvenience and appreciate your patience. We will keep you updated regarding the delivery.\n\n{{store_name}}', ['customer_name', 'order_number', 'store_name']],
  ['address_confirmation', 'Address Confirmation', 'Customer Communication', 'customer', 'Hello {{customer_name}},\n\nBefore we proceed with your order {{order_number}}, please confirm your delivery details:\n\nCity: {{city}}\nAddress: {{address}}\n\nPlease reply with any corrections.\n\nThank you.', ['customer_name', 'order_number', 'city', 'address']],
  ['payment_confirmation', 'Payment Confirmation', 'Customer Communication', 'customer', 'Hello {{customer_name}},\n\nYour payment for order {{order_number}} has been received successfully.\n\nOrder Total: PKR {{total}}\n\nThank you for shopping with {{store_name}}.', ['customer_name', 'order_number', 'total', 'store_name']],
  ['thank_you', 'Thank You', 'Customer Communication', 'customer', 'Hello {{customer_name}},\n\nThank you for shopping with {{store_name}}.\n\nWe truly appreciate your order and hope you enjoy your purchase.\n\nWe look forward to serving you again.', ['customer_name', 'store_name']],
  ['custom_order_message', 'Custom Order Message', 'Customer Communication', 'customer', 'Hello {{customer_name}},\n\n', ['customer_name']],
  ['payment_verified', 'Online Payment Verified', 'Payment Management', 'customer', 'Hello {{customer_name}},\n\nGreat news! Your online payment has been successfully verified.\n\nPayment Reference: {{payment_reference}}\nOrder Number: {{order_number}}\nAmount: PKR {{total}}\nPayment Method: {{payment_method}}\n\nYour order has now been placed and is pending approval.\n\nThank you for shopping with {{store_name}}.', ['customer_name', 'payment_reference', 'order_number', 'total', 'payment_method', 'store_name']],
  ['payment_rejected', 'Online Payment Rejected', 'Payment Management', 'customer', 'Hello {{customer_name}},\n\nWe could not verify your online payment for order {{order_number}}.\n\nPayment Reference: {{payment_reference}}\nAmount: PKR {{total}}\n\nReason: {{rejection_reason}}\n\nPlease contact {{store_name}} if you need assistance.\n\nThank you.', ['customer_name', 'order_number', 'payment_reference', 'total', 'rejection_reason', 'store_name']],
  ['payment_pending', 'Payment Pending Reminder', 'Payment Management', 'customer', 'Hello {{customer_name}},\n\nWe are still waiting for your payment confirmation.\n\nPayment Reference: {{payment_reference}}\nAmount: PKR {{total}}\nPayment Method: {{payment_method}}\n\nPlease complete the payment and send the screenshot to our WhatsApp for verification.\n\nThank you for your cooperation.', ['customer_name', 'payment_reference', 'total', 'payment_method']],
  ['payment_instructions', 'Payment Instructions', 'Payment Management', 'customer', 'Hello {{customer_name}},\n\nTo complete your order, please make the payment using the following details:\n\nPayment Method: {{payment_method}}\nAccount Name: {{account_name}}\nAccount Number: {{account_number}}\nAmount: PKR {{total}}\n\nAfter payment, send a screenshot to our WhatsApp for verification.\n\nPayment Reference: {{payment_reference}}\n\nThank you for shopping with {{store_name}}.', ['customer_name', 'payment_method', 'account_name', 'account_number', 'total', 'payment_reference', 'store_name']],
].map(([template_key, title, group_name, audience, body, variables]) => ({ template_key, title, group_name, audience, body, variables })) as WhatsAppTemplateDefault[];

export const WHATSAPP_VARIABLES = common;

export function renderWhatsAppTemplate(body: string, values: Record<string, unknown>): string {
  return body.replace(/{{\s*([a-z_]+)\s*}}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined || value === null || String(value).trim() === '' ? '' : String(value);
  }).replace(/\n{3,}/g, '\n\n').trim();
}