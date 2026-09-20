import { API_BASE_URL } from './apiConfig';

export interface ErrandNotificationPayload {
  id?: string;
  title: string;
  category?: string;
  budget?: number;
  pickupLocation?: string;
  dropoffLocation?: string;
  requesterName?: string;
  requesterPhone?: string;
  urgency?: string;
  deadline?: string;
}

export interface ErrandAcceptedPayload {
  errand: {
    id?: string;
    title: string;
    category?: string;
    budget?: number;
    pickupLocation?: string;
    dropoffLocation?: string;
    requesterName?: string;
    requesterPhone?: string;
  };
  runnerName: string;
  runnerPhone?: string;
  amount?: number;
  eta?: string;
}

export interface TransactionCompletedPayload {
  userId?: string;
  userName?: string;
  userPhone: string;
  amount: number;
  transactionId?: string;
  reference?: string;
  type?: 'deposit' | 'withdrawal' | 'errand_payment' | 'payout' | 'refund' | string;
  newBalance?: number;
  description?: string;
  errandTitle?: string;
}

export interface ErrandPaymentCompletedPayload {
  errandId: string;
  errandTitle: string;
  amount: number;
  requesterName?: string;
  requesterPhone?: string;
  runnerName?: string;
  runnerPhone?: string;
}

/**
 * Generates an absolute deep link URL to view a specific errand
 */
export const generateErrandDeepLink = (errandId: string): string => {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const pathname = window.location.pathname || '/';
    return `${origin}${pathname}?errandId=${encodeURIComponent(errandId)}`;
  }
  return `https://gateway.errandly.site?errandId=${encodeURIComponent(errandId)}`;
};

/**
 * Formats a clean WhatsApp share message with deep link for an errand
 */
export const generateErrandWhatsAppShareText = (errand: {
  id?: string;
  title: string;
  category?: string;
  budget?: number;
  pickupLocation?: string;
  dropoffLocation?: string;
  description?: string;
  urgency?: string;
}, deepLink?: string): string => {
  const link = deepLink || (errand.id ? generateErrandDeepLink(errand.id) : '');
  const budgetText = errand.budget && Number(errand.budget) > 0 
    ? `KSh ${Number(errand.budget).toLocaleString()}` 
    : 'Negotiable / Quote';
  const pickupText = errand.pickupLocation ? `📍 *Pickup:* ${errand.pickupLocation}` : '';
  const dropoffText = errand.dropoffLocation ? `🏁 *Destination:* ${errand.dropoffLocation}` : '';
  const categoryText = errand.category ? `🏷️ *Category:* ${errand.category}` : '';
  const urgencyText = errand.urgency ? `⚡ *Priority:* ${errand.urgency}` : '';

  const details = [
    `📋 *Errand:* ${errand.title}`,
    categoryText,
    `💰 *Budget:* ${budgetText}`,
    urgencyText,
    pickupText,
    dropoffText,
    errand.description ? `📝 *Details:* ${errand.description.length > 120 ? errand.description.substring(0, 117) + '...' : errand.description}` : ''
  ].filter(Boolean).join('\n');

  return `🚀 *Check out this errand on ErrandRunner!*

${details}

🔗 *View & Bid / Track this Errand:*
${link}

_ErrandRunner Kenya • Fast, Reliable, Verified_`;
};

/**
 * Generates WhatsApp Web / Mobile direct share URL
 */
export const generateErrandWhatsAppShareUrl = (errand: {
  id?: string;
  title: string;
  category?: string;
  budget?: number;
  pickupLocation?: string;
  dropoffLocation?: string;
  description?: string;
  urgency?: string;
}): { deepLink: string; whatsappUrl: string; shareText: string } => {
  const deepLink = errand.id ? generateErrandDeepLink(errand.id) : '';
  const shareText = generateErrandWhatsAppShareText(errand, deepLink);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  return { deepLink, whatsappUrl, shareText };
};

/**
 * Normalizes phone numbers to standard E.164 format (+254XXXXXXXXX)
 */
