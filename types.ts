export enum UserRole {
  REQUESTER = 'requester',
  RUNNER = 'runner',
  ADMIN = 'admin'
}

export enum ErrandStatus {
  PENDING = 'pending',
  BIDDING = 'bidding',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  ACCEPTED = 'accepted',
  VERIFYING = 'verifying',
  REVIEW = 'review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  DISPUTED = 'disputed'
}

export enum ErrandCategory {
  GENERAL = 'General',
  MAMA_FUA = 'Mama Fua (Laundry)',
  MARKET_SHOPPING = 'Market Shopping',
  HOUSE_HUNTING = 'House Hunting',
  PACKAGE_DELIVERY = 'Package Delivery',
  TOWN_SERVICE = 'Town Service',
  GIKOMBA_STRAWS = 'Gikomba Straws',
  SHOPPING = 'Shopping'
}

export enum LoyaltyLevel {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isRunner?: boolean;
  isAdmin?: boolean;
  it_admin?: boolean;
  is_admin?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  theme?: 'light' | 'dark';
  lastKnownLocation?: Coordinates;
  lastLocation?: Coordinates; // Alias for compatibility
  lastSeen?: string;
  disabled?: boolean;
  loyaltyPoints?: number;
  hoursSaved?: number;
  loyaltyLevel?: LoyaltyLevel;
  profilePhoto?: string;
  avatar?: string;
  biography?: string;
  balanceOnHold?: number;
  walletBalance?: number;
  cancellationRate?: number;
  lateCompletionRate?: number;
  rejectionRate?: number;
  suspensionExpiresAt?: any;
  isOnline?: boolean;
  isVerified?: boolean;
  backend_admin?: boolean;
  verificationCode?: string;
  verificationCodeExpiresAt?: any;
  resetCode?: string;
  resetCodeExpiresAt?: any;
  notificationSettings?: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  createdAt?: any;
  rating?: number;
  ratingCount?: number;
  totalTasks?: number;
  balance?: number;
  completedErrands?: number;
}

export enum PaymentMethod {
  CASH_ON_DELIVERY = 'Cash on Delivery',
  MOBILE_MONEY = 'Mobile Money',
  BANK_TRANSFER = 'Bank Transfer',
  CREDIT_CARD = 'Credit Card'
}

export interface Errand {
  id: string;
  title: string;
  description: string;
  category: ErrandCategory;
  status: ErrandStatus;
  budget: number;
  requesterId: string;
  requesterName: string;
  requesterPhone?: string;
  requesterIsVerified?: boolean;
  runnerId?: string;
  runnerName?: string;
  runnerPhone?: string;
  runnerIsVerified?: boolean;
  pickupLocation: string;
  pickupCoordinates: Coordinates;
  dropoffLocation?: string;
  dropoffCoordinates?: Coordinates;
  deadline?: string;
  createdAt: any;
  updatedAt: any;
  location: Coordinates;
  disputeReason?: string;
  bids?: Bid[];
  isInHouse?: boolean;
  laundryBaskets?: number;
  pricePerBasket?: number;
  houseType?: string;
  moveInDate?: string;
  additionalRequirements?: string;
  urgency?: 'Normal' | 'High' | 'Urgent';
  packageDescription?: string;
  packageCost?: number;
  shoppingList?: string;
  marketSection?: string;
  maxShoppingBudget?: number;
  shoppingBudget?: number;
  shoppingItems?: string[];
  // Saka Keja (House Hunting) specific fields
  rentBudgetMin?: number;
  rentBudgetMax?: number;
  amenities?: string[];
  targetEstates?: string[];
  commuteReferencePoint?: string;
  commuteDistanceEnabled?: boolean;
  numberOfHousesViewed?: number;
  runnerTasks?: string[];
  propertyType?: string;
  vibe?: string;
  aiEstimatedScale?: number;
  aiEstimationBreakdown?: {
    baseFee: number;
    sizeMultiplier: number;
    workScale: number;
    locationPremium: number;
    urgencyMultiplier: number;
    total: number;
  };
  calculatedPrice?: number;
  voiceNoteUrl?: string;
  checklist?: string[];
  reviewPhoto?: string;
  reviewComments?: string;
  propertyListings?: PropertyListing[];
  priceRequests?: PriceRequest[];
  acceptedPrice?: number;
  requesterRating?: number;
  runnerRating?: number;
  runnerReview?: string;
  requesterReview?: string;
  receiptUrl?: string;
  paymentMethod?: string;
  proofUrl?: string;
  runnerComments?: string;
  completedAt?: string;
  runnerLocation?: Coordinates;
  lastMessage?: string;
  isPackagePickedUp?: boolean;
  packagePickedUpAt?: string;
  pickupPhotoUrl?: string;
  dropoffPhotoUrl?: string;
  lastSyncLocationAt?: string;
  // Mama Fua specific fields
  loadSize?: 'Small' | 'Medium' | 'Large';
  serviceTypes?: string[];
  detergentProvided?: boolean;
  waterAvailability?: 'Constant' | 'Buying';
  hangingPreference?: 'Indoor' | 'Outdoor';
  mamaFuaBreakdown?: {
    loadSizeLabel: string;
    loadSizeCost: number;
    materialLabel: string;
    materialCost: number;
    urgencyLabel: string;
    urgencyMultiplier: number;
    detergentCost: number;
    baseFee: number;
    total: number;
  };
}

