import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  Marker,
  useApiLoadingStatus
} from '@vis.gl/react-google-maps';
import { 
  Waves, 
  ShoppingBag, 
  Home, 
  Package, 
  Car, 
  ShoppingCart, 
  Sparkles,
  User,
  MapPin,
  CheckCircle2,
  Navigation,
  AlertTriangle
} from 'lucide-react';
import { Errand, User as UserType, Coordinates, ErrandStatus, PropertyListing, ErrandCategory } from '../../types';

interface MapComponentProps {
  errands: Errand[];
  runners: UserType[];
  center?: Coordinates;
  zoom?: number;
  onSelectErrand?: (errand: Errand) => void;
  onSelectProperty?: (property: PropertyListing) => void;
  apiKey: string;
  routesApiKey?: string;
  mapId?: string;
  showRoute?: boolean;
  travelMode?: 'DRIVE' | 'WALK';
  customRoute?: { origin: Coordinates; destination: Coordinates };
  onRouteCalculated?: (summary: { distance: string; duration: string }) => void;
}

// Detect blocked map/marker target errors globally to gracefully fallback to standard markers
if (typeof window !== 'undefined') {
  // Intercept console.error to detect ApiTargetBlockedMapError or similar
  const originalError = console.error;
  console.error = function (...args: any[]) {
    const errorStr = args.join(' ');
    if (
      errorStr.includes('ApiTargetBlockedMapError') || 
      errorStr.includes('BlockedMapType') || 
      errorStr.includes('api-target-blocked')
    ) {
      (window as any).__googleMapsAdvancedMarkersBlocked = true;
      window.dispatchEvent(new CustomEvent('advanced-markers-blocked'));
    }
    originalError.apply(console, args);
  };

  // Intercept window errors (such as getRootNode) to flag blocked advanced markers
  window.addEventListener('error', (event) => {
    if (event.error && (
      event.error.message?.includes('getRootNode') || 
      event.error.message?.includes('AdvancedMarker')
    )) {
      (window as any).__googleMapsAdvancedMarkersBlocked = true;
      window.dispatchEvent(new CustomEvent('advanced-markers-blocked'));
    }
  });
}

class MarkerErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    if (typeof window !== 'undefined') {
      (window as any).__googleMapsAdvancedMarkersBlocked = true;
      window.dispatchEvent(new CustomEvent('advanced-markers-blocked'));
    }
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("AdvancedMarker failed, falling back to standard Marker:", error, errorInfo);
    if (typeof window !== 'undefined') {
      (window as any).__googleMapsAdvancedMarkersBlocked = true;
      window.dispatchEvent(new CustomEvent('advanced-markers-blocked'));
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function SafeAdvancedMarker({ mapId, ...props }: any) {
  const status = useApiLoadingStatus();
  const map = useMap();
  const [hasFallback, setHasFallback] = useState(false);
  
  useEffect(() => {
    if ((window as any).__googleMapsAdvancedMarkersBlocked) {
      setHasFallback(true);
    }
    const handleGlobalError = () => {
      if ((window as any).__googleMapsAdvancedMarkersBlocked) {
        setHasFallback(true);
      }
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('advanced-markers-blocked', handleGlobalError);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('advanced-markers-blocked', handleGlobalError);
    };
  }, []);
  
  if (status !== 'LOADED' || !map || typeof map.getDiv !== 'function' || !map.getDiv()) {
    return null;
  }

  const isAdvancedMarkerSupported = mapId && !hasFallback && typeof window !== 'undefined' && 
    window.google && 
    window.google.maps && 
    window.google.maps.marker && 
    window.google.maps.marker.AdvancedMarkerElement;

  if (!isAdvancedMarkerSupported) {
    return <Marker position={props.position} onClick={props.onClick} />;
  }

  return (
    <MarkerErrorBoundary fallback={<Marker position={props.position} onClick={props.onClick} />}>
      <AdvancedMarker {...props} />
    </MarkerErrorBoundary>
  );
}

function Directions({ origin, destination, apiKey, travelMode = 'DRIVE', onRouteCalculated }: { 
  origin: Coordinates; 
  destination: Coordinates;
  apiKey: string;
  travelMode?: 'DRIVE' | 'WALK';
  onRouteCalculated?: (summary: { distance: string; duration: string }) => void;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!origin || !destination || !map) {
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
                  latitude: origin.lat,
                  longitude: origin.lng
                }
              }
            },
            destination: {
              location: {
                latLng: {
                  latitude: destination.lat,
                  longitude: destination.lng
                }
              }
            },
            travelMode: travelMode,
            computeAlternativeRoutes: false,
          }),
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        if (!response.ok) {
          console.error('Routes API Error Details:', data);
          return;
        }
        
        if (!data.routes || data.routes.length === 0) {
          console.warn('No routes found in API response');
          return;
        }

        const route = data.routes[0];

        if (route) {
          if (onRouteCalculated) {
            const durationSeconds = Number(route.duration.replace('s', ''));
            onRouteCalculated({
              distance: (route.distanceMeters / 1000).toFixed(1) + ' km',
              duration: durationSeconds / 60 < 60 
                ? Math.round(durationSeconds / 60) + ' mins'
                : Math.floor(durationSeconds / 3600) + 'h ' + Math.round((durationSeconds % 3600) / 60) + 'm'
            });
          }

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
  }, [origin, destination, map, apiKey, travelMode, onRouteCalculated]);

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

