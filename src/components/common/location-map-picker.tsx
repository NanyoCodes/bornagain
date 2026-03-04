'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, MarkerF, CircleF, Autocomplete } from '@react-google-maps/api';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface LocationMapPickerProps {
    form: UseFormReturn<any>;
}

const fallbackCenter = {
    lat: 34.0522,
    lng: -118.2437
};

export function LocationMapPicker({ form }: LocationMapPickerProps) {
    const { toast } = useToast();
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });
    
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const searchBoxRef = useRef<HTMLDivElement>(null);
    const [geocodingError, setGeocodingError] = useState<string | null>(null);

    const latitude = form.getValues('latitude');
    const longitude = form.getValues('longitude');
    const radiusValue = form.getValues('coverageRadius');

    const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(latitude && longitude ? { lat: latitude, lng: longitude } : null);
    const [center, setCenter] = useState(latitude && longitude ? { lat: latitude, lng: longitude } : fallbackCenter);
    const [radius, setRadius] = useState(radiusValue || 1000);
    const [inputValue, setInputValue] = useState(form.getValues('location') || '');


    const geocoderRef = useRef<google.maps.Geocoder>();
    const hasFetchedLocation = useRef(false);

    useEffect(() => {
        if (isLoaded && !geocoderRef.current) {
            geocoderRef.current = new window.google.maps.Geocoder();
        }
    }, [isLoaded]);
    
    const watchedLocation = form.watch('location');
    useEffect(() => {
        // Sync local state if form value changes from an external source (e.g. map click)
        if (watchedLocation !== inputValue) {
            setInputValue(watchedLocation || '');
        }
    }, [watchedLocation, inputValue]);

    const updateFormLocation = useCallback((latLng: google.maps.LatLng) => {
        if (!geocoderRef.current) return;
        const newPos = { lat: latLng.lat(), lng: latLng.lng() };
        setCenter(newPos);
        setMarkerPosition(newPos);
        form.setValue('latitude', newPos.lat, { shouldDirty: true });
        form.setValue('longitude', newPos.lng, { shouldDirty: true });

        geocoderRef.current.geocode({ location: newPos }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                setGeocodingError(null);
                const address = results[0].formatted_address;
                form.setValue('location', address, { shouldDirty: true, shouldValidate: true });
                setInputValue(address);
            } else {
                let errorMessage = `Could not find an address for this location. You can set it manually. (Status: ${status})`;
                if (status === 'REQUEST_DENIED') {
                    errorMessage = "Geocoding API Error: This service may not be enabled on your API key. Please enable the 'Geocoding API' in your Google Cloud Console to automatically find addresses when clicking the map.";
                } else if (status === 'OVER_QUERY_LIMIT') {
                    errorMessage = "API Limit Reached: You have exceeded your usage quota for the Geocoding API.";
                }
                setGeocodingError(errorMessage);

                const pinnedLocation = `Pinned Location (${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)})`;
                form.setValue('location', pinnedLocation, { shouldDirty: true, shouldValidate: true });
                setInputValue(pinnedLocation);
            }
        });
    }, [form]);
    
    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            updateFormLocation(e.latLng);
        }
    }, [updateFormLocation]);
    
    // This effect runs once to set an initial location if none is provided.
    useEffect(() => {
        const initialLocation = form.getValues('location');
        if (isLoaded && !initialLocation && navigator.geolocation && !hasFetchedLocation.current) {
            hasFetchedLocation.current = true;
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    const userLatLng = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
                    setCenter(userLocation);
                    updateFormLocation(userLatLng);
                    if (map) {
                        map.panTo(userLocation);
                        map.setZoom(14);
                    }
                },
                () => { /* Fail silently */ }
            );
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, map]);

    // This effect syncs the map to the form state
    const watchedLat = form.watch('latitude');
    const watchedLng = form.watch('longitude');

    useEffect(() => {
        if (watchedLat && watchedLng) {
            const newPos = { lat: watchedLat, lng: watchedLng };
            if (map && (newPos.lat !== center.lat || newPos.lng !== center.lng)) {
                map.panTo(newPos);
            }
            setCenter(newPos);
            setMarkerPosition(newPos);
        }
    }, [watchedLat, watchedLng, center.lat, center.lng, map]);

    
    const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            updateFormLocation(e.latLng);
        }
    }, [updateFormLocation]);

    const handleSliderChange = (value: number[]) => {
        setRadius(value[0]);
        form.setValue('coverageRadius', value[0], { shouldDirty: true });
    };

    const formatRadius = (value: number) => {
        if (value < 1000) return `${value}m`;
        return `${(value / 1000).toFixed(1)}km`;
    }

    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
        if (searchBoxRef.current) {
            mapInstance.controls[window.google.maps.ControlPosition.TOP_CENTER].push(
                searchBoxRef.current
            );
        }
    }, []);

    const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
        setAutocomplete(autocompleteInstance);
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        form.setValue('location', e.target.value, { shouldDirty: true });
    }

    const onPlaceChanged = () => {
        if (autocomplete !== null) {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                setGeocodingError(null);
                const newPos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                const address = place.formatted_address || place.name || '';
                
                // Update local state for input
                setInputValue(address);

                // Update form
                form.setValue('latitude', newPos.lat, { shouldDirty: true });
                form.setValue('longitude', newPos.lng, { shouldDirty: true });
                form.setValue('location', address, { shouldDirty: true, shouldValidate: true });

                // Update map
                if (map) {
                    map.panTo(newPos);
                    map.setZoom(14);
                }
                setCenter(newPos);
                setMarkerPosition(newPos);
            } else {
                 toast({
                    variant: "destructive",
                    title: "Location not found",
                    description: "Please select a valid location from the dropdown suggestions.",
                });
            }
        }
    };


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
            <div className="flex items-center justify-center h-80 w-full rounded-md border bg-background">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <span>Loading Map...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             {/* This div is positioned by the Google Map onLoad callback. It also holds the Autocomplete component. */}
             <div ref={searchBoxRef} className="w-full max-w-sm sm:max-w-md px-4 pt-4">
                <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    fields={['formatted_address', 'name', 'geometry.location']}
                    types={['geocode']}
                >
                    <Input
                        type="text"
                        placeholder="Search for a location..."
                        className="text-base shadow-lg"
                        value={inputValue}
                        onChange={handleInputChange}
                    />
                </Autocomplete>
            </div>
            
            <GoogleMap
                mapContainerClassName="h-80 w-full rounded-md"
                center={center}
                zoom={markerPosition ? 14 : 10}
                onLoad={onMapLoad}
                onClick={handleMapClick}
                options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                }}
            >
                {markerPosition && (
                    <>
                        <MarkerF
                            position={markerPosition}
                            draggable={true}
                            onDragEnd={handleMarkerDragEnd}
                        />
                        <CircleF
                            center={markerPosition}
                            radius={radius}
                            options={{
                                strokeColor: '#3b82f6',
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                                fillColor: '#3b82f6',
                                fillOpacity: 0.2,
                            }}
                        />
                    </>
                )}
            </GoogleMap>
            
            {geocodingError && (
                <div className="text-destructive text-sm p-3 rounded-md border border-destructive/50 bg-destructive/10">
                    {geocodingError}
                </div>
            )}

            <div className='space-y-2'>
                <div className='flex justify-between items-center'>
                    <Label htmlFor="coverage-slider">Coverage Radius</Label>
                    <span className="text-sm font-medium text-muted-foreground">{formatRadius(radius)}</span>
                </div>
                <Slider
                    id="coverage-slider"
                    min={100}
                    max={50000}
                    step={100}
                    value={[radius]}
                    onValueChange={handleSliderChange}
                    disabled={!markerPosition}
                />
            </div>
        </div>
    );
}
