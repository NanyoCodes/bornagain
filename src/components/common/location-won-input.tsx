
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface LocationWonInputProps {
    form: UseFormReturn<any>;
}

function LocationWonInputInner({ form, inputValue, setInputValue }: LocationWonInputProps & { inputValue: string, setInputValue: (v: string) => void }) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            let city = '';
            let state = '';
            let country = '';
            
            place.address_components?.forEach(component => {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                }
                if (component.types.includes('administrative_area_level_1')) {
                    state = component.long_name;
                }
                if (component.types.includes('country')) {
                    country = component.long_name;
                }
            });

            form.setValue('locationWonCity', city, { shouldDirty: true });
            form.setValue('locationWonState', state, { shouldDirty: true });
            form.setValue('locationWonCountry', country, { shouldDirty: true });

            if (place.geometry?.location) {
                form.setValue('locationWonLatitude', place.geometry.location.lat(), { shouldDirty: true });
                form.setValue('locationWonLongitude', place.geometry.location.lng(), { shouldDirty: true });
            }

            const displayValue = [city, state, country].filter(Boolean).join(', ');
            setInputValue(displayValue);
        }
    };
    
    if (loadError) {
        return <Input placeholder="Location search unavailable" disabled className="text-base" />;
    }

    if (!isLoaded) {
        return (
             <div className="flex items-center h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading Search...</span>
            </div>
        );
    }

    return (
        <Autocomplete onLoad={(a) => setAutocomplete(a)} onPlaceChanged={onPlaceChanged} fields={['address_components', 'geometry.location']} types={['(regions)']}>
            <Input
                placeholder="Search location where soul was won"
                type="text"
                className="text-base"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
        </Autocomplete>
    );
}

export function LocationWonInput({ form }: LocationWonInputProps) {
    const initialCity = form.getValues('locationWonCity');
    const initialState = form.getValues('locationWonState');
    const initialCountry = form.getValues('locationWonCountry');
    const initialDisplay = [initialCity, initialState, initialCountry].filter(Boolean).join(', ');
    const [inputValue, setInputValue] = useState(initialDisplay);

    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className="space-y-2">
                <Input placeholder="Location search not configured" disabled className="text-base" />
                <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Google Maps API Key Missing. Search disabled.
                </p>
            </div>
        );
    }

    return <LocationWonInputInner form={form} inputValue={inputValue} setInputValue={setInputValue} />;
}