function MapHandler({ center, zoom, active }: { center: google.maps.LatLngLiteral; zoom: number; active: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !active || !center) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center, center.lat, center.lng, zoom, active]);

  return null;
}

export default function MapComponent({ 
  errands, 
  runners, 
  center, 
  zoom = 13, 
  onSelectErrand, 
  onSelectProperty,
  apiKey, 
  routesApiKey,
  mapId,
  showRoute = false,
  travelMode = 'DRIVE',
  customRoute,
  onRouteCalculated
}: MapComponentProps) {
  const [selectedMarker, setSelectedMarker] = useState<{ type: 'errand' | 'runner' | 'property', id: string } | null>(null);
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

  const mapCenter = (center && typeof center.lat === 'number' && typeof center.lng === 'number') 
    ? { lat: center.lat, lng: center.lng } 
    : { lat: -1.286389, lng: 36.817223 }; // Default to Nairobi

  const singleErrand = errands.length === 1 ? errands[0] : null;
  
  let routeToDisplay = null;
  if (showRoute) {
    if (customRoute) {
      routeToDisplay = customRoute;
    } else if (singleErrand && singleErrand.pickupCoordinates && singleErrand.dropoffCoordinates) {
      routeToDisplay = { origin: singleErrand.pickupCoordinates, destination: singleErrand.dropoffCoordinates };
    }
  }

  const getStatusColor = (status: ErrandStatus) => {
    switch (status) {
      case ErrandStatus.PENDING:
      case ErrandStatus.BIDDING:
        return '#3b82f6'; // Blue
      case ErrandStatus.ASSIGNED:
      case ErrandStatus.IN_PROGRESS:
      case ErrandStatus.ACCEPTED:
        return '#10b981'; // Green
      case ErrandStatus.VERIFYING:
      case ErrandStatus.REVIEW:
        return '#eab308'; // Yellow
      case ErrandStatus.COMPLETED:
        return '#94a3b8'; // Gray
      case ErrandStatus.CANCELLED:
      case ErrandStatus.FAILED:
        return '#ef4444'; // Red
      default:
        return '#4f46e5'; // Indigo (Default)
    }
  };

  const getCategoryIcon = (category: ErrandCategory) => {
    switch (category) {
      case ErrandCategory.MAMA_FUA: return Waves;
      case ErrandCategory.MARKET_SHOPPING: return ShoppingBag;
      case ErrandCategory.HOUSE_HUNTING: return Home;
      case ErrandCategory.PACKAGE_DELIVERY: return Package;
      case ErrandCategory.TOWN_SERVICE: return Car;
      case ErrandCategory.SHOPPING: return ShoppingCart;
      case ErrandCategory.GIKOMBA_STRAWS: return ShoppingBag;
      default: return Sparkles;
    }
  };

  if (hasMapError || !apiKey || apiKey === 'YOUR_API_KEY' || apiKey.trim() === '') {
    return (
      <div className="w-full h-full min-h-[400px] rounded-[2.5rem] bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-6 text-center shadow-soft">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-amber-500 border border-amber-200">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-800 mb-2 tracking-tight font-display">Google Maps Action Required</h3>
        <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
          {(!apiKey || apiKey === 'YOUR_API_KEY' || apiKey?.trim() === '') ? 
            "API key is missing. Please add a valid VITE_GOOGLE_MAPS_API_KEY in your settings to view the map." : 
            "Your API key was loaded, but the 'Maps JavaScript API' is not enabled in your Google Cloud Project."
          }
        </p>
        <div className="bg-white rounded-2xl border border-slate-150 p-4 text-left max-w-md w-full shadow-sm text-xs font-semibold text-slate-700 space-y-2 font-sans">
          <p className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Setup Instruction Steps:</p>
          <div className="flex gap-2">
            <span className="font-extrabold text-indigo-600">1.</span> 
            <span>Open <a hRef="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-600 hover:text-indigo-700">Google Cloud Console</a>.</span>
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
            <span>Also enable <strong>&quot;Places API (New)&quot;</strong> and <strong>&quot;Routes API&quot;</strong> for full functionality.</span>
          </div>
        </div>
        <div className="mt-6 text-slate-400 text-[10px] font-mono leading-tight">
          Error signature: Google Maps API loading failed
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[400px] rounded-[2.5rem] overflow-hidden shadow-soft border border-border bg-muted relative">
      <APIProvider apiKey={apiKey} libraries={['marker', 'geometry']}>
        <Map
          key="main-map"
          defaultCenter={mapCenter}
          defaultZoom={zoom}
          disableDefaultUI={false}
          gestureHandling={'greedy'}
          className="w-full h-full"
          mapId={mapId}
        >
          <MapHandler center={mapCenter} zoom={zoom} active={!routeToDisplay} />
          
          {routeToDisplay && (
            <Directions 
              origin={routeToDisplay.origin} 
              destination={routeToDisplay.destination} 
              apiKey={routesApiKey || apiKey} 
              travelMode={travelMode}
              onRouteCalculated={onRouteCalculated}
            />
          )}

          {errands.map((errand) => {
            const CategoryIcon = getCategoryIcon(errand.category);
            return errand.pickupCoordinates && typeof errand.pickupCoordinates.lat === 'number' && typeof errand.pickupCoordinates.lng === 'number' && (
              <React.Fragment key={`errand-${errand.id}`}>
                <SafeAdvancedMarker
                  mapId={mapId}
                  position={{ lat: errand.pickupCoordinates.lat, lng: errand.pickupCoordinates.lng }}
                  onClick={() => {
                    setSelectedMarker({ type: 'errand', id: errand.id });
                    onSelectErrand?.(errand);
                  }}
                >
                  <div className="relative group">
                    <div 
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white transition-all group-hover:scale-110 group-hover:-translate-y-1"
                      style={{ backgroundColor: getStatusColor(errand.status) }}
                    >
                      <CategoryIcon size={20} className="text-white" />
                    </div>
                    {/* Pointer arrow */}
                    <div 
                      className="w-3 h-3 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r-2 border-b-2 border-white"
                      style={{ backgroundColor: getStatusColor(errand.status) }}
                    />
                  </div>
                </SafeAdvancedMarker>
                {selectedMarker?.type === 'errand' && selectedMarker.id === errand.id && (
                  <InfoWindow
                    position={{ lat: errand.pickupCoordinates.lat, lng: errand.pickupCoordinates.lng }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-1">
                      <p className="text-sm font-black tracking-normal font-medium text-foreground mb-1">{errand.title}</p>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">Ksh {(errand.budget || 0).toLocaleString()}</p>
                    </div>
                  </InfoWindow>
                )}
              </React.Fragment>
            );
          })}

          {singleErrand?.dropoffCoordinates && (
            <SafeAdvancedMarker
              mapId={mapId}
              position={{ lat: singleErrand.dropoffCoordinates.lat, lng: singleErrand.dropoffCoordinates.lng }}
            >
              <div className="relative group">
                <div className="w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                  <MapPin size={16} className="text-white" />
                </div>
                <div className="w-2 h-2 bg-rose-600 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r-2 border-b-2 border-white" />
              </div>
            </SafeAdvancedMarker>
          )}

          {/* Property Listings Pins */}
          {errands.map(errand => 
            errand.propertyListings?.map(listing => (
              listing.coords && (
                <React.Fragment key={`property-${listing.id}`}>
                  <SafeAdvancedMarker
                    mapId={mapId}
                    position={{ lat: listing.coords.lat, lng: listing.coords.lng }}
                    onClick={() => {
                      setSelectedMarker({ type: 'property', id: listing.id });
                      onSelectProperty?.(listing);
                    }}
                  >
                    <div className="relative group">
                      <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-xl border-2 border-white transition-all group-hover:scale-110">
                        <Home size={18} className="text-white" />
                      </div>
                      <div className="w-2 h-2 bg-amber-500 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r-2 border-b-2 border-white" />
                    </div>
                  </SafeAdvancedMarker>
                  {selectedMarker?.type === 'property' && selectedMarker.id === listing.id && (
                    <InfoWindow
                      position={{ lat: listing.coords.lat, lng: listing.coords.lng }}
                      onCloseClick={() => setSelectedMarker(null)}
                    >
                      <div className="p-1 min-w-[100px]">
                        <p className="text-sm font-black tracking-normal font-medium text-foreground mb-1">{listing.title}</p>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-tighter">Ksh {(listing.price || 0).toLocaleString()}</p>
                        <img src={listing.imageUrl} alt={listing.title} className="w-full h-12 object-cover rounded-md mt-1" />
                      </div>
                    </InfoWindow>
                  )}
                </React.Fragment>
              )
            ))
          )}

          {runners.map((runner) => (
            runner.lastKnownLocation && typeof runner.lastKnownLocation.lat === 'number' && typeof runner.lastKnownLocation.lng === 'number' && (
              <React.Fragment key={`runner-${runner.id}`}>
                <SafeAdvancedMarker
                  mapId={mapId}
                  position={{ lat: runner.lastKnownLocation.lat, lng: runner.lastKnownLocation.lng }}
                  onClick={() => setSelectedMarker({ type: 'runner', id: runner.id })}
                >
                  <div className="relative group">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white overflow-hidden transition-all group-hover:scale-110">
                      {runner.avatar ? (
                        <img src={runner.avatar} className="w-full h-full object-cover" alt={runner.name} />
                      ) : (
                        <User size={20} className="text-white" />
                      )}
                    </div>
                    <div className="w-3 h-3 bg-indigo-600 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r-2 border-b-2 border-white" />
                  </div>
                </SafeAdvancedMarker>
                {selectedMarker?.type === 'runner' && selectedMarker.id === runner.id && (
                  <InfoWindow
                    position={{ lat: runner.lastKnownLocation.lat, lng: runner.lastKnownLocation.lng }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-1">
                      <p className="text-sm font-black tracking-normal font-medium text-foreground mb-1">{runner.name}</p>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Active Runner</p>
                    </div>
                  </InfoWindow>
                )}
              </React.Fragment>
            )
          ))}
        </Map>
      </APIProvider>

      <div className="absolute bottom-6 right-6 z-[10] bg-card text-card-foreground/90 backdrop-blur-md p-4 rounded-2xl border border-border shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-xs font-black tracking-normal font-medium text-muted-foreground">Pending/Bidding</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          <span className="text-xs font-black tracking-normal font-medium text-muted-foreground">Active/Accepted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="text-xs font-black tracking-normal font-medium text-muted-foreground">Verifying</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <span className="text-xs font-black tracking-normal font-medium text-muted-foreground">Houses Found</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
          <span className="text-xs font-black tracking-normal font-medium text-muted-foreground">Runners</span>
        </div>
      </div>
    </div>
  );
}
