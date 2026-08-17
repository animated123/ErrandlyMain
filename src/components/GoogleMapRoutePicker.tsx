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
import { MapPin, Navigation, Clock, Ruler, Loader2, Target, CheckCircle2, AlertTriangle } from 'lucide-react';

interface LocationData {
  address: string;
  coords: google.maps.LatLngLiteral;
  placeId: string;
}

interface RouteSummary {
  distance: string;
  duration: string;
  distanceValue: number; // in meters
  durationValue: number; // in seconds
}

interface GoogleMapRoutePickerProps {
  apiKey: string;
  placesApiKey: string;
  geocodingApiKey?: string;
  mapId?: string;
  onConfirm: (pickup: LocationData, dropoff: LocationData, summary: RouteSummary) => void;
  className?: string;
  mode?: 'route' | 'single';
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

export default function GoogleMapRoutePicker({ 
  apiKey, 
  placesApiKey, 
  geocodingApiKey,
  mapId,
  onConfirm, 
  className, 
  mode = 'route' 
}: GoogleMapRoutePickerProps) {
  const [pickup, setPickup] = useState<LocationData | null>(null);
  const [dropoff, setDropoff] = useState<LocationData | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
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

  const handleRouteCalculated = useCallback((summary: RouteSummary) => {
    setRouteSummary(summary);
  }, []);

  const handleConfirm = () => {
    if (mode === 'single') {
      if (pickup) {
        onConfirm(pickup, pickup, { distance: '0 km', duration: '0 mins', distanceValue: 0, durationValue: 0 });
      }
    } else {
      if (pickup && dropoff && routeSummary) {
        onConfirm(pickup, dropoff, routeSummary);
      }
    }
  };

  const handleLocateMe = async (coords: google.maps.LatLngLiteral) => {
    setMapCenter(coords);
    
    // Reverse geocode to get address for the first input
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${geocodingApiKey || placesApiKey}`);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const locationData: LocationData = {
          address: result.formatted_address,
          coords: coords,
          placeId: result.place_id
        };
        setPickup(locationData);
        if (mode === 'single') {
          setDropoff(locationData);
          setRouteSummary({ distance: '0 km', duration: '0 mins', distanceValue: 0, durationValue: 0 });
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  if (hasMapError || !apiKey || apiKey === 'YOUR_API_KEY' || apiKey.trim() === '') {
    return (
      <div className={`flex flex-col h-full w-full bg-slate-50 border border-slate-200 rounded-[2.5rem] items-center justify-center p-6 text-center shadow-soft ${className}`}>
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
    <div className={`flex flex-col h-full w-full bg-card text-card-foreground overflow-hidden rounded-[2.5rem] border border-border shadow-soft ${className}`}>
      <APIProvider apiKey={apiKey} libraries={['marker', 'geometry']}>
        <div className="relative flex-1 flex flex-col">
          {/* Search Inputs Overlay */}
          <div className="absolute top-6 left-6 right-6 z-10 space-y-3 pointer-events-none">
            <div className="pointer-events-auto">
              <AutocompleteInput 
                label={mode === 'single' ? "Your Location" : "Pickup Location"} 
                placeholder={mode === 'single' ? "Where is the laundry?" : "Where should the runner start?"} 
                onPlaceSelect={(data) => {
                  setPickup(data);
                  if (mode === 'single') {
                    setDropoff(data);
                    setRouteSummary({ distance: '0 km', duration: '0 mins', distanceValue: 0, durationValue: 0 });
                  }
                }}
                icon={<MapPin className="text-indigo-600" size={16} />}
                apiKey={placesApiKey}
                initialValue={pickup?.address}
              />
            </div>
            {mode === 'route' && (
              <div className="pointer-events-auto">
                <AutocompleteInput 
                  label="Drop-off Destination" 
                  placeholder="Where is the errand going?" 
                  onPlaceSelect={(data) => setDropoff(data)}
                  icon={<Target className="text-rose-600" size={16} />}
                  apiKey={placesApiKey}
                  initialValue={dropoff?.address}
                />
              </div>
            )}
          </div>

          {/* Map Area */}
          <div className="flex-1 relative">
            <Map
              center={mapCenter}
              onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
              defaultZoom={13}
              mapId={mapId}
              disableDefaultUI={true}
              className="w-full h-full"
            >
              {mode === 'route' && (
                <Directions 
                  pickup={pickup} 
                  dropoff={dropoff} 
                  onRouteCalculated={handleRouteCalculated} 
                  apiKey={apiKey}
                />
              )}
              
              {pickup && (
                <SafeAdvancedMarker position={pickup.coords}>
                  <div className="relative group">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                      <MapPin size={16} className="text-white" />
                    </div>
                    <div className="w-2 h-2 bg-indigo-600 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r-2 border-b-2 border-white" />
                  </div>
                </SafeAdvancedMarker>
              )}
              
              {mode === 'route' && dropoff && (
                <SafeAdvancedMarker position={dropoff.coords}>
                  <div className="relative group">
                    <div className="w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                      <MapPin size={16} className="text-white" />
                    </div>
                    <div className="w-2 h-2 bg-rose-600 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r-2 border-b-2 border-white" />
                  </div>
                </SafeAdvancedMarker>
              )}

              <MapControl position={ControlPosition.RIGHT_BOTTOM}>
                <div className="m-4 flex flex-col gap-2">
                  <LocateMeButton onLocate={handleLocateMe} />
                </div>
              </MapControl>
            </Map>

            {/* Route Summary Card */}
            {mode === 'route' && routeSummary && (
              <div className="absolute bottom-24 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-card text-card-foreground/90 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black tracking-normal font-medium text-muted-foreground">Errand Summary</h3>
                  <div className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-black tracking-normal font-medium">Optimal Route</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Ruler size={14} />
                      <span className="text-sm font-bold uppercase tracking-wider">Distance</span>
                    </div>
                    <p className="text-lg font-black text-foreground">{routeSummary.distance}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock size={14} />
                      <span className="text-sm font-bold uppercase tracking-wider">Est. Time</span>
                    </div>
                    <p className="text-lg font-black text-foreground">{routeSummary.duration}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="absolute bottom-6 left-6 right-6">
              <button
                onClick={handleConfirm}
                disabled={mode === 'single' ? !pickup : (!pickup || !dropoff || !routeSummary)}
                className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 ${
                  (mode === 'single' ? pickup : (pickup && dropoff && routeSummary))
                    ? 'bg-black text-white active:scale-95 hover:shadow-indigo-500/20'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed'
                }`}
              >
                {(mode === 'single' ? pickup : (pickup && dropoff && routeSummary)) ? (
                  <>
                    Confirm Location Details
                    <CheckCircle2 size={16} />
                  </>
                ) : (
                  'Select Location to Continue'
                )}
              </button>
            </div>
          </div>
        </div>
      </APIProvider>
    </div>
  );
}