export const normalizeWhatsAppPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9+]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('254') && cleaned.length >= 12) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+254${cleaned.substring(1)}`;
  }
  if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    return `+254${cleaned}`;
  }
  return `+${cleaned}`;
};

/**
 * WhatsApp Notification Service using WaSender API (wasenderapi.com)
 * Automatically triggers WhatsApp notifications when errands are posted or accepted.
 */
export const whatsappNotificationService = {
  /**
   * Send a direct WhatsApp message via the backend proxy
   * The backend uses the WASENDER_API_KEY Bearer Authorization header and WASENDER_API_ENDPOINT from .env
   */
  sendMessage: async (to: string, message: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      if (!to || !message) {
        return { success: false, error: 'Recipient phone and message are required' };
      }

      const normalizedPhone = normalizeWhatsAppPhone(to);
      console.log(`[WhatsApp Notification Service] Sending message to ${normalizedPhone}`);

      const response = await fetch(`${API_BASE_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: normalizedPhone,
          message: message.trim()
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('[WhatsApp Notification Service] HTTP response error:', data);
        return {
          success: false,
          error: data.error || data.message || `Failed with status ${response.status}`,
          data
        };
      }

      console.log(`[WhatsApp Notification Service] Success sending message to ${normalizedPhone}`);
      return { success: true, data };
    } catch (error: any) {
      console.error('[WhatsApp Notification Service] Exception:', error?.message || error);
      return { success: false, error: error?.message || 'Network error while dispatching WhatsApp notification' };
    }
  },

  /**
   * Trigger WhatsApp notification when an errand is posted
   * Alerts the requester with a clean confirmation and status summary
   */
  notifyErrandPosted: async (errand: ErrandNotificationPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const recipientPhone = errand.requesterPhone;
      if (!recipientPhone) {
        console.log('[WhatsApp Notification] Errand posted without requester phone, skipping WhatsApp alert.');
        return { success: false, error: 'No requester phone provided' };
      }

      const clientName = errand.requesterName || 'Member';
      const categoryText = errand.category || 'General Errand';
      const budgetText = errand.budget && Number(errand.budget) > 0 ? `KSh ${Number(errand.budget).toLocaleString()}` : 'Negotiable / Quote';
      const pickupText = errand.pickupLocation || 'Standard / Flexible Pickup';
      const dropoffText = errand.dropoffLocation || 'Local Destination';
      const urgencyText = errand.urgency ? `${errand.urgency.toUpperCase()}` : 'NORMAL';

      const message = 
`🚀 *ErrandRunner — Errand Posted Successfully!*

Hello *${clientName}*,

Your errand request has been registered on the network and dispatched to verified local runners.

📋 *Errand:* ${errand.title}
🏷️ *Category:* ${categoryText}
💰 *Budget:* ${budgetText}
⚡ *Priority:* ${urgencyText}
📍 *Pickup:* ${pickupText}
🏁 *Destination:* ${dropoffText}
⏱️ *Status:* Awaiting Runner Bids / Assignment

We will send you an instant WhatsApp alert the moment a verified runner accepts your task!

_ErrandRunner Kenya • Fast, Reliable, Verified_`;

      return await whatsappNotificationService.sendMessage(recipientPhone, message);
    } catch (err: any) {
      console.error('[WhatsApp Notification] Error notifying errand posted:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to dispatch post notification' };
    }
  },

  /**
   * Trigger WhatsApp notification when an errand is accepted by a runner
   * Alerts the requester that a runner has taken the task, and sends runner details
   */
  notifyErrandAccepted: async (payload: ErrandAcceptedPayload): Promise<{ success: boolean; requesterStatus?: any; runnerStatus?: any; error?: string }> => {
    try {
      const { errand, runnerName, runnerPhone, amount, eta } = payload;
      let requesterStatus: any = null;
      let runnerStatus: any = null;

      const agreedPriceText = amount && Number(amount) > 0 
        ? `KSh ${Number(amount).toLocaleString()}` 
        : (errand.budget ? `KSh ${Number(errand.budget).toLocaleString()}` : 'Standard Rate');
      const etaText = eta || 'Ready immediately (ASAP)';
      const pickupText = errand.pickupLocation || 'Specified pickup point';
      const dropoffText = errand.dropoffLocation || 'Specified dropoff point';
      const clientName = errand.requesterName || 'Member';

      // 1. Notify the Requester (Client)
      if (errand.requesterPhone) {
        const clientMessage = 
`🎉 *ErrandRunner — Errand Accepted!*

Hello *${clientName}*,

Great news! A verified runner has accepted your errand task.

📋 *Errand:* ${errand.title}
🏃 *Assigned Runner:* ${runnerName} ${runnerPhone ? `(${runnerPhone})` : ''}
💵 *Agreed Payout:* ${agreedPriceText}
⏱️ *ETA / Start:* ${etaText}
📍 *Pickup:* ${pickupText}
🏁 *Destination:* ${dropoffText}

Your runner is coordinating your request. Open the app to view live tracking and status updates.

_Thank you for choosing ErrandRunner!_`;

        requesterStatus = await whatsappNotificationService.sendMessage(errand.requesterPhone, clientMessage);
      }

      // 2. Notify the Runner if runner phone is available
      if (runnerPhone) {
        const runnerMessage = 
`📋 *ErrandRunner — Errand Assignment Confirmation*

Hello *${runnerName}*,

You have been successfully assigned to the following errand:

📋 *Errand:* ${errand.title}
👤 *Client:* ${clientName} ${errand.requesterPhone ? `(${errand.requesterPhone})` : ''}
💵 *Your Payout:* ${agreedPriceText}
⏱️ *ETA:* ${etaText}
📍 *Pickup:* ${pickupText}
🏁 *Destination:* ${dropoffText}

Please proceed with the task according to safety guidelines and update milestones in your dashboard.`;

        runnerStatus = await whatsappNotificationService.sendMessage(runnerPhone, runnerMessage);
      }

      return {
        success: Boolean(requesterStatus?.success || runnerStatus?.success),
        requesterStatus,
        runnerStatus
      };
    } catch (err: any) {
      console.error('[WhatsApp Notification] Error notifying errand accepted:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to dispatch acceptance notification' };
    }
  },

  /**
   * Trigger WhatsApp notification when any wallet transaction completes (Deposit, Withdrawal, Refund)
   */
  notifyTransactionCompleted: async (payload: TransactionCompletedPayload): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      if (!payload.userPhone) {
        return { success: false, error: 'User phone number is required for WhatsApp transaction alert' };
      }

      const clientName = payload.userName || 'Valued Member';
      const amountFormatted = `KSh ${Number(payload.amount || 0).toLocaleString()}`;
      const txType = (payload.type || 'deposit').toLowerCase();

      let headerTitle = "Deposit Successful! 💰";
      let typeLabel = "Wallet Top-Up (M-Pesa)";
      let actionText = "Your payment has been received and added to your wallet.";

      if (txType.includes('withdraw')) {
        headerTitle = "Withdrawal Processed! 💸";
        typeLabel = "Wallet Withdrawal";
        actionText = "Your withdrawal request has been completed successfully.";
      } else if (txType.includes('refund')) {
        headerTitle = "Refund Issued! 🔄";
        typeLabel = "Wallet Refund";
        actionText = "A refund has been credited back to your wallet.";
      } else if (txType.includes('payout')) {
        headerTitle = "Runner Payout Received! 💵";
        typeLabel = "Task Payout";
        actionText = payload.errandTitle 
          ? `Your earnings for *"${payload.errandTitle}"* have been credited to your wallet.`
          : "Your errand completion payout has been credited.";
      } else if (txType.includes('payment') || txType.includes('errand')) {
        headerTitle = "Payment Confirmed! ✅";
        typeLabel = "Errand Service Payment";
        actionText = payload.errandTitle 
          ? `Payment for *"${payload.errandTitle}"* has been settled.`
          : "Payment for your errand service has been processed.";
      }

      const refLine = (payload.reference || payload.transactionId) ? `🆔 *Tx Ref:* ${payload.reference || payload.transactionId}\n` : '';
      const balanceLine = (payload.newBalance !== undefined && payload.newBalance !== null) ? `💼 *Updated Balance:* KSh ${Number(payload.newBalance).toLocaleString()}\n` : '';
      const noteLine = payload.description ? `📝 *Note:* ${payload.description}\n` : '';
      const nowFormatted = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });

      const message = 
