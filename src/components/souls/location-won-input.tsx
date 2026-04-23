
'use client';

import { useState } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface LocationWonInputProps {
    form: UseFormReturn<any>;
}

export function LocationWonInput({ form }: LocationWonInputProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    
    // Construct initial value from form if it exists
    const initialCity = form.getValues('locationWonCity');
    const initialState = form.getValues('locationWonState');
    const initialCountry = form.getValues('locationWonCountry');
    const initialDisplay = [initialCity, initialState, initialCountry].filter(Boolean).join(', ');
    const [inputValue, setInputValue] = useState(initialDisplay);


    const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
        setAutocomplete(autocompleteInstance);
    };

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
    
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
        return (
            <Input
                placeholder="Location search not configured"
                disabled
                className="text-base"
            />
        );
    }

    if (loadError) {
        return (
             <Input
                placeholder="Location search unavailable"
                disabled
                className="text-base"
            />
        );
    }

    if (!isLoaded) {
        return (
             <div className="flex items-center h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading Location Search...</span>
            </div>
        );
    }

    return (
        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} fields={['address_components', 'geometry.location']} types={['(regions)']}>
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

    