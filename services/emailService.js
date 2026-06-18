import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildProviderEmailTemplate({ providerName, subject, message }) {
  const safeProviderName = escapeHtml(providerName || 'Provider');
  const safeSubject = escapeHtml(subject || 'Message from Admin');
  const safeMessage = escapeHtml(message || '').replace(/\n/g, '<br />');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeSubject}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f5f5f7;font-family:Arial,sans-serif;color:#171717;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f7;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e5e5;">
                <tr>
                  <td style="background:#111111;padding:24px 32px;">
                    <h1 style="margin:0;font-size:24px;line-height:32px;font-weight:700;color:#ffffff;">
                      ${escapeHtml(process.env.SMTP_FROM_NAME || 'Admin Team')}
                    </h1>
                    <p style="margin:8px 0 0 0;font-size:14px;line-height:20px;color:#d4d4d4;">
                      Official message from support
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:24px;color:#171717;">
                      Hello ${safeProviderName},
                    </p>

                    <p style="margin:0 0 24px 0;font-size:15px;line-height:24px;color:#404040;">
                      You have received a message from the admin team.
                    </p>

                    <div style="margin:0 0 24px 0;padding:20px;border:1px solid #e5e5e5;border-radius:18px;background:#fafafa;">
                      <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#737373;">
                        Subject
                      </p>
                      <p style="margin:0 0 16px 0;font-size:18px;line-height:28px;font-weight:600;color:#111111;">
                        ${safeSubject}
                      </p>

                      <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#737373;">
                        Message
                      </p>
                      <p style="margin:0;font-size:15px;line-height:24px;color:#262626;">
                        ${safeMessage}
                      </p>
                    </div>

                    <p style="margin:0;font-size:14px;line-height:22px;color:#525252;">
                      Please do not reply to this email unless instructed. If you need help, contact support through the admin channel.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 32px;border-top:1px solid #e5e5e5;background:#fafafa;">
                    <p style="margin:0;font-size:12px;line-height:18px;color:#737373;">
                      © ${new Date().getFullYear()} ${escapeHtml(process.env.SMTP_FROM_NAME || 'Admin Team')}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Hello ${providerName || 'Provider'},

You have received a message from the admin team.

Subject: ${subject || 'Message from Admin'}

Message:
${message || ''}

Please do not reply to this email unless instructed.

${process.env.SMTP_FROM_NAME || 'Admin Team'}
  `.trim();

  return { html, text };
}

export async function sendProfessionalProviderEmail({
  to,
  providerName,
  subject,
  message,
}) {
  const { html, text } = buildProviderEmailTemplate({
    providerName,
    subject,
    message,
  });

  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'Admin Team'}" <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject,
    text,
    html,
  });
}

function buildSellerMessageNotificationTemplate({
  sellerName,
  buyerName,
  adTitle,
  message,
  conversationUrl,
}) {
  const safeSellerName = escapeHtml(sellerName || "there");
  const safeBuyerName = escapeHtml(buyerName || "A buyer");
  const safeAdTitle = escapeHtml(adTitle || "your ad");
  const safeMessage = escapeHtml(message || "").replace(/\n/g, "<br />");
  const safeConversationUrl = escapeHtml(conversationUrl);

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f5f5f7;padding:32px;">
      <div style="max-width:640px;margin:auto;background:#fff;border-radius:20px;padding:32px;border:1px solid #e5e5e5;">
        <h2 style="margin:0 0 16px;color:#111;">New message on AdzStreet</h2>

        <p>Hello ${safeSellerName},</p>

        <p>${safeBuyerName} sent you a message about:</p>

        <h3 style="margin:16px 0;color:#111;">${safeAdTitle}</h3>

        <div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:16px;padding:18px;margin:24px 0;">
          <p style="margin:0;color:#333;">${safeMessage}</p>
        </div>

        <p>
          <a href="${safeConversationUrl}" style="display:inline-block;background:#655fa0;color:#fff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:bold;">
            Reply to message
          </a>
        </p>

        <p style="font-size:13px;color:#777;margin-top:24px;">
          You received this because someone contacted you about your ad on AdzStreet.
        </p>
      </div>
    </div>
  `;

  const text = `
Hello ${sellerName || "there"},

${buyerName || "A buyer"} sent you a message about: ${adTitle || "your ad"}

Message:
${message || ""}

Reply here:
${conversationUrl}
  `.trim();

  return { html, text };
}

export async function sendSellerMessageNotificationEmail({
  to,
  sellerName,
  buyerName,
  adTitle,
  message,
  conversationUrl,
}) {
  const { html, text } = buildSellerMessageNotificationTemplate({
    sellerName,
    buyerName,
    adTitle,
    message,
    conversationUrl,
  });

  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "AdzStreet"}" <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject: `New message about your ad: ${adTitle || "AdzStreet ad"}`,
    text,
    html,
  });
}