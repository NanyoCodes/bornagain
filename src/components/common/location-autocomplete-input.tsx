'use client';

import { useState, useEffect } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';
import { firebaseConfig } from '@/firebase/config';

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || firebaseConfig.apiKey;


interface LocationAutocompleteInputProps {
    form: UseFormReturn<any>;
}

export function LocationAutocompleteInput({ form }: LocationAutocompleteInputProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const [inputValue, setInputValue] = useState(form.getValues('location') || '');

    const watchedLocation = form.watch('location');
    useEffect(() => {
        // Sync local state if form value changes from an external source (e.g. map click)
        if (watchedLocation !== inputValue) {
            setInputValue(watchedLocation || '');
        }
    }, [watchedLocation, inputValue]);


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

    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE' || loadError) {
        return (
            <Input
                placeholder="Enter location address manually..."
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
