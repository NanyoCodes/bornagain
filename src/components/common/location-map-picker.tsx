
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, Autocomplete, MarkerF } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { type ControllerRenderProps } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface LocationMapPickerProps {
    field: ControllerRenderProps<any, string>;
}

const fallbackCenter = {
    lat: 34.0522,
    lng: -118.2437
};

export function LocationMapPicker({ field }: LocationMapPickerProps) {
    const { toast } = useToast();
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
    const [center, setCenter] = useState(fallbackCenter);
    const [inputValue, setInputValue] = useState(field.value || '');

    const geocoderRef = useRef<google.maps.Geocoder>();
    const hasFetchedLocation = useRef(false);

    useEffect(() => {
        if (isLoaded && !geocoderRef.current) {
            geocoderRef.current = new window.google.maps.Geocoder();
        }
    }, [isLoaded]);
    
    // Geocode initial value for the map marker on load (for edit form)
    useEffect(() => {
        if (isLoaded && geocoderRef.current && field.value && !markerPosition) {
            geocoderRef.current.geocode({ address: field.value }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    const newPos = { lat: location.lat(), lng: location.lng() };
                    setMarkerPosition(newPos);
                    setCenter(newPos);
                    if(map) map.panTo(newPos);
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, field.value, map]);

    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng && geocoderRef.current) {
            const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setCenter(newPos);
            setMarkerPosition(newPos);
            geocoderRef.current.geocode({ location: newPos }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    setInputValue(results[0].formatted_address);
                    field.onChange(results[0].formatted_address);
                } else {
                    toast({
                        variant: "destructive",
                        title: "Geocoding failed",
                        description: `Could not find an address for this location. Status: ${status}`,
                    });
                }
            });
        }
    }, [field, toast]);
    
    // Get user's current location on initial load for new campaigns
    useEffect(() => {
        if (isLoaded && !field.value && navigator.geolocation && !hasFetchedLocation.current) {
            hasFetchedLocation.current = true; // Prevent re-fetching
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setCenter(userLocation);
                    if (map) {
                        map.panTo(userLocation);
                        map.setZoom(12);
                        
                        // Create a mock map event to auto-populate the form with current location
                        const mockEvent = {
                            latLng: new window.google.maps.LatLng(userLocation.lat, userLocation.lng)
                        };
                        handleMapClick(mockEvent as google.maps.MapMouseEvent);
                    }
                },
                () => {
                    // Handle error or denial
                    toast({
                        title: 'Location access was denied',
                        description: 'Using default location. You can still search or click on the map.',
                    });
                }
            );
        }
    }, [isLoaded, field.value, map, handleMapClick, toast]);


    const onLoadAutocomplete = (autocompleteInstance: google.maps.places.Autocomplete) => {
        setAutocomplete(autocompleteInstance);
    };

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                const location = place.geometry.location;
                const newPos = { lat: location.lat(), lng: location.lng() };
                if (map) {
                    map.panTo(newPos);
                    map.setZoom(15);
                }
                setCenter(newPos);
                setMarkerPosition(newPos);
                setInputValue(place.formatted_address || '');
                field.onChange(place.formatted_address || '');
            } else if (place.name) {
                // Fallback for places without geometry
                setInputValue(place.name);
                field.onChange(place.name);
            }
        }
    };
    
    const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
        handleMapClick(e);
    }, [handleMapClick]);


    if (!GOOGLE_MAPS_API_KEY) {
        return <div className="text-destructive text-sm p-2 rounded-md border border-destructive/50 bg-destructive/10">Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.</div>;
    }

    if (loadError) {
        let errorMessage = 'Error loading Google Maps. Please check your API key and network connection.';
        if (loadError.message.includes('ApiNotActivatedMapError')) {
            errorMessage = 'Google Maps Error: ApiNotActivatedMapError. Please ensure: 1) "Maps JavaScript API" and "Places API" are enabled. 2) Billing is enabled on your Google Cloud project. 3) Your API key restrictions are configured correctly for this domain.';
        } else if (loadError.message.includes('InvalidKeyMapError')) {
            errorMessage = 'Google Maps Error: Invalid API Key. Please check the key in your .env file.';
        }
        return <div className="text-destructive text-sm p-2 rounded-md border border-destructive/50 bg-destructive/10">{errorMessage}</div>;
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading Maps...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged} fields={['formatted_address', 'geometry', 'name']}>
                <Input
                    placeholder="Search Google Maps or click on the map to pin a location"
                    type="text"
                    className="text-base"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={() => field.onChange(inputValue)}
                />
            </Autocomplete>
            <GoogleMap
                mapContainerClassName="h-80 w-full rounded-md"
                center={center}
                zoom={markerPosition ? 15 : 10}
                onLoad={setMap}
                onClick={handleMapClick}
                options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                }}
            >
                {markerPosition && (
                    <MarkerF
                        position={markerPosition}
                        draggable={true}
                        onDragEnd={handleMarkerDragEnd}
                    />
                )}
            </GoogleMap>
        </div>
    );
}
