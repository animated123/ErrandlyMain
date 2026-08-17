import { Transaction, TransactionType, TransactionStatus, User, Errand } from '../types';
import { API_BASE_URL } from './apiConfig';

const parseProfile = (data: any) => {
  const hasAdminRights = (
    data.it_admin === true || data.it_admin === 'true' || data.it_admin === 1 ||
    data.is_admin === true || data.is_admin === 'true' || data.is_admin === 1
  );

  return {
    id: data.id,
    walletBalance: data.balance !== undefined && data.balance !== null ? data.balance : (data.wallet_balance || 0),
    rating: data.rating,
    ratingCount: data.rating_count,
    phone: data.phone,
    name: data.username,
    it_admin: data.it_admin,
    is_admin: data.is_admin,
    isAdmin: hasAdminRights,
    role: hasAdminRights ? 'admin' : undefined
  };
};

const parseErrand = (item: any) => ({
  ...item,
  id: item.id,
  title: item.title,
  description: item.description,
  category: item.category,
  status: item.status,
  budget: typeof item.budget === 'string' ? parseFloat(item.budget) : item.budget,
  pickupLocation: item.pickup_location || item.pickuplocation || item.pickupLocation || '',
  pickupCoordinates: item.pickup_coordinates || item.pickupcoordinates || item.pickupCoordinates || { lat: 0, lng: 0 },
  dropoffLocation: item.dropoff_location || item.dropofflocation || item.dropoffLocation || '',
  dropoffCoordinates: item.dropoff_coordinates || item.dropoffcoordinates || item.dropoffCoordinates || { lat: 0, lng: 0 },
  requesterId: item.requester_id || item.requesterid || item.requesterId,
  requesterName: item.requester_name || item.requestername || item.requesterName || '',
  runnerId: item.runner_id || item.runnerid || item.runnerId || undefined,
  runnerName: item.runner_name || item.runnername || item.runnerName || undefined,
  createdAt: item.created_at || item.createdat || item.createdAt,
  updatedAt: item.updated_at || item.updatedat || item.updatedAt,
  bids: item.bids || [],
  checklist: item.checklist || []
});

const parseTransaction = (item: any) => ({
  id: item.id,
  userId: item.user_id,
  amount: item.amount,
  type: item.type as TransactionType,
  status: (item.status === 'success' || item.status === 'completed' ? TransactionStatus.COMPLETED : item.status) as TransactionStatus,
  description: item.description,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const getHeaders = () => {
  const token = localStorage.getItem('errand_runner_jwt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const databaseService = {
  /**
   * Fetch current user's profile from local DB via Express API
   */
  getProfile: async (userId: string, email?: string): Promise<Partial<User> | null> => {
    if (!userId) {
      console.warn('[DatabaseService] getProfile: userId is required');
      return null;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/db/profiles/select`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          match: { id: userId }
        })
      });

      if (!response.ok) {
        throw new Error(`Profile query returned status: ${response.status}`);
      }

      const resData = await response.json();
      let data = resData.data?.[0];

      if (!data) {
        console.log('[DatabaseService] Profile not found, creating default profile...');
        const syncResponse = await fetch(`${API_BASE_URL}/api/db/profiles/upsert`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            body: {
              id: userId,
              email: email || '',
              wallet_balance: 0,
              balance: 0,
              updated_at: new Date().toISOString()
            }
          })
        });

        if (!syncResponse.ok) {
          throw new Error(`Upsert profile failed: ${syncResponse.status}`);
        }

        const syncData = await syncResponse.json();
        data = syncData.data?.[0];
      }
      
      if (!data) return null;
      return parseProfile(data);

    } catch (err: any) {
      console.error('[DatabaseService] getProfile exception:', err.message);
      return null;
    }
  },

  /**
   * Errand Operations
   */
  fetchAvailableErrands: async (): Promise<Errand[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/db/errands/select`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          match: { status: 'pending' }
        })
      });
      if (!response.ok) {
        throw new Error(`Fetch available errands failed: ${response.status}`);
      }
      const res = await response.json();
      return (res.data || []).map(parseErrand);
    } catch (e: any) {
      console.error('[DatabaseService] fetchAvailableErrands failed:', e.message);
      return [];
    }
  },

  createErrand: async (errand: Partial<Errand>): Promise<void> => {
    const body: any = {};
    
    if (errand.id) body.id = errand.id;
    if (errand.title) body.title = errand.title;
    if (errand.description) body.description = errand.description;
    if (errand.category) body.category = errand.category;
    body.status = errand.status || 'pending';
    if (errand.budget !== undefined) body.budget = errand.budget;
    
    if (errand.requesterId) body.requesterId = errand.requesterId;
    if (errand.requesterName) body.requesterName = errand.requesterName;
    if (errand.runnerId) body.runnerId = errand.runnerId;
    if (errand.runnerName) body.runnerName = errand.runnerName;
    
    if (errand.pickupLocation) body.pickupLocation = errand.pickupLocation;
    if (errand.pickupCoordinates) body.pickupCoordinates = errand.pickupCoordinates;
    if (errand.dropoffLocation) body.dropoffLocation = errand.dropoffLocation;
    if (errand.dropoffCoordinates) body.dropoffCoordinates = errand.dropoffCoordinates;
    
    body.createdAt = errand.createdAt ? (typeof errand.createdAt === 'string' ? errand.createdAt : new Date().toISOString()) : new Date().toISOString();
    body.updatedAt = new Date().toISOString();
    
    if (errand.bids) body.bids = errand.bids;
    if (errand.checklist) body.checklist = errand.checklist;

    try {
      const response = await fetch(`${API_BASE_URL}/api/db/errands/insert`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ body })
      });
      if (!response.ok) {
        throw new Error(`Insert errand failed: ${response.status}`);
      }
    } catch (e: any) {
      console.error('[DatabaseService] createErrand failed:', e.message);
    }
  },

  /**
   * Fetch transactions via standard fetch API
   */
  fetchUserTransactions: async (userId: string): Promise<Transaction[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/db/transactions/select`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          match: { user_id: userId }
        })
      });

      if (!response.ok) {
        throw new Error(`Fetch transactions returned status ${response.status}`);
      }

      const resData = await response.json();
      const data = resData.data || [];
      return data.map(parseTransaction);
    } catch (err: any) {
      console.error('[DatabaseService] fetchUserTransactions failed:', err.message);
      return [];
    }
  },

  subscribeToUserTransactions: (userId: string, onUpdate: (transactions: Transaction[]) => void) => {
    databaseService.fetchUserTransactions(userId).then(onUpdate);
    return () => {};
  },

  subscribeToProfile: (userId: string, onUpdate: (profile: Partial<User>) => void) => {
    databaseService.getProfile(userId).then(p => p && onUpdate(p));
    return () => {};
  }
};
