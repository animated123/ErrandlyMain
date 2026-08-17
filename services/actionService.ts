import { API_BASE_URL } from './apiConfig';

const BASE_URL = API_BASE_URL;

export const actionService = {
  /**
   * Format phone number to Kenya E.164 without the plus sign (e.g., 2547XXXXXXXX)
   */
  formatPhoneNumber: (phone: string): string => {
    if (!phone) return "";
    // Remove all non-digits
    let cleaned = String(phone).replace(/\D/g, '');
    
    // User requested logic for Paystack M-Pesa
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
    if (cleaned.startsWith('7')) cleaned = '254' + cleaned;
    if (cleaned.startsWith('2540')) cleaned = '254' + cleaned.substring(4);
    
    return cleaned;
  },

  /**
   * SMS Verification (Action Server)
   * Sends OTP via Action Server
   */
  sendVerificationSMS: async (phone: string, userId?: string, code?: string) => {
    try {
      const formattedPhone = actionService.formatPhoneNumber(phone);
      const response = await fetch(`${BASE_URL}/api/notifications/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: formattedPhone,
          userId,
          code 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to send verification SMS');
      }

      return await response.json();
    } catch (error) {
      console.error('SMS verification error:', error);
      throw error;
    }
  },

  /**
   * Email Service
   * Calls /api/notifications/send-email on the Action Server
   */
  sendEmail: async (to: string, subject: string, html: string, type: string = 'alert') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          to, 
          subject, 
          html,
          type
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to send email via proxy');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Email proxy service error:', error.message || error);
      throw error;
    }
  },

  /**
   * WhatsApp Service via WaSender API
   * Calls /api/whatsapp/send on the backend
   */
  sendWhatsApp: async (to: string, message: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          to, 
          message 
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send WhatsApp message');
      }

      return data;
    } catch (error: any) {
      console.error('WhatsApp service error:', error.message || error);
      throw error;
    }
  }
};
