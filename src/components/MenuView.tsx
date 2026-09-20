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
    <div className="space-y-6 md:space-y-8 pb-16">
      <div className="px-3 md:px-4">
        <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight font-display">Services Catalogue</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Browse pre-priced professional errands and on-demand local assistance</p>
      </div>

      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 no-scrollbar px-3 md:px-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              className="flex-shrink-0 px-6 py-4 bg-card text-card-foreground rounded-2xl border border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground group transition-all flex flex-col items-center gap-2.5 min-w-[100px] shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                <Icon size={20} className="text-primary group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs font-bold tracking-tight whitespace-nowrap">{cat.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6 px-3 md:px-4">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={`skeleton-listing-${i}`} className="bg-card text-card-foreground p-6 rounded-3xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <Skeleton className="w-24 h-7 rounded-full" />
              </div>
              <Skeleton className="w-3/4 h-6" />
              <Skeleton className="w-full h-4" />
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-8 h-8 rounded-xl" />
              </div>
            </div>
          ))
        ) : listings.length === 0 ? (
          <div className="col-span-full p-16 md:p-24 text-center bg-card text-card-foreground rounded-[2.5rem] border border-border shadow-sm max-w-2xl mx-auto my-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
              <Sparkles size={32} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-2 font-display">No services found</h3>
            <p className="text-sm font-medium text-muted-foreground">Try adjusting your filters or search to view available service listings.</p>
          </div>
        ) : (
          listings.map((listing) => (
            <div 
              key={listing.id}
              onClick={() => onSelect(listing)}
              className="bg-card text-card-foreground p-6 rounded-3xl border border-border/80 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 group cursor-pointer flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                    <ShoppingBag size={20} />
                  </div>
                  <div className="bg-emerald-500/10 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full text-xs font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    KSH {listing.price?.toLocaleString?.() ?? listing.price}
                  </div>
                </div>
                
                <div className="pt-1">
                  <h3 className="text-base font-black text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1 font-display">
                    {listing.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1 font-medium">
                    {listing.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-1">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <Star size={15} fill="currentColor" />
                  <span className="text-xs font-black text-foreground">4.8</span>
                  <span className="text-[11px] text-muted-foreground font-medium">(24)</span>
                </div>
                <button className="px-3 py-1.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95">
                  <Plus size={14} />
                  <span>Book</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
