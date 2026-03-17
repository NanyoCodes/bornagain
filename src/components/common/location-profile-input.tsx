
'use client';

import { useState } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface LocationProfileInputProps {
    form: UseFormReturn<any>;
}

export function LocationProfileInput({ form }: LocationProfileInputProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const [inputValue, setInputValue] = useState('');


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

            form.setValue('city', city, { shouldDirty: true });
            form.setValue('state', state, { shouldDirty: true });
            form.setValue('country', country, { shouldDirty: true });

            if (place.geometry?.location) {
                form.setValue('latitude', place.geometry.location.lat(), { shouldDirty: true });
                form.setValue('longitude', place.geometry.location.lng(), { shouldDirty: true });
            }

            const displayValue = [city, state, country].filter(Boolean).join(', ');
            setInputValue(displayValue);
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
             <div className="flex items-center h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading Location Search...</span>
            </div>
        );
    }

    return (
        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} fields={['address_components', 'geometry.location']} types={['(regions)']}>
            <Input
                placeholder="Search location to autofill city/state/country"
                type="text"
                className="text-base"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
        </Autocomplete>
    );
}
