import React, { useState, useEffect } from 'react';
import { X, Download, ChevronRight, CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../types';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onWithdraw: (amount: number, phone: string, name: string) => Promise<void>;
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, user, onWithdraw }) => {
  const [amount, setAmount] = useState<string>('');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [name, setName] = useState<string>(user?.name || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');

  useEffect(() => {
    if (user) {
      setPhone(user.phone || '');
      setName(user.name || '');
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) {
      setStep('details');
      setAmount('');
    }
  }, [isOpen]);

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || !phone || !name) return;
    setIsProcessing(true);
    try {
      await onWithdraw(Number(amount), phone, name);
      setStep('success');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Withdrawal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-foreground text-background/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-card text-card-foreground rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-foreground">Withdraw Funds</h2>
              <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {step === 'details' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6 mb-8">
                  <div>
                    <p className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-2">Amount to Withdraw (Ksh)</p>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/70">Ksh</span>
                      <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-16 pr-6 py-4 bg-muted border-2 border-transparent focus:border-indigo-600 rounded-2xl text-xl font-black text-foreground outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-2">M-Pesa Phone Number</p>
                    <input 
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g., 0712345678"
                      className="w-full px-6 py-4 bg-muted border-2 border-transparent focus:border-indigo-600 rounded-2xl text-sm font-bold text-foreground outline-none transition-all"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-2">Account Name</p>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-6 py-4 bg-muted border-2 border-transparent focus:border-indigo-600 rounded-2xl text-sm font-bold text-foreground outline-none transition-all"
                    />
                  </div>
                </div>

                <button 
                  disabled={!amount || Number(amount) <= 0 || !phone || !name}
                  onClick={() => setStep('confirm')}
                  className="w-full py-5 bg-black text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  Review Request <ChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 'confirm' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-muted p-6 rounded-3xl mb-8 space-y-4">
                  <div className="flex justify-between">
                    <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">Withdrawal Amount</p>
                    <p className="text-sm font-black text-foreground">Ksh {amount}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">To Phone</p>
                    <p className="text-sm font-black text-foreground">{phone}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">Account Name</p>
                    <p className="text-sm font-black text-foreground">{name}</p>
                  </div>
                  <div className="pt-4 border-t border-border flex justify-between">
                    <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">Platform Fee</p>
                    <p className="text-sm font-black text-foreground">Ksh 0</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep('details')}
                    className="flex-1 py-5 border-2 border-border text-muted-foreground rounded-3xl font-black uppercase text-xs tracking-[0.2em] hover:bg-muted transition-all"
                  >
                    Back
                  </button>
                  <button 
                    disabled={isProcessing}
                    onClick={handleWithdraw}
                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Withdrawal'}
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-emerald-500">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Request Sent!</h3>
                <p className="text-sm font-bold text-muted-foreground mb-10">Your withdrawal request for Ksh {amount} is being processed.</p>
                <button 
                  onClick={onClose}
                  className="w-full py-5 bg-black text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WithdrawalModal;