export interface Bid {
  id: string;
  runnerId: string;
  runnerName: string;
  runnerPhone?: string;
  runnerIsVerified?: boolean;
  amount: number;
  price?: number; // Alias for amount
  message: string;
  eta?: string;
  status?: string;
  createdAt: any;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'message' | 'bid' | 'assignment' | 'completion' | 'payment';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: any;
  errandId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  imageUrl?: string;
  createdAt: any;
  timestamp?: any;
}

export interface AppSettings {
  primaryColor: string;
  logoUrl?: string;
  iconUrl?: string;
  platformFee?: number;
  minErrandPrice?: number;
  maintenanceMode?: boolean;
  appName?: string;
  defaultUiScale?: number;
  logoScale?: number;
  logoVariant?: 'original' | 'square' | 'circle' | 'rounded';
  sakaKejaBaseFee?: number;
  sakaKejaPercentage?: number;
  dashboardHeroUrl?: string;
}

export interface LocationSuggestion {
  name: string;
  coords: Coordinates;
}

export interface RunnerApplication {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned' | 'Resubmitted' | 'resubmitted';
  idPhoto?: string;
  selfiePhoto?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  selfieUrl?: string;
  nationalId?: string;
  categoryApplied?: string;
  address?: string;
  location?: Coordinates;
  createdAt: any;
  returnReason?: string;
  reviewedByName?: string;
}

export interface FeaturedService {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  explanation?: string;
  paymentGuide?: string;
  category?: string;
}

export interface ServiceListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
}

export interface PriceRequest {
  id: string;
  userId: string;
  itemDescription: string;
  itemName?: string;
  originalPrice?: number;
  newPrice?: number;
  amount?: number; // Alias for compatibility
  status: 'pending' | 'answered' | 'accepted' | 'rejected';
  answer?: string;
  createdAt: any;
}

export interface PropertyListing {
  id: string;
  title: string;
  price: number;
  location: string;
  coords: { lat: number; lng: number };
  type: string;
  imageUrl: string;
  agentRating?: number;
  amenities?: string[];
  description?: string;
  runnerView?: string;
  createdAt?: any;
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  PAYMENT = 'payment',
  EARNING = 'earning',
  REFUND = 'refund'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  previousBalance?: number;
  addedBalance?: number;
  newBalance?: number;
  transactionCode?: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  paymentReference?: string;
  createdAt: any;
  updatedAt: any;
}
