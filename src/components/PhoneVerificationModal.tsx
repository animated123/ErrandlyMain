import React, { useState } from 'react';
import { X, Phone, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { User } from '../../types';
import { firebaseService } from '../../services/firebaseService';

interface PhoneVerificationModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhoneVerificationModal({ user, onClose, onSuccess }: PhoneVerificationModalProps) {
  const [phone, setPhone] = useState(user.phone || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [devMode, setDevMode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (resendCooldown > 0) return;

    setLoading(true);
    setError(null);
    setDevMode(false);
    try {
      const res = await firebaseService.sendPhoneVerificationCode(user.id, phone);
      if ((res as any).devMode) setDevMode(true);
      setStep('code');
      setResendCooldown(60); // 1 minute cooldown
    } catch (err: any) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Robust cleaning: strip any non-digit characters (dashes, spaces, etc)
      const cleanCode = code.replace(/\D/g, '');
      if (cleanCode.length < 4) {
        throw new Error("Please enter a valid verification code.");
      }
      await firebaseService.verifyPhoneCode(user.id, phone, cleanCode);
      await firebaseService.updateUserProfile(user.id, { phoneVerified: true, phone });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Phone Verification</h2>
            <p className="text-sm text-muted-foreground font-bold tracking-normal font-medium">Verify your phone number to continue</p>
          </div>
          <button onClick={onClose} className="p-2 bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">!</div>
            <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-black text-muted-foreground tracking-normal font-medium ml-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={16} />
                <input 
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)} 
                  className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  required
                />
              </div>
            </div>
            <button 
              type="submit" disabled={loading}
              className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Send Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-black text-muted-foreground tracking-normal font-medium ml-1">Verification Code</label>
              <div className="relative">
                <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={16} />
                <input 
                  type="text" value={code} onChange={e => setCode(e.target.value)} 
                  className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  required
                />
              </div>
            </div>
            {devMode && (
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-sm font-black text-indigo-600 tracking-normal font-medium leading-relaxed">
                  Dev Mode: Check server logs for the verification code.
                </p>
              </div>
            )}
            <button 
              type="submit" disabled={loading}
              className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify Code"}
            </button>
            
            <div className="flex flex-col gap-3">
              <button 
                type="button" 
                onClick={() => handleSendCode()}
                disabled={loading || resendCooldown > 0}
                className="w-full text-center text-sm font-black text-muted-foreground tracking-normal font-medium hover:text-indigo-600 transition-colors disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Verification Code"}
              </button>
              <button 
                type="button"
                onClick={() => setStep('phone')} 
                className="w-full text-center text-sm font-black text-muted-foreground tracking-normal font-medium hover:text-indigo-600 transition-colors"
              >
                Change Phone Number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
