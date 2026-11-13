import nodemailer from 'nodemailer';

let transporter = null;

export function initEmailTransporter() {
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;
  const host = process.env.EMAIL_HOST || (user && user.includes('@gmail.com') ? 'smtp.gmail.com' : null);

  if (user && pass) {
    try {
      if (host === 'smtp.gmail.com' || (user && user.includes('@gmail.com'))) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass }
        });
        console.log('📧 Email configured using Gmail service for:', user);
      } else if (host) {
        transporter = nodemailer.createTransport({
          host,
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: { user, pass }
        });
        console.log('📧 Email SMTP Transporter configured for:', host);
      }
    } catch (err) {
      console.error('⚠️ Failed to initialize email transporter:', err);
      transporter = null;
    }
  } else {
    console.log('ℹ️  No EMAIL_USER/PASS configured. Email running in log mode.');
  }
}

export function getCourseRedemptionDetails(prizeLabel = '', voucherCode = 'DIDAC100') {
  const lower = (prizeLabel || '').toLowerCase();

  if (lower.includes('teacher')) {
    return {
      title: 'AI for Teachers Course Voucher',
      url: 'https://academy.stem-xpert.com/in/course/AI-for-Teachers',
      btnText: 'Open Course & Enroll Now →',
      stepsHtml: `
        <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #CBD5E1; font-size: 14px;">
          <li>Visit: <a href="https://academy.stem-xpert.com/in/course/AI-for-Teachers" style="color: #00F0FF; font-weight: bold;" target="_blank">https://academy.stem-xpert.com/in/course/AI-for-Teachers</a></li>
          <li><strong>Log in</strong> to your existing account or <strong>Sign Up</strong> if you're a new user.</li>
          <li>Open the <strong>AI for Teachers</strong> course.</li>
          <li>Click <strong>Enroll Now</strong> and complete the enrollment process.</li>
          <li>Once enrolled, go to your <strong>Dashboard</strong> and click <strong>Start Learning</strong>.</li>
        </ol>
        <p style="margin-top: 14px; color: #FFD700; font-size: 13px; font-weight: bold;">
          🚀 That's it! You're ready to explore the world of Artificial Intelligence in education with STEM-Xpert.
        </p>
      `
    };
  }

  if (lower.includes('virtual') || lower.includes('lab') || lower.includes('robotics')) {
    return {
      title: 'STEM-Xpert AI Virtual Lab Access',
      url: 'https://stem-xpert.com/in/school-registration',
      btnText: 'Register School Lab Access →',
      stepsHtml: `
        <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #CBD5E1; font-size: 14px;">
          <li>Visit: <a href="https://stem-xpert.com/in/school-registration" style="color: #00F0FF; font-weight: bold;" target="_blank">https://stem-xpert.com/in/school-registration</a></li>
          <li>Complete the registration form with your details.</li>
          <li>Under the lab selection, choose <strong>CTAI & CODING LAB</strong>.</li>
          <li>Fill in the required information and submit your registration.</li>
        </ol>
        <p style="margin-top: 14px; color: #FFD700; font-size: 13px; font-weight: bold;">
          🚀 Congratulations once again! Start exploring AI, coding and hands-on learning with STEM-Xpert!
        </p>
      `
    };
  }

  // Certified Skill Trainer / STEM Facilitator Course
  return {
    title: 'STEM Facilitator Course Voucher',
    url: 'https://academy.stem-xpert.com/in/course/STEM-Facilitator-Course',
    btnText: 'Enroll in Facilitator Course →',
    stepsHtml: `
      <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #CBD5E1; font-size: 14px;">
        <li>Visit: <a href="https://academy.stem-xpert.com/in/course/STEM-Facilitator-Course" style="color: #00F0FF; font-weight: bold;" target="_blank">https://academy.stem-xpert.com/in/course/STEM-Facilitator-Course</a></li>
        <li>Sign up using your email ID and verify it with the OTP.</li>
        <li>Complete your profile and log in.</li>
        <li>Go to <strong>Course List → Educator / Trainer Program → STEM Facilitator Course</strong>.</li>
        <li>Click <strong>Enroll Now</strong> and enter coupon code: <strong style="color: #FF8A33; font-family: monospace; font-size: 15px;">SF100</strong>.</li>
        <li>Click <strong>Apply</strong> and complete your enrollment.</li>
        <li>Find your course in the Dashboard and click <strong>Start Learning</strong>.</li>
      </ol>
      <div style="margin-top: 16px; padding: 12px 16px; background: rgba(0,240,255,0.08); border-left: 3px solid #00F0FF; border-radius: 6px;">
        <div style="font-weight: bold; color: #00F0FF; font-size: 13px; margin-bottom: 4px;">🎓 Get Your Certificate:</div>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #CBD5E1; line-height: 1.6;">
          <li>Complete all course sessions.</li>
          <li>Register for the Evaluation Exam.</li>
          <li>Attend and successfully complete the exam.</li>
          <li>Go to Account → Certificate → Download to get your certificate.</li>
        </ul>
      </div>
      <p style="margin-top: 14px; color: #FFD700; font-size: 13px; font-weight: bold;">
        Start your learning journey with STEM-Xpert today!
      </p>
    `
  };
}

