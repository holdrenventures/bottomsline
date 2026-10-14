import 'server-only';
import type { EmailOrder, EmailOrderItem } from './types';
import { escapeHtml, money, shortSessionId } from './types';

// Light background by design. Mail clients in dark mode heavily mangle dark
// email templates (Apple Mail mutes mid-tones, Outlook flips things, etc.) —
// a light template degrades gracefully to a "light card on a dark surround"
// in every client we care about.

export function customerOrderSubject(order: EmailOrder) {
  return `Order confirmed — ${shortSessionId(order.stripe_checkout_session_id)}`;
}

export function customerOrderText(order: EmailOrder, items: EmailOrderItem[]) {
  const lines: string[] = [];
  lines.push(`We got your order, ${order.customer_name ?? 'friend'}.`);
  lines.push('');
  lines.push(`Order #${shortSessionId(order.stripe_checkout_session_id)}`);
  lines.push('');
  for (const item of items) {
    const colorPart = item.color ? `${item.color} · ` : '';
    lines.push(`- ${item.product_name} — ${colorPart}${item.style} · ${item.size} × ${item.quantity}  ${money(item.unit_price_cents * item.quantity, order.currency)}`);
  }
  lines.push('');
  lines.push(`Total: ${money(order.total_cents, order.currency)}`);
  lines.push('');
  if (order.shipping_address) {
    const a = order.shipping_address;
    lines.push('Shipping to:');
    if (order.customer_name) lines.push(order.customer_name);
    if (a.line1) lines.push([a.line1, a.line2].filter(Boolean).join(' '));
    if (a.city) lines.push([a.city, a.state, a.postal_code].filter(Boolean).join(', '));
    lines.push('');
  }
  lines.push('We’ll email you again when your order ships.');
  lines.push('');
  lines.push('— Bottom’s Line Clothing');
  lines.push('https://bottomslineclothing.com');
  return lines.join('\n');
}

export function customerOrderHtml(order: EmailOrder, items: EmailOrderItem[]) {
  const orderRef = shortSessionId(order.stripe_checkout_session_id);
  const customerName = escapeHtml(order.customer_name ?? 'friend');
  const rows = items
    .map((item) => {
      const colorPart = item.color ? `${escapeHtml(item.color)} · ` : '';
      const lineTotal = money(item.unit_price_cents * item.quantity, order.currency);
      return `
        <tr>
          <td style="padding:16px 0;border-top:1px solid #e5e1d8;color:#141413;font-size:15px;line-height:1.5;">
            <div style="font-weight:900;letter-spacing:.2px;">${escapeHtml(item.product_name)}</div>
            <div style="color:#6b6559;font-size:13px;margin-top:3px;">${colorPart}${escapeHtml(item.style)} · Size ${escapeHtml(item.size)} · Qty ${item.quantity}</div>
          </td>
          <td style="padding:16px 0;border-top:1px solid #e5e1d8;color:#141413;font-size:15px;text-align:right;white-space:nowrap;vertical-align:top;">${lineTotal}</td>
        </tr>`;
    })
    .join('');

  const shipping = order.shipping_address;
  const shippingBlock = shipping
    ? `
      <tr>
        <td colspan="2" style="padding-top:28px;">
          <div style="color:#6b6559;font-size:11px;text-transform:uppercase;letter-spacing:1.6px;font-weight:900;">Shipping to</div>
          <div style="color:#141413;font-size:14px;line-height:1.5;margin-top:8px;">
            ${order.customer_name ? `${customerName}<br>` : ''}
            ${shipping.line1 ? `${escapeHtml([shipping.line1, shipping.line2].filter(Boolean).join(' '))}<br>` : ''}
            ${shipping.city ? escapeHtml([shipping.city, shipping.state, shipping.postal_code].filter(Boolean).join(', ')) : ''}
          </div>
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
  <title>Order confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f6f2ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#141413;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;opacity:0;">Order #${orderRef} is confirmed. ${money(order.total_cents, order.currency)} — thanks ${customerName}.</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f6f2ea;">
    <tr>
      <td align="center" style="padding:40px 20px 28px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="width:100%;max-width:560px;background:#ffffff;border-radius:6px;">
          <tr>
            <td style="padding:32px 32px 12px;">
              <div style="color:#ff4f3d;font-size:11px;letter-spacing:2.4px;text-transform:uppercase;font-weight:900;">Bottom’s Line · Order confirmed</div>
              <div style="font-size:32px;font-weight:900;letter-spacing:-.6px;line-height:1.1;color:#141413;margin-top:12px;">
                Thanks, ${customerName}.
              </div>
              <div style="font-size:16px;color:#4a4640;line-height:1.6;margin-top:12px;">
                We got the order. You get another email the moment it ships. Order <strong style="color:#141413;">#${orderRef}</strong>.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${rows}
                <tr>
                  <td style="padding:22px 0 4px;border-top:2px solid #141413;color:#141413;font-size:12px;text-transform:uppercase;letter-spacing:1.6px;font-weight:900;">Total</td>
                  <td style="padding:22px 0 4px;border-top:2px solid #141413;color:#ff4f3d;font-size:22px;font-weight:900;text-align:right;">${money(order.total_cents, order.currency)}</td>
                </tr>
                ${shippingBlock}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;color:#4a4640;font-size:14px;line-height:1.6;font-family:Georgia,serif;font-style:italic;border-top:1px solid #e5e1d8;padding-top:24px;">
              Shirts for loud inside thoughts.
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="width:100%;max-width:560px;">
          <tr>
            <td style="padding:20px 32px;color:#8a8578;font-size:12px;line-height:1.5;text-align:center;">
              Questions? Reply to this email and a human will answer. &nbsp;·&nbsp; <a href="https://bottomslineclothing.com" style="color:#ff4f3d;text-decoration:none;">bottomslineclothing.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