`✅ *ErrandRunner — ${headerTitle}*

Hello *${clientName}*,

${actionText}

💵 *Amount:* ${amountFormatted}
🏷️ *Type:* ${typeLabel}
${refLine}${balanceLine}${noteLine}⏱️ *Timestamp:* ${nowFormatted}

_ErrandRunner Kenya • Fast, Reliable, Verified_`;

      return await whatsappNotificationService.sendMessage(payload.userPhone, message);
    } catch (err: any) {
      console.error('[WhatsApp Notification] Error notifying transaction completed:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to dispatch transaction WhatsApp notification' };
    }
  },

  /**
   * Trigger WhatsApp notifications when an errand is completed and settled (alerts both requester and runner)
   */
  notifyErrandPaymentCompleted: async (payload: ErrandPaymentCompletedPayload): Promise<{ success: boolean; requesterStatus?: any; runnerStatus?: any; error?: string }> => {
    try {
      const { errandTitle, amount, requesterName, requesterPhone, runnerName, runnerPhone } = payload;
      let requesterStatus: any = null;
      let runnerStatus: any = null;
      const amountFormatted = `KSh ${Number(amount || 0).toLocaleString()}`;
      const nowFormatted = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });

      // 1. Notify Requester
      if (requesterPhone) {
        const clientMsg = 
`🎉 *ErrandRunner — Task & Payment Completed!*

Hello *${requesterName || 'Member'}*,

Your errand *"${errandTitle}"* has been marked completed and payment of *${amountFormatted}* has been settled with your runner ${runnerName ? `(*${runnerName}*)` : ''}.

⏱️ *Completed At:* ${nowFormatted}

Thank you for choosing ErrandRunner! We hope you enjoyed seamless service.

_Rate your runner in the app to help our community!_`;

        requesterStatus = await whatsappNotificationService.sendMessage(requesterPhone, clientMsg);
      }

      // 2. Notify Runner
      if (runnerPhone) {
        const runnerMsg = 
`💰 *ErrandRunner — Errand Earnings Credited!*

Hello *${runnerName || 'Runner'}*,

Congratulations! The errand *"${errandTitle}"* has been marked complete.

💵 *Payout Credited:* ${amountFormatted}
👤 *Client:* ${requesterName || 'Client'}
⏱️ *Settlement Time:* ${nowFormatted}

The payout has been credited to your runner earnings/wallet. Keep up the fantastic work!

_ErrandRunner Kenya • Fast, Reliable, Verified_`;

        runnerStatus = await whatsappNotificationService.sendMessage(runnerPhone, runnerMsg);
      }

      return {
        success: Boolean(requesterStatus?.success || runnerStatus?.success),
        requesterStatus,
        runnerStatus
      };
    } catch (err: any) {
      console.error('[WhatsApp Notification] Error notifying errand payment completed:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to dispatch errand completion WhatsApp notifications' };
    }
  }
};

export default whatsappNotificationService;
