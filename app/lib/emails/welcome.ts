import 'server-only';
import { escapeHtml } from './types';

export const welcomeSubject = 'Your 10% off. Act natural.';

export function welcomeText(code: string, shopUrl: string) {
  return [
    'You’re on the list.',
    '',
    `Here’s 10% off your first order: ${code}`,
    'Enter it in your bag before checkout. One use, no expiry drama.',
    '',
    'You’ll also get first dibs on new drops and holiday sweaters.',
    '',
    `Shop: ${shopUrl}`,
  ].join('\n');
}

export function welcomeHtml(code: string, shopUrl: string) {
  const safeCode = escapeHtml(code);
  const safeUrl = escapeHtml(shopUrl);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Your 10% off</title>
</head>
<body style="margin:0;padding:0;background:#f6f2ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#141413;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;opacity:0;">Your code: ${safeCode} — 10% off your first order.</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f6f2ea;">
    <tr>
      <td align="center" style="padding:40px 20px 28px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="width:100%;max-width:560px;background:#ffffff;border-radius:6px;">
          <tr>
            <td style="padding:32px;">
              <div style="color:#ff4f3d;font-size:11px;letter-spacing:2.4px;text-transform:uppercase;font-weight:900;">Bottom’s Line · You’re on the list</div>
              <div style="font-size:32px;font-weight:900;letter-spacing:-.6px;line-height:1.1;color:#141413;margin-top:12px;">
                The quiet part: 10% off.
              </div>
              <div style="font-size:16px;color:#4a4640;line-height:1.6;margin-top:12px;">
                Enter this code in your bag before checkout. It works once, on your first order.
              </div>
              <div style="margin:24px 0;padding:18px;border:2px dashed #ff4f3d;text-align:center;font-size:26px;font-weight:900;letter-spacing:3px;color:#141413;">
                ${safeCode}
              </div>
              <div style="font-size:14px;color:#4a4640;line-height:1.6;">
                You’ll also get first dibs on new drops and holiday sweaters. No spam — we’re too busy making questionable shirts.
              </div>
              <a href="${safeUrl}" style="display:inline-block;margin-top:24px;padding:14px 22px;background:#ff4f3d;color:#141413;text-decoration:none;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase;">Read the shirts ↗</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