export async function sendWinnerEmail({ participant, prize, voucherCode }) {
  const eventName = process.env.EVENT_NAME || 'DIDAC India 2026';
  const redemption = getCourseRedemptionDetails(prize?.label, voucherCode);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Congratulations on winning your ${prize.label}!</title>
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
    .prize-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #FF8A33; font-weight: 700; }
    .prize-title { font-size: 24px; font-weight: 800; color: #00F0FF; margin: 8px 0; }
    .voucher-pill { display: inline-block; background: #FF6B00; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: 3px; padding: 10px 24px; border-radius: 8px; font-family: monospace; box-shadow: 0 4px 15px rgba(255,107,0,0.4); }
    .steps-card { text-align: left; background: #070B14; border: 1px solid #1E2D56; border-radius: 12px; padding: 20px 22px; margin: 24px 0; }
    .steps-title { font-size: 15px; font-weight: 800; color: #FF8A33; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .cta-btn { display: inline-block; background: #00F0FF; color: #070B14; text-decoration: none; font-weight: 800; padding: 14px 28px; border-radius: 8px; font-size: 15px; margin: 10px 6px; box-shadow: 0 4px 15px rgba(0,240,255,0.4); }
    .secondary-btn { display: inline-block; background: #25D366; color: #FFFFFF; text-decoration: none; font-weight: 700; padding: 13px 24px; border-radius: 8px; font-size: 14px; margin: 10px 6px; }
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
        <div class="prize-label">100% Scholarship Award Won</div>
        <div class="prize-title">${prize.label}</div>
        <p style="color: #CBD5E1; font-size: 13px; margin: 4px 0 16px 0;">${prize.description || ''}</p>
        <div style="font-size: 11px; color: #94A3B8; margin-bottom: 6px; font-weight: bold; letter-spacing: 1px;">OFFICIAL VOUCHER CODE</div>
        <div class="voucher-pill">${voucherCode}</div>
      </div>

      <!-- Step-by-Step Instructions -->
      <div class="steps-card">
        <div class="steps-title">Follow these simple steps to access your course:</div>
        ${redemption.stepsHtml}
      </div>

      <div style="margin-top: 24px;">
        <a href="${redemption.url}" class="cta-btn" target="_blank">${redemption.btnText}</a>
        <a href="https://wa.me/919400451133?text=${encodeURIComponent(`Hi STEM-Xpert! I won ${prize.label} with voucher code: ${voucherCode}. Please assist me with course activation!`)}" class="secondary-btn" target="_blank">Chat with Us on WhatsApp</a>
      </div>

      <p style="font-size: 13px; color: #94A3B8; margin-top: 20px;">
        For any assistance, simply reply to this email or message us on WhatsApp. We're happy to help!
      </p>
    </div>
    <div class="footer">
      <p>STEM-Xpert — Empowering the next generation of roboticists, coders & AI pioneers.</p>
      <p>Official Website: <a href="https://www.stem-xpert.com/in/home">stem-xpert.com</a> • Academy: <a href="https://academy.stem-xpert.com/in/home">academy.stem-xpert.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  if (transporter && participant.email) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"STEM-Xpert Team" <events@stem-xpert.com>',
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
    console.log(`\n----------------- [EMAIL DISPATCH LOG] -----------------`);
    console.log(`To: ${participant.email} (${participant.name})`);
    console.log(`Subject: 🎉 Congratulations ${participant.name}! You won "${prize.label}"`);
    console.log(`Prize: ${prize.label} | Voucher: ${voucherCode}`);
    console.log(`Redemption URL: ${redemption.url}`);
    console.log(`--------------------------------------------------------\n`);
    return { success: true, simulated: true };
  }
}
