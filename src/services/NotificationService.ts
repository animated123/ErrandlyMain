import { API_BASE_URL } from '../../services/apiConfig';

export const NotificationService = {
  /**
   * Sends an account verification email via the local server proxy.
   * This avoids CORS and Mixed Content (HTTPS -> HTTP) issues.
   */
  sendVerificationEmail: async (email: string, code: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          type: 'verification',
          reference: code
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Unsupported email type or failed request');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Email action service error:', error.message || error);
      throw error;
    }
  },

  sendRunnerApplicationReceived: async (email: string, name: string) => {
    try {
      const message = `Hi ${name}, thank you for applying to be a runner at Errand Runner. We've received your application and our team is currently reviewing it. We will notify you once a decision is made.`;
      const response = await fetch(`${API_BASE_URL}/api/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          type: 'runner_application_received',
          name,
          message,
          subject: 'Runner Application Received - Errand Runner'
        }),
      });
      return await response.json();
    } catch (error: any) {
      console.error('Runner app received notification error:', error);
      // Fail silently for user UX but log it
    }
  },

  sendRunnerApproval: async (email: string, name: string, userId?: string) => {
    try {
      const guide = `
How to operate as a Runner:
1. Complete your profile and ensure your location is always on when active.
2. Browse "Available Tasks" on your dashboard.
3. Place bids on errands that fit your schedule and vicinity.
4. Once hired, use the in-app chat to coordinate with the requester.
5. Update errand status as you progress (Picked Up, In Transit, Delivered).
6. Request payment through the app once the task is complete.
7. Maintain a high rating to get more tasks and higher fees!
      `;

      const response = await fetch(`${API_BASE_URL}/api/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          userId: userId,
          type: 'runner_approval',
          name,
          guide,
          subject: 'Congratulations! Your Runner Application is Approved'
        }),
      });
      return await response.json();
    } catch (error: any) {
      console.error('Runner approval notification error:', error);
    }
  },

  sendSMS: async (phone: string, message: string) => {
    try {
      // Logic for SMS Gateway (e.g. Africa's Talking or Twilio)
      // This is routed through the proxy backend
      const response = await fetch(`${API_BASE_URL}/api/notifications/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          message: message
        }),
      });
      return await response.json();
    } catch (error: any) {
      console.error('SMS Service Error:', error);
    }
  },

  sendWhatsApp: async (phone: string, message: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          message: message
        }),
      });
      return await response.json();
    } catch (error: any) {
      console.error('WhatsApp Service Error:', error);
      return { success: false, error: error?.message || 'Network error' };
    }
  }
};
