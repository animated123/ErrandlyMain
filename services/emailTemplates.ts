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
          background-color: #f0ede8;
          color: #2d2d2d;
          padding: 32px 16px;
        }

        .wrapper {
          max-width: 580px;
          margin: 0 auto;
        }

        /* ── Top brand strip ── */
        .brand {
          text-align: center;
          margin-bottom: 24px;
        }
        .brand-name {
          font-family: 'DM Serif Display', serif;
          font-size: 26px;
          color: #FF6321;
          letter-spacing: 0.5px;
        }
        .brand-tagline {
          font-size: 12px;
          color: #a08e80;
          margin-top: 2px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        /* ── Card ── */
        .card {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }

        /* ── Hero banner ── */
        .hero {
          background: linear-gradient(145deg, #FF6321 0%, #ff8c57 60%, #ffb38a 100%);
          padding: 48px 40px 52px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          background: rgba(255,255,255,0.07);
          border-radius: 50%;
        }
        .hero::after {
          content: '';
          position: absolute;
          bottom: -60px; left: -30px;
          width: 160px; height: 160px;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
        }
        .hero-greeting {
          font-size: 13px;
          color: rgba(255,255,255,0.8);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: 32px;
          color: #ffffff;
          line-height: 1.2;
        }

        /* ── Body content ── */
        .body {
          padding: 40px 40px 36px;
        }

        .intro {
          font-size: 15.5px;
          color: #555;
          line-height: 1.75;
          margin-bottom: 32px;
        }

        /* ── Code block ── */
        .code-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #FF6321;
          margin-bottom: 12px;
        }
        .code-box {
          background: #fff8f5;
          border: 2px dashed #ffc4a8;
          border-radius: 14px;
          padding: 24px 20px;
          text-align: center;
          margin-bottom: 28px;
        }
        .code-value {
          font-family: 'Courier New', Courier, monospace;
          font-size: 40px;
          font-weight: 800;
          color: #FF6321;
          letter-spacing: 10px;
        }
        .code-expiry {
          font-size: 12px;
          color: #b0a098;
          margin-top: 10px;
        }

        /* ── Action text ── */
        .action-text {
          font-size: 15px;
          color: #666;
          line-height: 1.7;
          margin-bottom: 36px;
        }

        /* ── Divider ── */
        .divider {
          border: none;
          border-top: 1px solid #f0ede8;
          margin: 0 0 28px;
        }

        /* ── Regards block ── */
        .regards {
          font-size: 15px;
          color: #555;
          line-height: 1.8;
        }
        .regards .sign-off {
          margin-bottom: 4px;
        }
        .regards .team-name {
          font-weight: 700;
          color: #FF6321;
          font-size: 16px;
        }
        .regards .team-sub {
          font-size: 13px;
          color: #a08e80;
        }

        /* ── Security note ── */
        .security {
          background: #fafaf9;
          border-left: 3px solid #ffc4a8;
          border-radius: 0 8px 8px 0;
          padding: 14px 18px;
          margin-top: 32px;
          font-size: 13px;
          color: #a08e80;
          line-height: 1.6;
        }

        /* ── Footer ── */
        .footer {
          padding: 24px 40px;
          text-align: center;
          font-size: 12px;
          color: #c4b8b0;
          border-top: 1px solid #f0ede8;
          line-height: 1.8;
        }
        .footer a {
          color: #FF6321;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">

        <!-- Brand -->
        <div class="brand">
          <div class="brand-name">ErrandRunner</div>
          <div class="brand-tagline">Your trusted errand companion</div>
        </div>

        <div class="card">

          <!-- Hero -->
          <div class="hero">
            <div class="hero-greeting">Hello there 👋</div>
            <div class="hero-title">${title}</div>
          </div>

          <!-- Body -->
          <div class="body">

            <p class="intro">${message}</p>

            <!-- Verification Code -->
            <div class="code-label">Your verification code</div>
            <div class="code-box">
              <div class="code-value">${code}</div>
              <div class="code-expiry">⏱ This code expires in <strong>1 hour</strong></div>
            </div>

            <p class="action-text">${actionText}</p>

            <hr class="divider">

            <!-- Regards -->
            <div class="regards">
              <div class="sign-off">Warm regards,</div>
              <div class="team-name">The ErrandRunner Team</div>
              <div class="team-sub">Nairobi, Kenya 🇰🇪</div>
            </div>

            <!-- Security note -->
            <div class="security">
              🔒 <strong>Didn't request this?</strong> No worries — simply ignore this email.
              If you have any concerns, please reach out to our support team right away.
            </div>

          </div>

          <!-- Footer -->
          <div class="footer">
            &copy; ${new Date().getFullYear()} ErrandRunner App. All rights reserved.<br>
            You're receiving this because an action was initiated on your account.<br>
            <a href="#">Unsubscribe</a> &nbsp;·&nbsp; <a href="#">Privacy Policy</a>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
};