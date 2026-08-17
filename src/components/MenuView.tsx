import React from 'react';
import { Search, Filter, Star, Plus, ShoppingBag, Waves, Home, Package, Car, ShoppingCart, Sparkles, Loader2 } from 'lucide-react';
import { ServiceListing, ErrandCategory } from '../../types';
import { Skeleton } from './ErrandCard';

interface MenuViewProps {
  listings: ServiceListing[];
  onSelect: (listing: ServiceListing) => void;
  isLoading?: boolean;
}

export default function MenuView({ listings, onSelect, isLoading }: MenuViewProps) {
  const categories = [
    { id: ErrandCategory.MAMA_FUA, label: 'Laundry', icon: Waves },
    { id: ErrandCategory.MARKET_SHOPPING, label: 'Market', icon: ShoppingBag },
    { id: ErrandCategory.HOUSE_HUNTING, label: 'Saka Keja', icon: Home },
    { id: ErrandCategory.PACKAGE_DELIVERY, label: 'Delivery', icon: Package },
    { id: ErrandCategory.TOWN_SERVICE, label: 'Town', icon: Car },
    { id: ErrandCategory.SHOPPING, label: 'Shopping', icon: ShoppingCart },
  ];

  return (
    <div className="space-y-4 pb-12">
      <div className="px-2">
        <h2 className="text-lg font-black text-foreground tracking-tight">Services</h2>
        <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Browse available services</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              className="flex-shrink-0 px-5 py-4 bg-card text-card-foreground rounded-2xl border border-border text-muted-foreground hover:border-indigo-100 hover:text-secondary group transition-all flex flex-col items-center gap-2 min-w-[80px]"
            >
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-all shadow-sm">
                <Icon size={18} className="text-primary group-hover:text-inherit" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{cat.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={`skeleton-listing-${i}`} className="bg-card text-card-foreground p-3 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="w-8 h-8 rounded-xl" />
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
              <Skeleton className="w-3/4 h-5 mb-1" />
              <Skeleton className="w-full h-3 mb-1" />
              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <Skeleton className="w-16 h-3" />
                <Skeleton className="w-6 h-6 rounded-lg" />
              </div>
            </div>
          ))
        ) : listings.length === 0 ? (
          <div className="col-span-full p-20 text-center bg-card text-card-foreground rounded-[3rem] border border-border shadow-sm">
            <Sparkles size={48} className="mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-black text-foreground mb-1">No services found</h3>
            <p className="text-sm font-bold text-muted-foreground">Try adjusting your filters or search.</p>
          </div>
        ) : (
          listings.map((listing) => (
            <div 
              key={listing.id}
              onClick={() => onSelect(listing)}
              className="bg-card text-card-foreground p-3 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group cursor-pointer flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="text-indigo-600" size={16} />
                </div>
                <div className="bg-emerald-50 px-2 py-0.5 rounded-full text-sm font-black text-emerald-600 tracking-normal font-medium">
                  KSH {listing.price}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                  {listing.title}
                </h3>
                <p className="text-sm font-bold text-muted-foreground line-clamp-1">
                  {listing.description}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} fill="currentColor" />
                  <span className="text-xs font-black tracking-normal font-medium">4.8</span>
                </div>
                <button className="p-1.5 bg-black text-white rounded-lg hover:scale-110 transition-transform active:scale-95">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
