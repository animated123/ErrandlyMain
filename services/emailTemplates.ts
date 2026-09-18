export const getEmailTemplate = (
  title: string,
  message: string,
  code: string,
  actionText: string
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', sans-serif;
          background-color: #f8f9fa;
          color: #2d2d2d;
          padding: 40px 20px;
          line-height: 1.6;
        }

        .wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }

        .header {
          background: #FF6321;
          padding: 40px 40px;
          text-align: center;
          color: #ffffff;
        }

        .header h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          margin-bottom: 8px;
        }

        .content {
          padding: 40px;
        }

        .greeting {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 16px;
        }

        .message {
          font-size: 16px;
          color: #4a4a4a;
          margin-bottom: 32px;
        }

        .code-container {
          background: #fff5f0;
          border: 2px solid #ffccb3;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin-bottom: 32px;
        }

        .code-label {
          font-size: 14px;
          font-weight: 600;
          color: #FF6321;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .code-value {
          font-family: 'Courier New', Courier, monospace;
          font-size: 36px;
          font-weight: 700;
          color: #FF6321;
          letter-spacing: 8px;
        }

        .button {
          display: inline-block;
          background: #FF6321;
          color: #ffffff !important;
          padding: 16px 32px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          transition: background 0.2s;
          margin-bottom: 32px;
        }

        .footer {
          padding: 32px 40px;
          background: #fdfdfd;
          border-top: 1px solid #f0f0f0;
          text-align: center;
          font-size: 13px;
          color: #888888;
        }

        .footer a {
          color: #FF6321;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>ErrandRunner</h1>
          <p>Your trusted errand companion</p>
        </div>
        <div class="content">
          <div class="greeting">Hello there!</div>
          <div class="message">${message}</div>
          
          ${code ? `
            <div class="code-container">
              <div class="code-label">Verification Code</div>
              <div class="code-value">${code}</div>
            </div>
          ` : ''}

          ${actionText ? `
            <div style="text-align: center;">
              <p style="margin-bottom: 16px; font-size: 14px; color: #666;">Click the button below to continue:</p>
              ${actionText}
            </div>
          ` : ''}

          <div style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 24px;">
            <p style="font-size: 14px; color: #555;">Warm regards,<br><strong>The ErrandRunner Team</strong></p>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ErrandRunner. All rights reserved.<br>
          Nairobi, Kenya 🇰🇪
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getVerificationEmailTemplate = (
  name: string,
  verificationLink: string,
  description: string = "Thank you for joining ErrandRunner! To get started and ensure the security of your account, please verify your email address."
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Account</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #fcfcfc;
          color: #1a1a1a;
          padding: 48px 24px;
          line-height: 1.6;
        }

        .wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 12px 48px rgba(0,0,0,0.08);
          border: 1px solid #f0f0f0;
        }

        .header {
          background: linear-gradient(135deg, #FF6321 0%, #e85210 100%);
          padding: 60px 48px;
          text-align: center;
          color: #ffffff;
        }

        .header h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 32px;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .header p {
          font-size: 16px;
          opacity: 0.9;
          font-weight: 500;
        }

        .content {
          padding: 48px;
        }

        .greeting {
          font-size: 24px;
          font-weight: 700;
          color: #111111;
          margin-bottom: 20px;
          letter-spacing: -0.5px;
        }

        .message {
          font-size: 16px;
          color: #404040;
          margin-bottom: 40px;
        }

        .btn-container {
          text-align: center;
          margin-bottom: 40px;
        }

        .button {
          display: inline-block;
          background: #FF6321;
          color: #ffffff !important;
          padding: 18px 40px;
          border-radius: 16px;
          text-decoration: none;
          font-weight: 700;
          font-size: 16px;
          text-align: center;
          box-shadow: 0 8px 24px rgba(255, 99, 33, 0.25);
          transition: all 0.3s ease;
        }

        .secondary-text {
          font-size: 14px;
          color: #666666;
          margin-bottom: 40px;
          padding: 24px;
          background: #f9f9f9;
          border-radius: 16px;
          border: 1px solid #f0f0f0;
        }

        .footer {
          padding: 40px 48px;
          background: #f8f8f8;
          border-top: 1px solid #eeeeee;
          text-align: center;
          font-size: 13px;
          color: #888888;
        }

        .footer a {
          color: #FF6321;
          text-decoration: none;
          font-weight: 600;
        }

        .brand-footer {
          margin-bottom: 12px;
          font-weight: 700;
          color: #1a1a1a;
          font-size: 15px;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>ErrandRunner</h1>
          <p>Your trusted errand companion</p>
        </div>
        <div class="content">
          <div class="greeting">Hi ${name}, welcome!</div>
          <div class="message">
            ${description}
          </div>
          
          <div class="btn-container">
            <a href="${verificationLink}" class="button">Verify My Account</a>
          </div>

          <div class="secondary-text">
            <strong>Link not working?</strong><br>
            Copy and paste this URL into your browser:<br>
            <span style="color: #FF6321; word-break: break-all;">${verificationLink}</span>
          </div>

          <div style="border-top: 1px solid #f0f0f0; padding-top: 32px;">
            <p style="font-size: 15px; color: #404040;">Warm regards,<br><strong style="color: #FF6321;">The ErrandRunner Team</strong></p>
          </div>
        </div>
        <div class="footer">
          <div class="brand-footer">ErrandRunner App</div>
          &copy; ${new Date().getFullYear()} ErrandRunner. All rights reserved.<br>
          Providing reliable errand services across Nairobi, Kenya 🇰🇪<br><br>
          <a href="#">Privacy Policy</a> &nbsp;·&nbsp; <a href="#">Terms of Service</a>
        </div>
      </div>
    </body>
    </html>
  `;
};