function AutocompleteInput({ label, placeholder, onPlaceSelect, icon, apiKey, initialValue }: { 
  label: string; 
  placeholder: string; 
  onPlaceSelect: (data: LocationData) => void;
  icon: React.ReactNode;
  apiKey: string;
  initialValue?: string;
}) {
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
          includedRegionCodes: ['ke'],
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
    setInputValue(suggestion.placePrediction.text.text);
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
        address: data.formattedAddress,
        coords: {
          lat: data.location.latitude,
          lng: data.location.longitude
        },
        placeId: data.id
      });
    } catch (error) {
      console.error('Place details error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative bg-card text-card-foreground/80 backdrop-blur-md p-1 rounded-2xl border border-white/20 shadow-xl overflow-visible group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
      <div className="flex items-center px-4 py-3 gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-0.5">{label}</p>
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
              className="w-full bg-transparent border-none p-0 font-black text-foreground text-sm placeholder:text-muted-foreground/70 outline-none"
            />
            {loading ? (
              <Loader2 size={14} className="animate-spin text-indigo-600" />
            ) : (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      async (position) => {
                        const coords = {
                          lat: position.coords.latitude,
                          lng: position.coords.longitude
                        };
                        try {
                          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}`);
                          const text = await response.text();
                          const data = text ? JSON.parse(text) : {};
                          if (data.results && data.results.length > 0) {
                            const result = data.results[0];
                            onPlaceSelect({
                              address: result.formatted_address,
                              coords: coords,
                              placeId: result.place_id
                            });
                          }
                        } catch (error) {
                          console.error('Reverse geocoding error:', error);
                        }
                      },
                      (err) => {
                        console.error('Geolocation error in Autocomplete:', err.message);
                        alert('Could not get your location. Please check browser permissions.');
                      }
                    );
                  }
                }}
                className="p-1.5 hover:bg-secondary rounded-lg text-indigo-600 transition-colors"
                title="Use My Location"
              >
                <Navigation size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSelect(s)}
              className="w-full px-5 py-3 text-left hover:bg-muted transition-colors border-b border-slate-50 last:border-none flex items-start gap-3"
            >
              <MapPin size={14} className="text-muted-foreground/70 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-black text-foreground">{s.placePrediction.text.text}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Directions({ pickup, dropoff, onRouteCalculated, apiKey }: { 
  pickup: LocationData | null; 
  dropoff: LocationData | null;
  onRouteCalculated: (summary: RouteSummary) => void;
  apiKey: string;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!pickup || !dropoff || !map) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    const fetchRoute = async () => {
      try {
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: pickup.coords.lat,
                  longitude: pickup.coords.lng
                }
              }
            },
            destination: {
              location: {
                latLng: {
                  latitude: dropoff.coords.lat,
                  longitude: dropoff.coords.lng
                }
              }
            },
            travelMode: 'DRIVE',
            computeAlternativeRoutes: false,
          }),
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        if (!response.ok) {
          console.error('Routes API Error Details:', data);
          throw new Error(data.error?.message || 'Failed to fetch route');
        }
        
        if (!data.routes || data.routes.length === 0) {
          console.warn('No routes found in API response');
          return;
        }

        const route = data.routes[0];

        if (route) {
          // Decode polyline
          const path = google.maps.geometry.encoding.decodePath(route.polyline.encodedPolyline);
          
          if (polylineRef.current) polylineRef.current.setMap(null);
          
          const newPolyline = new google.maps.Polyline({
            path,
            map,
            strokeColor: '#4f46e5',
            strokeWeight: 5,
            strokeOpacity: 0.8
          });
          
          polylineRef.current = newPolyline;

          // Calculate summary
          const distanceMeters = route.distanceMeters;
          const durationSeconds = parseInt(route.duration.replace('s', ''));
          
          onRouteCalculated({
            distance: (distanceMeters / 1000).toFixed(1) + ' km',
            duration: Math.round(durationSeconds / 60) + ' mins',
            distanceValue: distanceMeters,
            durationValue: durationSeconds
          });

          // Fit bounds
          const bounds = new google.maps.LatLngBounds();
          path.forEach(p => bounds.extend(p));
          map.fitBounds(bounds, 100);
        }
      } catch (error) {
        console.error('Routes error:', error);
      }
    };

    fetchRoute();
  }, [pickup, dropoff, map, apiKey, onRouteCalculated]);

  // Cleanup polyline on unmount
  useEffect(() => {
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, []);

  return null;
}

function LocateMeButton({ onLocate }: { onLocate: (coords: google.maps.LatLngLiteral) => void }) {
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          onLocate(coords);
          setLocating(false);
        },
        (err) => {
          setLocating(false);
          console.error('Geolocation error in LocateMe:', err.message);
          alert('Could not get your location. Please check permissions.');
        }
      );
    }
  };

  return (
    <button
      onClick={handleLocate}
      className="w-12 h-12 bg-card text-card-foreground rounded-2xl shadow-xl border border-border flex items-center justify-center text-muted-foreground hover:text-indigo-600 transition-colors active:scale-90"
    >
      {locating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
    </button>
  );
}
