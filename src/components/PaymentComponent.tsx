import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { motion } from 'motion/react';
import { CreditCard, Phone, Loader2, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';
import { API_BASE_URL, ACTION_SERVER_URL } from '../../services/apiConfig';

interface PaymentComponentProps {
  amount: number;
  onSuccess?: (reference: string) => void;
  onCancel?: () => void;
}

const PaymentComponent: React.FC<PaymentComponentProps> = ({ amount, onSuccess, onCancel }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsub = firebaseService.subscribeToAuthChanges((u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // 4. Monitoring Logic (Supabase Polling)
  useEffect(() => {
    if (!transactionId || !loading || !currentUser) return;

    console.log(`[Monitoring] Starting status monitor for: ${transactionId}`);
    
    // Stop monitoring after 120 seconds (2 minutes)
    const timeoutId = setTimeout(() => {
      setError("Transaction confirmation took longer than 2 minutes. If you have completed the payment on your phone but it has not reflected yet, please refresh this page/wallet or contact Support with your payment reference.");
      setLoading(false);
    }, 120000);

    // Polling interval (every 6 seconds for optimal resource conservation)
    let lastSyncMulti = 0;
    const intervalId = setInterval(async () => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      try {
        // 1. Trigger external status sync every 10 seconds starting from 10s (up to 90s)
        const currentSyncMulti = Math.floor(elapsed / 10);
        if (currentSyncMulti >= 1 && currentSyncMulti > lastSyncMulti && realtimeStatus === 'pending') {
          console.log(`[Monitoring] Rotational Trigger: Sync for ${transactionId} at ${currentSyncMulti * 10}s`);
          lastSyncMulti = currentSyncMulti;
          fetch(`${API_BASE_URL || ''}/api/payments/status?reference=${transactionId}`).catch(e => 
            console.error('[Monitoring] Status sync fetch failed:', e)
          );
        }

        // 2. Check DB status via server proxy (Fetch API)
        const response = await fetch(`${API_BASE_URL || ''}/api/db/transactions/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match: { id: transactionId }
          })
        });

        if (!response.ok) {
          // Check payment status endpoint as fallback
          const statusRes = await fetch(`${API_BASE_URL || ''}/api/payments/status?reference=${transactionId}`).catch(() => null);
          if (statusRes && statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status && statusData.status !== 'pending') {
              setRealtimeStatus(statusData.status);
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              if (['success', 'completed', 'complete'].includes(statusData.status)) {
                setSuccess(true);
                if (onSuccess) onSuccess(transactionId);
              } else {
                setError(`Transaction status: ${statusData.status}`);
                setLoading(false);
              }
            }
          }
          return;
        }

        const resData = await response.json();
        const data = resData.data?.[0];

        if (data) {
          const rawStatus = String(data.status || 'pending').toLowerCase();
          
          if (rawStatus !== 'pending') {
            console.log(`[Monitoring] Terminal status detected: "${data.status}". Stopping poll.`);
            setRealtimeStatus(data.status);
            
            // Kill timers immediately
            clearInterval(intervalId);
            clearTimeout(timeoutId);

            const isSuccess = ['success', 'completed', 'complete', 'successful'].includes(rawStatus);
            
            if (isSuccess) {
              console.log('[Monitoring] SUCCESS detected. Balance already credited by backend.');
              setSuccess(true);
              if (onSuccess) onSuccess(transactionId);
            } else if (['failed', 'error', 'declined', 'cancelled'].includes(rawStatus)) {
              setError(data.error || `Transaction marked as ${data.status}`);
              setLoading(false);
            }
          }
        }
      } catch (err: any) {
        console.error('[Monitoring] Polling catch:', err);
      }
    }, 2000);

    const startTime = Date.now();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [transactionId, onSuccess, loading, amount, realtimeStatus, currentUser]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRealtimeStatus('pending');

    try {
      if (!currentUser) throw new Error("Please log in to continue");

      // 1. Strict Phone Formatting
      let normalizedPhone = phoneNumber.replace(/\D/g, '');
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '254' + normalizedPhone.substring(1);
      } else if (normalizedPhone.startsWith('7') || normalizedPhone.startsWith('1')) {
        normalizedPhone = '254' + normalizedPhone;
      }
      
      if (normalizedPhone.length !== 12 || !normalizedPhone.startsWith('254')) {
        throw new Error("Invalid phone format. Please enter a 10-digit number (e.g., 0722...)");
      }

      // 2. ID Generation & DB Insert via Server Proxy (Fetch API)
      const localTxId = crypto.randomUUID();
      console.log(`[Payment] Initializing Tx: ${localTxId}`);
      
      let dbTxId = localTxId;
      try {
        const insertResponse = await fetch(`${API_BASE_URL || ''}/api/db/transactions/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: {
              id: localTxId,
              user_id: currentUser.id,
              amount: Number(amount),
              status: 'pending',
              type: 'deposit',
              provider: 'paystack',
              description: 'Wallet Deposit via M-Pesa'
            }
          })
        });

        if (insertResponse.ok) {
          const confirmedData = await insertResponse.json();
          dbTxId = confirmedData.data?.[0]?.id || localTxId;
        }
      } catch (dbErr: any) {
        console.warn("[Payment] Pre-insert note:", dbErr.message);
      }

      setTransactionId(dbTxId);

      // 3. STK Trigger
      const { default: axios } = await import("axios");
      
      try {
        console.log(`[Payment] Triggering STK push...`);
        const endpoint = `${API_BASE_URL || ''}/api/payments/paystack/stk-push`;
        const response = await axios.post(endpoint, {
          amount: Number(amount),
          phone: String(normalizedPhone),
          email: String(currentUser.email || ''),
          txId: String(dbTxId),
          userId: String(currentUser.id)
        });

        console.log(`[Payment] Server Response:`, response.data);

        if (!response.data.success && !response.data.error?.toLowerCase().includes("charge attempted")) {
          throw new Error(response.data.message || "Payment initiation failed");
        }
      } catch (axiosErr: any) {
        const errorData = axiosErr.response?.data;
        const errorMsg = errorData?.error || errorData?.message || "";
        
        if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes("charge attempted")) {
          console.warn("[Payment] STK Push initiated (Charge attempted)");
        } else {
          throw new Error(errorMsg || axiosErr.message || "Payment request failed");
        }
      }

    } catch (err: any) {
      console.error("Payment Error:", err);
      setError(err.message || "Something went wrong.");
      setLoading(false);
      setRealtimeStatus(null);
    }
  };

  if (success || realtimeStatus === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card text-card-foreground p-8 rounded-2xl shadow-xl text-center max-w-md mx-auto border-2 border-emerald-500"
      >
        <div className="relative w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-4 border-white"
          >
            <CheckCircle2 className="w-4 h-4" />
          </motion.div>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-black uppercase tracking-[0.2em] rounded-full mb-4 mx-auto border border-emerald-100">
          Transaction Confirmed
        </div>
        <h2 className="text-2xl font-black text-foreground mb-2">Deposit Successful!</h2>
        <p className="text-sm font-bold text-muted-foreground mb-8 px-4">
          Your deposit of <span className="text-emerald-600">KES {amount}</span> has been confirmed and credited to your wallet balance.
        </p>
        <button
          onClick={onCancel}
          className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 tracking-normal font-medium text-xs"
        >
          Return to Wallet
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card text-card-foreground p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-gray-100"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-50 rounded-xl">
          <CreditCard className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">M-Pesa Payment</h2>
          <p className="text-sm text-gray-500">Secure checkout via Supabase & Paystack</p>
        </div>
      </div>

      <div className="mb-8 p-4 bg-gray-50 rounded-xl flex justify-between items-center">
        <span className="text-gray-600 font-medium">Total Amount</span>
        <span className="text-xl font-bold text-indigo-600">KES {amount}</span>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-emerald-300 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 text-sm font-black tracking-normal font-medium rounded-full mb-3">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
              Status: {realtimeStatus || 'Initializing'}
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {realtimeStatus === 'pending' ? 'Confirming Payment...' : 'Finalizing Account Update...'}
            </h3>
            <p className="text-sm text-gray-500 max-w-[240px] mx-auto mt-1">
              {realtimeStatus === 'pending' 
                ? "Please check your phone for the STK push and enter your PIN."
                : "We've detected your payment! Now updating your wallet balance..."}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePayment} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Phone className="w-4 h-4" /> M-Pesa Phone Number
            </label>
            <input
              type="tel"
              placeholder="e.g., 0722000000"
              required
              disabled={loading}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-4 bg-card text-card-foreground border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-400 font-medium"
            />
            <p className="text-xs text-gray-400 px-1">We'll send an M-Pesa STK push to this number</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-3 border border-red-100"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              Pay KES {amount}
            </button>
            
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="w-full py-3 bg-transparent text-gray-500 font-medium rounded-xl hover:text-gray-700 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="mt-8 flex items-center justify-center gap-2 text-gray-400">
        <span className="text-sm tracking-normal font-medium font-bold">Encrypted & Secure</span>
      </div>
    </motion.div>
  );
};

export default PaymentComponent;
