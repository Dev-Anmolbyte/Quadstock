/**
 * Generates a beautiful HTML email template for OTP verification.
 */
export const otpEmailTemplate = (ownerName, storeName, otp) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your QuadStock Account</title>
</head>
<body style="margin:0; padding:0; background-color:#f0f4f8; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 36px 40px; text-align: center;">
              <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.5px;">QuadStock</h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.75); font-size:14px;">Inventory Management Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 32px;">
              <p style="margin:0 0 16px; color:#374151; font-size:16px;">Hello, <strong>${ownerName}</strong> 👋</p>
              <p style="margin:0 0 24px; color:#6b7280; font-size:15px; line-height:1.6;">
                Welcome to <strong style="color:#1e3a5f;">${storeName}</strong>! To activate your account, please use the verification code below.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background: #f0f7ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 28px 20px; display:inline-block; width: 100%; box-sizing:border-box;">
                      <p style="margin:0 0 8px; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:2px; font-weight:600;">Your Verification Code</p>
                      <p style="margin:0; color:#1e3a5f; font-size:48px; font-weight:800; letter-spacing:12px; font-family: 'Courier New', monospace;">${otp}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0; color:#f59e0b; font-size:13px; text-align:center;">
                ⏱ This OTP expires in <strong>10 minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 0 40px;"><hr style="border:none; border-top:1px solid #e5e7eb;"></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align:center;">
              <p style="margin:0 0 8px; color:#9ca3af; font-size:12px;">
                If you didn't create a QuadStock account, you can safely ignore this email.
              </p>
              <p style="margin:0; color:#9ca3af; font-size:12px;">
                &copy; ${new Date().getFullYear()} QuadStock. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
};
