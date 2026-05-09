'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, MarkerF, CircleF, Autocomplete } from '@react-google-maps/api';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, LocateFixed, Map as MapIcon, AlertTriangle } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '../ui/button';


const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const isValidKey = (key: string | undefined) => !!(key && key.startsWith('AIza') && key.length > 20);

interface LocationMapPickerProps {
    form: UseFormReturn<any>;
}

const fallbackCenter = {
    lat: 34.0522,
    lng: -118.2437
};

function LocationMapPickerInner({ 
    form, 
    inputValue, 
    setInputValue, 
    markerPosition, 
    setMarkerPosition,
    center,
    setCenter,
    radius,
    setRadius
}: LocationMapPickerProps & { 
    inputValue: string; 
    setInputValue: (v: string) => void;
    markerPosition: google.maps.LatLngLiteral | null;
    setMarkerPosition: React.Dispatch<React.SetStateAction<google.maps.LatLngLiteral | null>>;
    center: google.maps.LatLngLiteral;
    setCenter: React.Dispatch<React.SetStateAction<google.maps.LatLngLiteral>>;
    radius: number;
    setRadius: (v: number) => void;
}) {
    const { toast } = useToast();
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });
    
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const searchBoxRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();
    const geocoderRef = useRef<google.maps.Geocoder>(null);
    const hasFetchedLocation = useRef(false);

    useEffect(() => {
        if (isLoaded && !geocoderRef.current) {
            geocoderRef.current = new window.google.maps.Geocoder();
        }
    }, [isLoaded]);

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
                form.setValue('location', address, { shouldDirty: true, shouldValidate: true });
                setInputValue(address);
            } else {
                const pinnedLocation = `Pinned Location (${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)})`;
                form.setValue('location', pinnedLocation, { shouldDirty: true, shouldValidate: true });
                setInputValue(pinnedLocation);
            }
        });
    }, [form, setCenter, setMarkerPosition, setInputValue]);
    
    const handleGeolocate = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    const userLatLng = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
                    updateFormLocation(userLatLng);
                    if (map) {
                        map.panTo(userLocation);
                        map.setZoom(14);
                    }
                    toast({ title: 'Location Updated' });
                },
                () => {
                    toast({ variant: 'destructive', title: 'Geolocation Failed' });
                }
            );
        }
    }, [map, updateFormLocation, toast]);
    
    useEffect(() => {
        if (isLoaded && !form.getValues('location') && navigator.geolocation && !hasFetchedLocation.current) {
            hasFetchedLocation.current = true;
            handleGeolocate();
        }
    }, [isLoaded, handleGeolocate, form]);

    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            updateFormLocation(e.latLng);
        }
    }, [updateFormLocation]);
    
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
        if (!isMobile && searchBoxRef.current) {
            mapInstance.controls[window.google.maps.ControlPosition.TOP_CENTER].push(
                searchBoxRef.current
            );
        }
    }, [isMobile]);

    const onPlaceChanged = () => {
        if (autocomplete !== null) {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                const newPos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                const address = place.formatted_address || place.name || '';
                
                setInputValue(address);
                form.setValue('latitude', newPos.lat, { shouldDirty: true });
                form.setValue('longitude', newPos.lng, { shouldDirty: true });
                form.setValue('location', address, { shouldDirty: true, shouldValidate: true });

                if (map) {
                    map.panTo(newPos);
                    map.setZoom(14);
                }
                setCenter(newPos);
                setMarkerPosition(newPos);
            }
        }
    };

    if (loadError) {
        return (
            <div className="space-y-4">
                <Input
                    placeholder="Enter address manually..."
                    className="text-base"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        form.setValue('location', e.target.value, { shouldDirty: true });
                    }}
                />
                <div className="h-60 w-full rounded-md bg-muted/50 flex flex-col items-center justify-center p-6 border-2 border-dashed">
                    <MapIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-80 w-full rounded-md border bg-muted animate-pulse">
                <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    const searchInputEl = (
        <div className="relative">
            <Autocomplete
                onLoad={(a) => setAutocomplete(a)}
                onPlaceChanged={onPlaceChanged}
                fields={['formatted_address', 'name', 'geometry.location']}
                types={['geocode']}
            >
                <Input
                    type="text"
                    placeholder="Search for a location..."
                    className="text-base shadow-lg pr-10"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        form.setValue('location', e.target.value, { shouldDirty: true });
                    }}
                />
            </Autocomplete>
            <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={handleGeolocate}
            >
                <LocateFixed className="h-4 w-4" />
            </Button>
        </div>
    );

    return (
        <div className="space-y-4">
             {isMobile ? <div className="w-full">{searchInputEl}</div> : (
                <div ref={searchBoxRef} className="w-full max-w-sm sm:max-w-md px-4 pt-4">{searchInputEl}</div>
             )}
            
            <GoogleMap
                mapContainerClassName="h-80 w-full rounded-md"
                center={center}
                zoom={markerPosition ? 14 : 10}
                onLoad={onMapLoad}
                onUnmount={() => setMap(null)}
                onClick={handleMapClick}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
                {markerPosition && (
                    <>
                        <MarkerF position={markerPosition} draggable={true} onDragEnd={handleMarkerDragEnd} />
                        <CircleF
                            center={markerPosition}
                            radius={radius}
                            options={{ strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 }}
                        />
                    </>
                )}
            </GoogleMap>
            
            <div className='space-y-2'>
                <div className='flex justify-between items-center'>
                    <Label htmlFor="coverage-slider" className="text-xs">Coverage Radius</Label>
                    <span className="text-xs font-bold text-primary">{formatRadius(radius)}</span>
                </div>
                <Slider min={100} max={50000} step={100} value={[radius]} onValueChange={handleSliderChange} disabled={!markerPosition} />
            </div>
        </div>
    );
}

export function LocationMapPicker({ form }: LocationMapPickerProps) {
    const [inputValue, setInputValue] = useState(form.getValues('location') || '');
    const initialLat = form.getValues('latitude');
    const initialLng = form.getValues('longitude');
    const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null);
    const [center, setCenter] = useState(initialLat && initialLng ? { lat: initialLat, lng: initialLng } : fallbackCenter);
    const [radius, setRadius] = useState(form.getValues('coverageRadius') || 1000);

    const MapPlaceholder = () => (
        <div className="h-60 w-full rounded-md bg-muted/30 border-2 border-dashed flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MapIcon className="h-6 w-6 text-primary opacity-50" />
            </div>
        </div>
    );

    if (!isValidKey(GOOGLE_MAPS_API_KEY)) {
        return (
            <div className="space-y-4">
                <Input
                    placeholder="Enter location address manually..."
                    className="text-base"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        form.setValue('location', e.target.value, { shouldDirty: true });
                    }}
                />
                <MapPlaceholder />
            </div>
        );
    }

    return (
        <LocationMapPickerInner 
            form={form} 
            inputValue={inputValue} 
            setInputValue={setInputValue}
            markerPosition={markerPosition}
            setMarkerPosition={setMarkerPosition}
            center={center}
            setCenter={setCenter}
            radius={radius}
            setRadius={setRadius}
        />
    );
}
