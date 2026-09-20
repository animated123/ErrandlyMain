import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Phone, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, User } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { Logo } from './Logo';

import SignUp from './SignUp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  initialMode: 'login' | 'register';
  logoUrl?: string;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode, logoUrl }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>(initialMode);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [otpCode, setOtpCode] = useState('');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '', role: UserRole.REQUESTER });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password specific states
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setAuthMethod('email');
    setOtpSent(false);
    setOtpCode('');
    setError(null);
    setIsProcessing(false);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = firebaseService.subscribeToAuthChanges((u) => {
      if (u?.id && isOpen) {
        setIsProcessing(false);
        onAuthSuccess(u);
        onClose();
      }
    });
    return () => unsub();
  }, [isOpen, onAuthSuccess, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    try {
      if (authMethod === 'phone') {
        const phoneToVerify = authForm.phone?.trim();
        if (!phoneToVerify || phoneToVerify.length < 5) {
          throw new Error("Please enter a valid phone number");
        }
        if (!otpSent) {
          const result = await firebaseService.sendPhoneVerificationCode(phoneToVerify, null);
          setConfirmationResult(result);
          setOtpSent(true);
          return;
        } else {
          if (!otpCode || otpCode.length < 6) {
            throw new Error("Please enter the 6-digit verification code");
          }
          const user = await firebaseService.verifyPhoneCodeAndLogin(confirmationResult, otpCode);
          onAuthSuccess(user);
          onClose();
          return;
        }
      }

      const user = await firebaseService.login(authForm.email, authForm.password);
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await firebaseService.sendPasswordResetEmail(resetEmailInput);
      setSuccessMsg("A password reset link has been sent to your email address. Please check your inbox.");
      setAuthForm(prev => ({ ...prev, email: resetEmailInput }));
    } catch (err: any) {
      setError(err.message || "Failed to process forgot password request.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ 
              type: "spring",
              damping: 26,
              stiffness: 340,
              mass: 0.8
            }}
            className="my-auto bg-card text-card-foreground w-full max-w-md md:max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-slate-200/50 dark:border-slate-800/80 relative"
          >
            {/* Left Side: Image (Desktop Only) */}
            <div className="hidden md:block md:w-1/2 relative overflow-hidden bg-[#0a2e5c]">
              <img 
                src="https://picsum.photos/seed/delivery/800/1200" 
                className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" 
                alt="ErrandRunner reliable door-to-door delivery and errand coordination" 
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e5c] via-transparent to-transparent flex flex-col justify-end p-10 text-white space-y-4">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 mb-4">
                   <Sparkles className="text-secondary" size={32} />
                </div>
                <h3 className="text-4xl font-black tracking-tight leading-[0.9]">Delegation <br /> for the <span className="text-secondary italic">Elite.</span></h3>
                <p className="text-base font-medium text-slate-300 tracking-normal leading-relaxed">Join the most reliable coordination network in the city.</p>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="p-8 md:p-12 md:w-1/2 space-y-8 bg-[#f8fbff] dark:bg-slate-950">
              <div className="flex items-center justify-end">
                <button 
                  onClick={onClose} 
                  aria-label="Close Modal"
                  className="p-2.5 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary rounded-2xl shadow-sm transition-all hover:rotate-90 hover:scale-105 active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {mode === 'forgot-password' ? (
                  <motion.div 
                    key="forgot-password-form"
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-[#0a2e5c] dark:text-white tracking-tight leading-none mb-2 font-display">Reset Password</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Enter your email to receive a secure password reset link</p>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-black border border-red-100 dark:border-red-900/30 text-center uppercase tracking-wider leading-relaxed">
                        {error}
                      </div>
                    )}

                    {successMsg ? (
                      <div className="space-y-6">
                        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-3xl text-sm font-semibold border border-emerald-100 dark:border-emerald-900/30 space-y-3">
                          <p className="font-extrabold uppercase text-xs tracking-wider text-emerald-800 dark:text-emerald-300">✓ Reset Link Sent</p>
                          <p className="text-xs font-medium leading-relaxed">{successMsg}</p>
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            setMode('login');
                            setSuccessMsg(null);
                            setError(null);
                          }}
                          className="w-full py-5 bg-[#0a2e5c] dark:bg-primary text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-lg hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          Return to Login <ArrowRight size={16} />
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRequestPasswordReset} className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Email Address</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                              <Mail className="text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                            </div>
                            <input 
                              type="email" 
                              required
                              value={resetEmailInput}
                              onChange={(e) => setResetEmailInput(e.target.value)}
                              className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] font-bold text-[#0a2e5c] dark:text-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm placeholder:text-slate-300"
                              placeholder="email@example.com"
                            />
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={isProcessing}
                          className="w-full py-5 bg-[#0a2e5c] dark:bg-primary text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 mt-6"
                        >
                          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : "Send Reset Link"}
                          {!isProcessing && <ArrowRight size={16} />}
                        </button>

                        <div className="text-center pt-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setMode('login');
                              setError(null);
                            }}
                            className="text-xs font-black text-muted-foreground tracking-normal font-medium hover:text-[#0a2e5c] dark:hover:text-primary transition-colors hover:underline"
                          >
                            Return to Login
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                ) : mode === 'login' ? (
                  <motion.div 
                    key="login-form" 
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-8"
                  >
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-6">
                        <Logo url={logoUrl} size={48} variant="rounded" className="shadow-sm" />
                        <div>
                          <h2 className="text-3xl font-black text-[#0a2e5c] dark:text-white tracking-tight font-display line-height-none leading-none">Welcome Back</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Access your dashboard</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-6">
                      <button 
                        onClick={() => { setAuthMethod('email'); setOtpSent(false); }}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-widest transition-all ${authMethod === 'email' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        EMAIL
                      </button>
                      <button 
                        onClick={() => setAuthMethod('phone')}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-widest transition-all ${authMethod === 'phone' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        PHONE
                      </button>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-black tracking-normal border border-red-100 dark:border-red-900/30 text-center">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmitLogin} className="space-y-5">
                      {authMethod === 'email' ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Member ID (Email or Phone)</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                              <Mail className="text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                            </div>
                            <input 
                              type="text" 
                              value={authForm.email}
                              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                              className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] font-bold text-[#0a2e5c] dark:text-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm placeholder:text-slate-300"
                              placeholder="email@example.com or phone"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Phone Number</label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                <Phone className="text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                              </div>
                              <input 
                                type="tel" 
                                value={authForm.phone}
                                disabled={otpSent}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAuthForm(prev => ({ ...prev, phone: val }));
                                }}
                                className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] font-bold text-[#0a2e5c] dark:text-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm placeholder:text-slate-300 disabled:opacity-50"
                                placeholder="07XX XXX XXX"
                                required
                              />
                            </div>
                          </div>

                          {otpSent && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-2"
                            >
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Verification Code</label>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                  <Lock className="text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                                </div>
                                <input 
                                  type="text" 
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value)}
                                  className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] font-bold text-[#0a2e5c] dark:text-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm placeholder:text-slate-300"
                                  placeholder="Enter 6-digit code"
                                  maxLength={6}
                                  required
                                />
                              </div>
                              <div className="flex justify-between px-1">
                                <button 
                                  type="button" 
                                  onClick={() => setOtpSent(false)}
                                  className="text-[10px] font-bold text-primary hover:underline"
                                >
                                  Change Number
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleSubmitLogin({ preventDefault: () => {} } as any)}
                                  className="text-[10px] font-bold text-primary hover:underline"
                                >
                                  Resend Code
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {authMethod === 'email' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Security Key (Password / OTP)</label>
                            <button 
                              type="button" 
                              onClick={() => {
                                setMode('forgot-password');
                                setError(null);
                              }}
                              className="text-xs font-black text-primary hover:underline hover:text-[#0b2b52] dark:hover:text-cyan-400 transition-colors"
                            >
                              Forgot?
                            </button>
                          </div>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                              <Lock className="text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                            </div>
                            <input 
                              type="password" 
                              value={authForm.password}
                              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                              className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] font-bold text-[#0a2e5c] dark:text-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm placeholder:text-slate-300"
                              placeholder="••••••••"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <button 
                        type="submit" 
                        disabled={isProcessing}
                        className="w-full py-5 bg-[#0a2e5c] dark:bg-primary text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 mt-6"
                      >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : (
                          authMethod === 'phone' ? (otpSent ? "Verify & Authorize" : "Send Verification Code") : "Authorize Access"
                        )}
                        {!isProcessing && <ArrowRight size={16} />}
                      </button>

                      {/* Recaptcha Container */}
                      {/* SMS Verification Area */}

                      <div className="relative flex items-center justify-center pt-2">
                        <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                        <span className="bg-card px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">or continue with</span>
                        <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          setIsProcessing(true);
                          setError(null);
                          try {
                            const user = await firebaseService.signInWithOAuth('google');
                            if (user) {
                              onAuthSuccess(user);
                              onClose();
                            }
                          } catch (err: any) {
                            setError(err?.message || 'Google authentication failed');
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                        className="w-full py-4 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-[1.5rem] font-bold text-slate-700 dark:text-slate-200 text-sm shadow-sm flex items-center justify-center gap-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.99]"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="register-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <SignUp 
                      onSuccess={(user) => {
                        onAuthSuccess(user);
                        onClose();
                      }}
                      onSwitchToLogin={() => setMode('login')}
                      logoUrl={logoUrl}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {mode === 'login' && (
                <div className="text-center pt-2">
                  <button 
                    onClick={() => setMode('register')}
                    className="text-xs font-black text-muted-foreground tracking-normal font-medium hover:text-[#0a2e5c] dark:hover:text-primary transition-colors"
                  >
                    Don't have an account? Join Us
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
