import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  History, 
  Plus, 
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw
} from 'lucide-react';
import { User, Transaction, TransactionType, TransactionStatus } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { actionService } from '../../services/actionService';
import { databaseService } from '../../services/databaseService';
import { API_BASE_URL, ACTION_SERVER_URL } from '../../services/apiConfig';

import PaymentComponent from './PaymentComponent';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser?: (updatedUser: Partial<User>) => void;
}

export default function WalletModal({ isOpen, onClose, user, onUpdateUser }: WalletModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(user?.walletBalance || 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setIsRefreshing(true);
    setLoading(true);
    try {
      console.log('[Wallet] Refreshing data from local database...');
      // 1. Fetch Profile/Balance
      const profile = await databaseService.getProfile(user.id, user.email);
      if (profile) {
        const bal = Math.max(
          profile.walletBalance !== undefined ? Number(profile.walletBalance) : 0,
          (profile as any).balance !== undefined ? Number((profile as any).balance) : 0,
          (profile as any).wallet_balance !== undefined ? Number((profile as any).wallet_balance) : 0
        );
        setWalletBalance(bal);
        if (onUpdateUser) {
          onUpdateUser({ walletBalance: bal, balance: bal } as any);
        }
      }
      
      // 2. Fetch Transactions
      const txs = await databaseService.fetchUserTransactions(user.id);
      setTransactions(txs);

      // 3. Sync Trigger Logic: If any pending transaction is within 3 minutes, trigger sync
      const now = Date.now();
      const threeMinutesMs = 3 * 60 * 1000;
      const recentPendingTx = txs.find(tx => {
        const isPending = tx.status?.toLowerCase() === 'pending';
        if (!isPending) return false;
        
        const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
        return (now - txDate.getTime()) <= threeMinutesMs;
      });

      if (recentPendingTx) {
        console.log(`[Wallet] Recent pending transaction found (${recentPendingTx.id}). Triggering sync...`);
        fetch(`${API_BASE_URL || ''}/api/payments/status?reference=${recentPendingTx.id}`).catch(e => 
          console.error('[Wallet] Manual refresh sync trigger failed:', e)
        );
      }
      
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [user?.id, user?.email, onUpdateUser]);

  const userBalance = (user as any)?.balance;
  const userWalletBalance = user?.walletBalance;

  useEffect(() => {
    if (user) {
      const b = Math.max(Number(userWalletBalance || 0), Number(userBalance || 0));
      setWalletBalance(b);
    }
  }, [user, userWalletBalance, userBalance]);

  useEffect(() => {
    if (!user?.id || !isOpen) return;

    // Reset show more toggle on open
    setShowAllTransactions(false);
    
    // Automatically refresh balance and recent transactions once when wallet opens
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isOpen]);

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (Number(amount) > (walletBalance || 0)) {
      setError('Insufficient balance');
      return;
    }

    if (!user?.id) return;

    setIsWithdrawing(true);
    setError(null);

    try {
      const txId = `withdraw-${Date.now()}`;
      
      const insertResponse = await fetch(`${API_BASE_URL}/api/db/transactions/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: {
            id: txId,
            user_id: user.id,
            amount: Number(amount),
            type: 'withdrawal',
            status: 'pending',
            provider: 'system',
            description: `Withdrawal request to ${user.phone || 'registered number'}`
          }
        })
      });

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        alert(`Withdrawal Initialization Failed: ${errorText}`);
        throw new Error(errorText);
      }

      setSuccess('Withdrawal request submitted! Our team will process it shortly.');
      setAmount('');
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setError(err.message || 'Failed to initiate withdrawal.');
      alert(`Withdrawal Exception: ${err.message}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
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
          className="relative w-full max-w-lg bg-card text-card-foreground rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between bg-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-card text-card-foreground/20 rounded-xl">
                <Wallet size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">My Wallet</h2>
                <p className="text-sm font-bold tracking-normal font-medium opacity-80">Manage your funds</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-card text-card-foreground/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
            {showPaymentGateway ? (
              <PaymentComponent 
                amount={Number(amount)} 
                onCancel={() => setShowPaymentGateway(false)}
                onSuccess={() => {
                  setShowPaymentGateway(false);
                  setAmount('');
                  // poll for balance and recent transaction once after transaction is completed
                  fetchData();
                  setSuccess("Transaction confirmed! Your balance has been updated.");
                  setTimeout(() => setSuccess(null), 5000);
                }}
              />
            ) : (
              <>
                {/* Balance Card */}
                <div className="bg-foreground text-background rounded-3xl p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Wallet size={120} />
                  </div>
                  
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-1">Available Balance</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black">KSH {(walletBalance || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={fetchData}
                      disabled={isRefreshing}
                      className="p-3 bg-card text-card-foreground/10 hover:bg-card text-card-foreground/20 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                      title="Refresh Balance"
                    >
                      <RefreshCw size={20} className={`${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-2">Amount (KSH)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount..."
                        className="w-full px-6 py-4 bg-muted border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold text-foreground outline-none transition-all"
                      />
                      <CreditCard className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={20} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        if (!amount || Number(amount) <= 0) {
                          setError("Please enter a valid amount");
                          return;
                        }
                        setShowPaymentGateway(true);
                        setError(null);
                      }}
                      className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-normal font-medium hover:bg-indigo-700 transition-all"
                    >
                      <Plus size={16} />
                      Deposit
                    </button>
                    <button
                      onClick={handleWithdraw}
                      disabled={isWithdrawing}
                      className="flex items-center justify-center gap-2 py-4 bg-foreground text-background text-white rounded-2xl font-black text-xs tracking-normal font-medium hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      {isWithdrawing ? <Loader2 className="animate-spin" size={16} /> : <ArrowUpRight size={16} />}
                      Withdraw
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3 animate-shake">
                    <AlertCircle size={20} />
                    <p className="text-xs font-bold">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 size={20} />
                    <p className="text-xs font-bold">{success}</p>
                  </div>
                )}

                {/* Transactions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-muted-foreground" />
                      <h3 className="text-xs font-black tracking-normal font-medium text-foreground">Recent Transactions</h3>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/70">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p className="text-sm font-bold tracking-normal font-medium">Loading transactions...</p>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-12 bg-muted rounded-3xl border-2 border-dashed border-border">
                        <History size={32} className="mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm font-bold tracking-normal font-medium text-muted-foreground">No transactions yet</p>
                      </div>
                    ) : (
                      <>
                        {(showAllTransactions ? transactions : transactions.slice(0, 2)).map((tx) => (
                          <div 
                            key={tx.id}
                            className="p-4 bg-card text-card-foreground border border-border rounded-2xl flex items-center justify-between hover:border-indigo-100 transition-all group animate-in fade-in slide-in-from-bottom-2 duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${
                                tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.EARNING
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-rose-50 text-rose-600'
                              }`}>
                                {tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.EARNING 
                                  ? <ArrowDownLeft size={16} /> 
                                  : <ArrowUpRight size={16} />
                                }
                              </div>
                              <div>
                                <p className="text-sm font-black text-foreground tracking-tight">{tx.description || tx.type}</p>
                                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                  <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">
                                    {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : (typeof tx.createdAt === 'string' ? new Date(tx.createdAt).toLocaleDateString() : 'Recent')}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-black ${
                                tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.EARNING
                                  ? 'text-emerald-600'
                                  : 'text-rose-600'
                              }`}>
                                {tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.EARNING ? '+' : '-'}
                                KSH {(tx.amount || 0).toLocaleString()}
                              </p>
                              <p className={`text-xs font-black tracking-normal font-medium ${
                                tx.status === TransactionStatus.COMPLETED ? 'text-emerald-600' :
                                tx.status === TransactionStatus.PENDING ? 'text-amber-600' : 'text-rose-600'
                              }`}>
                                {tx.status}
                              </p>
                            </div>
                          </div>
                        ))}

                        {transactions.length > 2 && (
                          <button
                            onClick={() => setShowAllTransactions(!showAllTransactions)}
                            className="w-full mt-2 py-3 bg-secondary hover:bg-slate-200 text-muted-foreground hover:text-foreground rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                          >
                            {showAllTransactions ? 'Show Less' : `Show More (${transactions.length - 2} more)`}
                            <ArrowRight size={12} className={`transform transition-transform ${showAllTransactions ? '-rotate-90' : 'rotate-90'}`} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
