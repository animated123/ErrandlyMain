import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation, X } from 'lucide-react';

interface LocationData {
  address: string;
  coords: google.maps.LatLngLiteral;
  placeId: string;
}

interface PlacesAutocompleteProps {
  label?: string;
  placeholder: string;
  onPlaceSelect: (data: LocationData) => void;
  icon?: React.ReactNode;
  apiKey: string;
  initialValue?: string;
  className?: string;
  containerClassName?: string;
}

export default function PlacesAutocomplete({ 
  label, 
  placeholder, 
  onPlaceSelect, 
  icon, 
  apiKey, 
  initialValue,
  className = "",
  containerClassName = ""
}: PlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialValue !== undefined) {
      setInputValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input: query,
          includedRegionCodes: ['ke'], // Restricted to Kenya as per app context
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch suggestions');
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Autocomplete error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (suggestion: any) => {
    const placeId = suggestion.placePrediction.placeId;
    const displayName = suggestion.placePrediction.text.text;
    setInputValue(displayName);
    setShowSuggestions(false);
    setLoading(true);

    try {
      const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch place details');
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      
      onPlaceSelect({
        address: data.formattedAddress || data.displayName.text,
        coords: {
          lat: data.location.latitude,
          lng: data.location.longitude
        },
        placeId: data.id
      });
      setInputValue(''); // Clear after selection for multi-select use cases if needed, or keep it. 
      // For the "Add" button flow in CreateScreen, clearing it is better.
    } catch (error) {
      console.error('Place details error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${containerClassName}`}>
      <div className={`flex items-center px-4 py-3 gap-3 bg-muted rounded-2xl border-none focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all ${className}`}>
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1">
          {label && <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-0.5">{label}</p>}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                fetchSuggestions(e.target.value);
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={placeholder}
              className="w-full bg-transparent border-none p-0 font-bold text-foreground text-sm placeholder:text-muted-foreground/70 outline-none"
            />
            {loading ? (
              <Loader2 size={14} className="animate-spin text-indigo-600" />
            ) : (
              inputValue && (
                <button 
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="p-1 hover:bg-slate-200 rounded-full text-muted-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full px-5 py-3 text-left hover:bg-muted transition-colors border-b border-slate-50 last:border-none flex items-start gap-3"
            >
              <MapPin size={14} className="text-muted-foreground/70 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">{s.placePrediction.text.text}</p>
                {s.placePrediction.structuredFormat?.secondaryText && (
                  <p className="text-sm text-muted-foreground">{s.placePrediction.structuredFormat.secondaryText.text}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
