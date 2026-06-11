import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let transporter: nodemailer.Transporter | null = null;

if (!RESEND_API_KEY && SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 5000, // 5s timeout to prevent hanging on Render
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
}

export const isEmailConfigured = Boolean(RESEND_API_KEY || (SMTP_HOST && SMTP_USER && SMTP_PASS));

const sendViaResend = async (to: string, subject: string, html: string, from: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(JSON.stringify(errorData));
  }
  console.log(`[Resend API] Đã gửi email thành công tới: ${to}`);
};

export const sendResetPasswordEmail = async (email: string, fullName: string, code: string) => {
  const mailOptions = {
    from: `"TrustEstate Support" <${SMTP_USER || "no-reply@trustestate.com"}>`,
    to: email,
    subject: "Mã xác thực đặt lại mật khẩu - TrustEstate",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2b6cb0; text-align: center;">Yêu cầu đặt lại mật khẩu</h2>
        <p>Chào <strong>${fullName}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>TrustEstate</strong>.</p>
        <p>Vui lòng sử dụng mã xác thực dưới đây để hoàn tất việc đặt lại mật khẩu:</p>
        <div style="background-color: #f7fafc; border: 1px dashed #cbd5e0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2b6cb0; margin: 20px 0; border-radius: 5px;">
          ${code}
        </div>
        <p style="color: #718096; font-size: 14px;">Mã xác thực này sẽ hết hạn trong vòng 10 phút. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ với bộ phận hỗ trợ của chúng tôi.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="text-align: center; color: #a0aec0; font-size: 12px;">© 2026 TrustEstate. All rights reserved.</p>
      </div>
    `,
  };

  if (RESEND_API_KEY) {
    try {
      const from = process.env.EMAIL_FROM || "TrustEstate <onboarding@resend.dev>";
      await sendViaResend(email, mailOptions.subject, mailOptions.html, from);
    } catch (error) {
      console.error("[Resend API Error] Không thể gửi email:", error);
      throw new Error("Không thể gửi email xác thực qua Resend API.");
    }
  } else if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`[SMTP] Đã gửi email đặt lại mật khẩu thành công tới: ${email}`);
    } catch (smtpError) {
      console.error("[SMTP ERROR] Không thể gửi email:", smtpError);
      throw new Error("Không thể gửi email xác thực qua máy chủ SMTP.");
    }
  } else {
    console.log("=========================================");
    console.log(`[SMTP MOCK] Gửi email đặt lại mật khẩu tới: ${email}`);
    console.log(`[SMTP MOCK] Tên người dùng: ${fullName}`);
    console.log(`[SMTP MOCK] Mã xác thực OTP: ${code}`);
    console.log("=========================================");
  }
};

export const sendRegisterVerificationEmail = async (email: string, fullName: string, code: string) => {
  const mailOptions = {
    from: `"TrustEstate Support" <${SMTP_USER || "no-reply@trustestate.com"}>`,
    to: email,
    subject: "Xác thực đăng ký tài khoản - TrustEstate",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2b6cb0; text-align: center;">Xác thực tài khoản của bạn</h2>
        <p>Chào <strong>${fullName}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>TrustEstate</strong>.</p>
        <p>Vui lòng sử dụng mã xác thực dưới đây để hoàn tất việc đăng ký:</p>
        <div style="background-color: #f7fafc; border: 1px dashed #cbd5e0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2b6cb0; margin: 20px 0; border-radius: 5px;">
          ${code}
        </div>
        <p style="color: #718096; font-size: 14px;">Mã xác thực này sẽ hết hạn trong vòng 10 phút. Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="text-align: center; color: #a0aec0; font-size: 12px;">© 2026 TrustEstate. All rights reserved.</p>
      </div>
    `,
  };

  if (RESEND_API_KEY) {
    try {
      const from = process.env.EMAIL_FROM || "TrustEstate <onboarding@resend.dev>";
      await sendViaResend(email, mailOptions.subject, mailOptions.html, from);
    } catch (error) {
      console.error("[Resend API Error] Không thể gửi email:", error);
      throw new Error("Không thể gửi email xác thực qua Resend API.");
    }
  } else if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`[SMTP] Đã gửi email xác thực đăng ký thành công tới: ${email}`);
    } catch (smtpError) {
      console.error("[SMTP ERROR] Không thể gửi email:", smtpError);
      throw new Error("Không thể gửi email xác thực qua máy chủ SMTP.");
    }
  } else {
    console.log("=========================================");
    console.log(`[SMTP MOCK] Gửi email xác thực đăng ký tới: ${email}`);
    console.log(`[SMTP MOCK] Tên người dùng: ${fullName}`);
    console.log(`[SMTP MOCK] Mã xác thực OTP: ${code}`);
    console.log("=========================================");
  }
};

