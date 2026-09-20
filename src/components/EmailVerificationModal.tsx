import React, { useState } from 'react';
import { X, Mail, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { firebaseService } from '../../services/firebaseService';

interface EmailVerificationModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailVerificationModal({ user, onClose, onSuccess }: EmailVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendVerification = async () => {
    if (loading || cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request took too long. Please check connection and try again.")), 15000)
      );
      await Promise.race([
        firebaseService.generateEmailVerificationCode(user.id, user.email),
        timeoutPromise
      ]);

      setSent(true);
      setCooldown(60); // Increased cooldown
    } catch (err: any) {
      // Don't log to console.error as per user preference for cleaner logs
      console.debug("[EmailVerification] Error:", err);
      
      if (String(err.message).includes('too-many-requests')) {
        setError("Rate limit reached. A verification link was likely just sent—please check your inbox.");
        setSent(true); // Treat as sent if limit is hit
      } else {
        setError(err.message || "Failed to send verification email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setVerifying(true);
    setError('');
    try {
      const isVerified = await firebaseService.checkEmailVerification(user.id);
      if (isVerified) {
        onSuccess();
        onClose();
      } else {
        setError("Email is not verified yet. Please check your inbox and click the verification link.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to check verification status.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Email Verification</h2>
            <p className="text-sm text-muted-foreground font-bold tracking-normal font-medium">Verify your email address</p>
          </div>
          <button onClick={onClose} className="p-2 bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors">
            <X size={14} />
          </button>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-2xl text-center space-y-3 border border-indigo-100 dark:border-indigo-900/40">
              <div className="w-12 h-12 bg-card text-card-foreground rounded-full flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="text-indigo-500" size={20} />
              </div>
              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Verification email sent!</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">We've sent a verification link to <strong>{user.email}</strong>. Please check your inbox and spam folder.</p>
            </div>

            <div className="space-y-4">
              {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}

              <button 
                onClick={handleCheckVerification} disabled={verifying}
                className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {verifying ? <Loader2 size={16} className="animate-spin" /> : "I've Clicked the Link"}
              </button>

              <button 
                onClick={handleSendVerification} disabled={loading || cooldown > 0}
                className="w-full py-3 text-muted-foreground hover:text-foreground text-sm font-black tracking-normal font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : cooldown > 0 ? `Resend Link (${cooldown}s)` : "Resend Link"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-2xl flex items-center gap-4 border border-indigo-100 dark:border-indigo-900/40">
              <div className="w-12 h-12 bg-card text-card-foreground rounded-xl flex items-center justify-center shadow-sm">
                <Mail className="text-indigo-600 dark:text-indigo-400" size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-black text-indigo-900 dark:text-indigo-100 truncate">{user.email}</p>
              </div>
            </div>

            {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}

            <button 
              onClick={handleSendVerification} disabled={loading}
              className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Send Verification Link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
