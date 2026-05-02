
'use client';

import { useState, useEffect } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;


interface LocationAutocompleteInputProps {
    form: UseFormReturn<any>;
}

function LocationAutocompleteInner({ form, inputValue, setInputValue }: LocationAutocompleteInputProps & { inputValue: string, setInputValue: (v: string) => void }) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
        setAutocomplete(autocompleteInstance);
    };

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            const newAddress = place.formatted_address || place.name || '';
            setInputValue(newAddress);
            form.setValue('location', newAddress, { shouldDirty: true });
            
            if (place.geometry?.location) {
                form.setValue('latitude', place.geometry.location.lat(), { shouldDirty: true });
                form.setValue('longitude', place.geometry.location.lng(), { shouldDirty: true });
            }
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        form.setValue('location', e.target.value, { shouldDirty: true });
    }

    if (loadError) {
        return (
            <Input
                placeholder="Enter address manually (Maps failed to load)..."
                type="text"
                className="text-base"
                value={inputValue}
                onChange={handleInputChange}
            />
        );
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
        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} fields={['formatted_address', 'name', 'geometry.location']} types={['geocode']}>
            <Input
                placeholder="Start typing an address, city, or place..."
                type="text"
                className="text-base"
                value={inputValue}
                onChange={handleInputChange}
            />
        </Autocomplete>
    );
}

export function LocationAutocompleteInput({ form }: LocationAutocompleteInputProps) {
    const [inputValue, setInputValue] = useState(form.getValues('location') || '');

    const watchedLocation = form.watch('location');
    useEffect(() => {
        if (watchedLocation !== inputValue) {
            setInputValue(watchedLocation || '');
        }
    }, [watchedLocation, inputValue]);

    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className="space-y-2">
                <Input
                    placeholder="Enter location address manually..."
                    className="text-base"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        form.setValue('location', e.target.value, { shouldDirty: true });
                    }}
                />
                <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Google Maps API Key Missing. Search disabled.
                </p>
            </div>
        );
    }

    return <LocationAutocompleteInner form={form} inputValue={inputValue} setInputValue={setInputValue} />;
}
