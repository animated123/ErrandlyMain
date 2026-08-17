/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  useMapsLibrary,
  useMap,
  AdvancedMarker,
  ControlPosition,
  MapControl,
  Marker,
  useApiLoadingStatus
} from '@vis.gl/react-google-maps';
import { MapPin, Search, Target, CheckCircle2, X, AlertTriangle } from 'lucide-react';

interface LocationData {
  address: string;
  coords: google.maps.LatLngLiteral;
  placeId: string;
}

interface GoogleMapPickerProps {
  apiKey: string;
  onConfirm: (location: LocationData) => void;
  className?: string;
  placeholder?: string;
}

function SafeAdvancedMarker(props: any) {
  const status = useApiLoadingStatus();
  
  if (status !== 'LOADED') {
    return null;
  }

  const isAdvancedMarkerSupported = typeof window !== 'undefined' && 
    window.google && 
    window.google.maps && 
    window.google.maps.marker && 
    window.google.maps.marker.AdvancedMarkerElement;

  if (!isAdvancedMarkerSupported) {
    return <Marker position={props.position} onClick={props.onClick} />;
  }

  return <AdvancedMarker {...props} />;
}

export default function GoogleMapPicker({ apiKey, onConfirm, className, placeholder = "Search for a location..." }: GoogleMapPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: -1.286389, lng: 36.817223 }); // Nairobi default
  const [hasMapError, setHasMapError] = useState(false);

  useEffect(() => {
    const handleError = () => {
      setHasMapError(true);
    };
    window.addEventListener('google-maps-auth-failure', handleError);
    return () => {
      window.removeEventListener('google-maps-auth-failure', handleError);
    };
  }, []);

  const handleConfirm = () => {
    if (selectedLocation) {
      onConfirm(selectedLocation);
    }
  };

  if (hasMapError || !apiKey || apiKey === 'YOUR_API_KEY' || apiKey.trim() === '') {
    return (
      <div className={`flex flex-col h-full bg-slate-50 border border-slate-200 rounded-[2.5rem] items-center justify-center p-6 text-center shadow-soft ${className}`}>
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-amber-500 border border-amber-200">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-800 mb-2 tracking-tight font-display">Google Maps Action Required</h3>
        <p className="text-sm text-slate-600 max-w-sm mb-6 leading-relaxed">
          {(!apiKey || apiKey === 'YOUR_API_KEY' || apiKey?.trim() === '') ? 
            "API key is missing. Please add a valid VITE_GOOGLE_MAPS_API_KEY." : 
            "Your API key was loaded, but 'Maps JavaScript API' is not enabled in your Google Cloud Project."
          }
        </p>
        <div className="bg-white rounded-2xl border border-slate-150 p-4 text-left max-w-md w-full shadow-sm text-xs font-semibold text-slate-700 space-y-2 font-sans">
          <p className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Setup Instruction Steps:</p>
          <div className="flex gap-2">
            <span className="font-extrabold text-indigo-600">1.</span> 
            <span>Open <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-600 hover:text-indigo-700">Google Cloud Console</a>.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-extrabold text-indigo-600">2.</span> 
            <span>Go to <strong>APIs & Services</strong> &gt; <strong>Library</strong>.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-extrabold text-indigo-600">3.</span> 
            <span>Search for <strong>&quot;Maps JavaScript API&quot;</strong> and click <strong>Enable</strong>.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-extrabold text-indigo-600">4.</span> 
            <span>Enable <strong>&quot;Places API (New)&quot;</strong> and <strong>&quot;Routes API&quot;</strong> as well.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-muted ${className}`}>
      <APIProvider apiKey={apiKey}>
        <div className="flex-1 relative">
          <Map
            defaultCenter={mapCenter}
            defaultZoom={13}
            className="w-full h-full"
            disableDefaultUI={true}
          >
            {selectedLocation && (
              <SafeAdvancedMarker position={selectedLocation.coords}>
                <div className="relative group">
                  <div className="w-8 h-8 bg-[#FF6321] rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                    <MapPin size={16} className="text-white" />
                  </div>
                  <div className="w-2 h-2 bg-[#FF6321] rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r-2 border-b-2 border-white" />
                </div>
              </SafeAdvancedMarker>
            )}
            
            <MapControl position={ControlPosition.TOP_LEFT}>
              <div className="m-4 w-[300px] md:w-[400px]">
                <PlacesAutocomplete 
                  onLocationSelect={(loc) => {
                    setSelectedLocation(loc);
                    setMapCenter(loc.coords);
                  }} 
                  placeholder={placeholder}
                />
              </div>
            </MapControl>

            <MapControl position={ControlPosition.BOTTOM_CENTER}>
              <div className="mb-8 px-4 w-full max-w-md">
                {selectedLocation ? (
                  <div className="bg-card text-card-foreground p-4 rounded-3xl shadow-strong border border-border animate-in slide-in-from-bottom-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-1">Selected Location</p>
                        <p className="text-sm font-bold text-foreground line-clamp-2">{selectedLocation.address}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleConfirm}
                      className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-strong active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Confirm Location
                    </button>
                  </div>
                ) : (
                  <div className="bg-card text-card-foreground/80 backdrop-blur-md p-4 rounded-3xl shadow-soft border border-white/20 text-center">
                    <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium">Search and select a location on the map</p>
                  </div>
                )}
              </div>
            </MapControl>
          </Map>
        </div>
      </APIProvider>
    </div>
  );
}

function PlacesAutocomplete({ onLocationSelect, placeholder }: { onLocationSelect: (loc: LocationData) => void, placeholder: string }) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const places = useMapsLibrary("places");
  const map = useMap();
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (!places || !map) return;
    autocompleteService.current = new places.AutocompleteService();
    placesService.current = new places.PlacesService(map);
  }, [places, map]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (!value || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      { input: value, componentRestrictions: { country: 'ke' } },
      (predictions) => {
        setSuggestions(predictions || []);
      }
    );
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current || !map) return;

    placesService.current.getDetails(
      { placeId: prediction.place_id, fields: ['geometry', 'formatted_address', 'place_id'] },
      (place, status) => {
        if (status === "OK" && place?.geometry?.location) {
          const loc = {
            address: place.formatted_address || prediction.description,
            coords: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            placeId: place.place_id || prediction.place_id
          };
          onLocationSelect(loc);
          setInputValue(loc.address);
          setSuggestions([]);
          map.panTo(loc.coords);
          map.setZoom(16);
        }
      }
    );
  };

  return (
    <div className="relative">
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={16} className="text-muted-foreground group-focus-within:text-indigo-600 transition-colors" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-4 bg-card text-card-foreground border border-border rounded-2xl font-bold text-foreground outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all shadow-strong"
        />
        {inputValue && (
          <button 
            onClick={() => { setInputValue(""); setSuggestions([]); }}
            className="absolute inset-y-0 right-4 flex items-center text-muted-foreground hover:text-muted-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card text-card-foreground rounded-2xl border border-border shadow-strong overflow-hidden z-[1000]">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              onClick={() => handleSelect(s)}
              className="w-full px-6 py-4 text-left hover:bg-muted border-b border-slate-50 last:border-none transition-colors flex items-start gap-3 group"
            >
              <MapPin size={14} className="text-muted-foreground/70 mt-1 group-hover:text-indigo-600 transition-colors" />
              <div>
                <p className="text-sm font-bold text-foreground">{s.structured_formatting.main_text}</p>
                <p className="text-xs text-muted-foreground">{s.structured_formatting.secondary_text}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
