import nodemailer from 'nodemailer';

let transporter = null;

export function initEmailTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (host && user && pass) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: { user, pass }
      });
      console.log('📧 Email SMTP Transporter configured for:', host);
    } catch (err) {
      console.error('⚠️ Failed to initialize email transporter:', err);
      transporter = null;
    }
  } else {
    console.log('ℹ️  No EMAIL_HOST/USER configured. Email will run in local simulation mode (prints vouchers to console & logs).');
  }
}

export async function sendWinnerEmail({ participant, prize, voucherCode }) {
  const websiteUrl = process.env.WEBSITE_URL || 'https://www.stem-xpert.com/in/home';
  const academyUrl = process.env.ACADEMY_URL || 'https://academy.stem-xpert.com/in/home';
  const eventName = process.env.EVENT_NAME || 'DIDAC India 2026';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Congratulations on your STEM-Xpert Prize!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070B14; margin: 0; padding: 20px; color: #FFFFFF; }
    .container { max-width: 600px; margin: 0 auto; background: #0D1527; border: 1px solid #1E2D56; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #FF6B00 0%, #E02424 100%); padding: 30px 20px; text-align: center; }
    .logo-text { font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF; margin: 0; text-transform: uppercase; }
    .event-badge { display: inline-block; background: rgba(0,0,0,0.3); padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-top: 8px; color: #FFD700; }
    .content { padding: 32px 24px; text-align: center; }
    .salutation { font-size: 22px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; }
    .subtitle { font-size: 15px; color: #94A3B8; margin-bottom: 24px; }
    .prize-box { background: #131D38; border: 2px dashed #FF6B00; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; }
    .prize-label { font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #FF8A33; font-weight: 700; }
    .prize-title { font-size: 24px; font-weight: 800; color: #00F0FF; margin: 8px 0; }
    .prize-desc { font-size: 14px; color: #CBD5E1; margin: 0 0 16px 0; }
    .voucher-pill { display: inline-block; background: #FF6B00; color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: 3px; padding: 10px 24px; border-radius: 8px; font-family: monospace; }
    .info-list { text-align: left; background: #070B14; border-radius: 10px; padding: 16px 20px; margin: 24px 0; font-size: 14px; color: #CBD5E1; }
    .info-list li { margin-bottom: 8px; }
    .cta-btn { display: inline-block; background: #00F0FF; color: #070B14; text-decoration: none; font-weight: 700; padding: 14px 28px; border-radius: 8px; font-size: 15px; margin: 10px 6px; }
    .secondary-btn { display: inline-block; background: transparent; border: 1px solid #FF6B00; color: #FF8A33; text-decoration: none; font-weight: 600; padding: 13px 24px; border-radius: 8px; font-size: 14px; margin: 10px 6px; }
    .footer { background: #070B14; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #1E2D56; }
    .footer a { color: #FF8A33; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">⚡ STEM-Xpert</div>
      <div class="event-badge">Live at ${eventName}</div>
    </div>
    <div class="content">
      <div class="salutation">Congratulations, ${participant.name}! 🎉</div>
      <div class="subtitle">Thank you for visiting our booth and spinning the STEM-Xpert Lucky Wheel!</div>

      <div class="prize-box">
        <div class="prize-label">You Have Won</div>
        <div class="prize-title">${prize.label}</div>
        <p class="prize-desc">${prize.description}</p>
        <div style="font-size: 12px; color: #94A3B8; margin-bottom: 6px;">OFFICIAL VOUCHER CODE</div>
        <div class="voucher-pill">${voucherCode}</div>
      </div>

      <ul class="info-list">
        <li><strong>Redemption:</strong> Send this voucher code to STEM-Xpert on WhatsApp (+91 94004 51133) or claim online.</li>
        <li><strong>Student / School:</strong> ${participant.name} (${participant.school || 'Attendee'})</li>
        <li><strong>Interest:</strong> ${participant.interest}</li>
      </ul>

      <div style="margin-top: 24px;">
        <a href="${prize.enrollUrl || academyUrl}" class="cta-btn" target="_blank">Enroll / Activate Course →</a>
        <a href="https://wa.me/919400451133?text=${encodeURIComponent(`Hi STEM-Xpert! I won ${prize.label} (${voucherCode}). Please help me activate my course!`)}" class="secondary-btn" target="_blank">Claim on WhatsApp</a>
      </div>
    </div>
    <div class="footer">
      <p>STEM-Xpert — Empowering the next generation of roboticists, coders & AI pioneers.</p>
      <p>Questions? Reach us at <a href="mailto:info@stem-xpert.com">info@stem-xpert.com</a> or visit us at DIDAC Bangalore.</p>
    </div>
  </div>
</body>
</html>
  `;

  if (transporter && participant.email) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"STEM-Xpert at DIDAC" <events@stem-xpert.com>',
        to: participant.email,
        subject: `🎉 Congratulations ${participant.name}! You won "${prize.label}" at STEM-Xpert (${eventName})`,
        html: htmlContent
      });
      console.log(`✅ Email sent successfully to ${participant.email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ Failed to send email to ${participant.email}:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`\n----------------- [SIMULATED EMAIL DISPATCH] -----------------`);
    console.log(`To: ${participant.email} (${participant.name})`);
    console.log(`Subject: 🎉 Congratulations ${participant.name}! You won "${prize.label}"`);
    console.log(`Prize: ${prize.label} | Voucher: ${voucherCode}`);
    console.log(`Note: Configure EMAIL_HOST/USER in .env to send real emails.`);
    console.log(`--------------------------------------------------------------\n`);
    return { success: true, simulated: true };
  }
}

