import 'server-only';
import { areaCodeDetail } from '../area-code';
import type { EmailOrder, EmailOrderItem } from './types';
import { escapeHtml, money, shortSessionId } from './types';

function itemDetail(item: EmailOrderItem) {
  const code = areaCodeDetail(item.area_code);
  return [item.color, item.style, item.size, code].filter(Boolean).join(' · ');
}

// Owner notification. Light background for dark-mode compatibility.

export function storeOrderSubject(order: EmailOrder) {
  const amount = money(order.total_cents, order.currency);
  const who = order.customer_name ?? order.customer_email ?? 'a customer';
  return `${order.shipping_address?.fulfillment_method === 'pickup' ? 'Schedule pickup' : 'New order'} — ${amount} from ${who}`;
}

export function storeOrderText(order: EmailOrder, items: EmailOrderItem[]) {
  const lines: string[] = [];
  const pickup = order.shipping_address?.fulfillment_method === 'pickup';
  lines.push(`New order #${shortSessionId(order.stripe_checkout_session_id)} — ${money(order.total_cents, order.currency)}`);
  lines.push('');
  lines.push(`Customer: ${order.customer_name ?? '(unknown)'} <${order.customer_email ?? 'no email'}>`);
  if (pickup) lines.push(`Phone: ${order.shipping_address?.phone ?? '(missing)'}`);
  lines.push('');
  lines.push('Items:');
  for (const item of items) {
    lines.push(`- ${item.product_name} — ${itemDetail(item)} × ${item.quantity}  (SKU ${item.sku})  ${money(item.unit_price_cents * item.quantity, order.currency)}`);
  }
  lines.push('');
  if (order.shipping_address) {
    const a = order.shipping_address;
    lines.push(pickup ? 'LOCAL PICKUP — schedule in 37207. Davidson County eligibility address:' : 'Shipping to:');
    if (order.customer_name) lines.push(order.customer_name);
    if (a.line1) lines.push([a.line1, a.line2].filter(Boolean).join(' '));
    if (a.city) lines.push([a.city, a.state, a.postal_code].filter(Boolean).join(', '));
  }
  lines.push('');
  lines.push(`Session: ${order.stripe_checkout_session_id}`);
  if (order.stripe_payment_intent_id) lines.push(`Payment: ${order.stripe_payment_intent_id}`);
  lines.push('');
  lines.push('Fulfill: https://bottomslineclothing.com/admin/orders');
  return lines.join('\n');
}

export function storeOrderHtml(order: EmailOrder, items: EmailOrderItem[]) {
  const pickup = order.shipping_address?.fulfillment_method === 'pickup';
  const orderRef = shortSessionId(order.stripe_checkout_session_id);
  const customerName = escapeHtml(order.customer_name ?? '(no name)');
  const customerEmail = escapeHtml(order.customer_email ?? '');

  const rows = items
    .map((item) => {
      const lineTotal = money(item.unit_price_cents * item.quantity, order.currency);
      const code = areaCodeDetail(item.area_code);
      return `
        <tr>
          <td style="padding:12px 0;border-top:1px solid #e5e1d8;color:#141413;font-size:14px;line-height:1.5;">
            <div style="font-weight:900;">${escapeHtml(item.product_name)}</div>
            ${code ? `<div style="color:#141413;font-size:16px;font-weight:900;letter-spacing:.12em;margin-top:4px;">Print ${escapeHtml(code)}</div>` : ''}
            <div style="color:#6b6559;font-size:12.5px;margin-top:3px;">${item.color ? `${escapeHtml(item.color)} · ` : ''}${escapeHtml(item.style)} · Size ${escapeHtml(item.size)} · Qty ${item.quantity}</div>
            <div style="color:#6b6559;font-size:12px;margin-top:3px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;">SKU <span style="color:#141413;">${escapeHtml(item.sku)}</span></div>
          </td>
          <td style="padding:12px 0;border-top:1px solid #e5e1d8;color:#141413;font-size:14px;text-align:right;white-space:nowrap;vertical-align:top;">${lineTotal}</td>
        </tr>`;
    })
    .join('');

  const shipping = order.shipping_address;
  const shippingBlock = shipping
    ? `
      <tr>
        <td colspan="2" style="padding-top:22px;color:#4a4640;font-size:13px;line-height:1.5;">
          <div style="color:#6b6559;font-size:11px;text-transform:uppercase;letter-spacing:1.4px;font-weight:900;margin-bottom:6px;">${pickup ? 'Schedule local pickup in 37207 · eligibility address' : 'Shipping'}</div>
          ${pickup && shipping.phone ? `Phone: ${escapeHtml(shipping.phone)}<br>` : ''}
          ${order.customer_name ? `${customerName}<br>` : ''}
          ${shipping.line1 ? `${escapeHtml([shipping.line1, shipping.line2].filter(Boolean).join(' '))}<br>` : ''}
          ${shipping.city ? escapeHtml([shipping.city, shipping.state, shipping.postal_code].filter(Boolean).join(', ')) : ''}
        </td>
      </tr>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>New order — ${orderRef}</title>
</head>
<body style="margin:0;padding:0;background:#f6f2ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#141413;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f6f2ea;">
    <tr>
      <td align="center" style="padding:32px 20px 28px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="width:100%;max-width:560px;background:#ffffff;border-radius:6px;">
          <tr>
            <td style="padding:28px 32px 8px;">
              <div style="color:#ff4f3d;font-size:11px;letter-spacing:2.4px;text-transform:uppercase;font-weight:900;">Bottom’s Line · New order · #${orderRef}</div>
              <div style="font-size:30px;font-weight:900;letter-spacing:-.5px;line-height:1.1;color:#141413;margin-top:10px;">
                ${money(order.total_cents, order.currency)}
              </div>
              <div style="font-size:14px;color:#4a4640;line-height:1.55;margin-top:8px;">
                ${customerName} · <a href="mailto:${customerEmail}" style="color:#ff4f3d;text-decoration:none;">${customerEmail}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${rows}
                <tr>
                  <td style="padding:16px 0 0;border-top:2px solid #141413;color:#141413;font-size:11px;text-transform:uppercase;letter-spacing:1.6px;font-weight:900;">Total</td>
                  <td style="padding:16px 0 0;border-top:2px solid #141413;color:#ff4f3d;font-size:20px;font-weight:900;text-align:right;">${money(order.total_cents, order.currency)}</td>
                </tr>
                ${shippingBlock}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 32px 24px;">
              <a href="https://bottomslineclothing.com/admin/orders" style="display:inline-block;padding:13px 20px;background:#141413;color:#ffffff;text-decoration:none;font-weight:900;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;border-radius:3px;">Open fulfillment desk →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e5e1d8;color:#8a8578;font-size:11px;line-height:1.5;font-family:'SFMono-Regular',Consolas,monospace;">
              Session <span style="color:#4a4640;">${escapeHtml(order.stripe_checkout_session_id)}</span>
              ${order.stripe_payment_intent_id ? `<br>Payment <span style="color:#4a4640;">${escapeHtml(order.stripe_payment_intent_id)}</span>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
