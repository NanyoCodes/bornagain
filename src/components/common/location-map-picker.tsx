
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, Autocomplete, MarkerF, CircleF } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';

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

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);

    const location = form.getValues('location');
    let latitude = form.getValues('latitude');
    let longitude = form.getValues('longitude');
    const radiusValue = form.getValues('coverageRadius');

    if ((!latitude || !longitude) && location && typeof location === 'string' && location.startsWith('Pinned Location')) {
        const match = location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (match) {
            const parsedLat = parseFloat(match[1]);
            const parsedLng = parseFloat(match[2]);
            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                latitude = parsedLat;
                longitude = parsedLng;
                form.setValue('latitude', latitude, { shouldDirty: false });
                form.setValue('longitude', longitude, { shouldDirty: false });
            }
        }
    }


    const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(latitude && longitude ? { lat: latitude, lng: longitude } : null);
    const [center, setCenter] = useState(latitude && longitude ? { lat: latitude, lng: longitude } : fallbackCenter);
    const [inputValue, setInputValue] = useState(location || '');
    const [radius, setRadius] = useState(radiusValue || 1000);

    const geocoderRef = useRef<google.maps.Geocoder>();
    const hasFetchedLocation = useRef(false);

    useEffect(() => {
        if (isLoaded && !geocoderRef.current) {
            geocoderRef.current = new window.google.maps.Geocoder();
        }
    }, [isLoaded]);
    
    // Geocode initial value for the map marker on load (for edit form)
    useEffect(() => {
        const initialLocation = form.getValues('location');
        if (isLoaded && geocoderRef.current && initialLocation && !(form.getValues('latitude') && form.getValues('longitude'))) {
            geocoderRef.current.geocode({ address: initialLocation }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    const newPos = { lat: location.lat(), lng: location.lng() };
                    setMarkerPosition(newPos);
                    setCenter(newPos);
                    form.setValue('latitude', newPos.lat);
                    form.setValue('longitude', newPos.lng);
                    if(map) map.panTo(newPos);
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, map]);


    const updateFormLocation = useCallback((latLng: google.maps.LatLng) => {
        if (!geocoderRef.current) return;
        const newPos = { lat: latLng.lat(), lng: latLng.lng() };
        setCenter(newPos);
        setMarkerPosition(newPos);
        form.setValue('latitude', newPos.lat, { shouldDirty: true });
        form.setValue('longitude', newPos.lng, { shouldDirty: true });

        geocoderRef.current.geocode({ location: newPos }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                const address = results[0].formatted_address;
                setInputValue(address);
                form.setValue('location', address, { shouldDirty: true });
            } else {
                toast({
                    variant: "destructive",
                    title: "Geocoding failed",
                    description: `Could not find an address for this location. Using coordinates instead. Status: ${status}`,
                });
                const pinnedLocation = `Pinned Location (${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)})`;
                setInputValue(pinnedLocation);
                form.setValue('location', pinnedLocation, { shouldDirty: true });
            }
        });
    }, [form, toast]);
    
    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            updateFormLocation(e.latLng);
        }
    }, [updateFormLocation]);
    
    // Get user's current location on initial load for new campaigns
    useEffect(() => {
        const initialLocation = form.getValues('location');
        if (isLoaded && !initialLocation && navigator.geolocation && !hasFetchedLocation.current) {
            hasFetchedLocation.current = true; // Prevent re-fetching
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
                () => {
                    toast({
                        title: 'Location access was denied',
                        description: 'Using default location. You can still search or click on the map.',
                    });
                }
            );
        }
    }, [isLoaded, map, toast, updateFormLocation, form]);


    const onLoadAutocomplete = (autocompleteInstance: google.maps.places.Autocomplete) => {
        setAutocomplete(autocompleteInstance);
    };

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                if (map) {
                    map.panTo(place.geometry.location);
                    map.setZoom(15);
                }
                updateFormLocation(place.geometry.location);
                setInputValue(place.formatted_address || '');
            } else if (place.name) {
                setInputValue(place.name);
                form.setValue('location', place.name, { shouldDirty: true });
            }
        }
    };
    
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
                />
            </Autocomplete>
            <GoogleMap
                mapContainerClassName="h-80 w-full rounded-md"
                center={center}
                zoom={markerPosition ? 14 : 10}
                onLoad={setMap}
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
