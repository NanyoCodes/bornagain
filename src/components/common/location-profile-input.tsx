
'use client';

import { useState } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
        return (
            <Alert variant="destructive">
                <AlertTitle>Google Maps Not Configured</AlertTitle>
                <AlertDescription>
                    The Google Maps API key is missing. Please open <code className="font-code p-1 bg-destructive/20 rounded">docs/google-maps-setup-guide.md</code> for the setup guide to enable map features.
                </AlertDescription>
            </Alert>
        );
    }

    if (loadError) {
        let errorMessage = 'Error loading Google Maps. Please check your API key and network connection.';
        if (loadError.message.includes('ApiNotActivatedMapError') || loadError.message.includes('InvalidKeyMapError')) {
            errorMessage = 'The Google Maps API key seems to be invalid or missing required permissions.';
        }
        
         return (
            <Alert variant="destructive">
                <AlertTitle>Google Maps Error</AlertTitle>
                <AlertDescription>
                    {errorMessage} Please open <code className="font-code p-1 bg-destructive/20 rounded">docs/google-maps-setup-guide.md</code> to resolve this.
                </AlertDescription>
            </Alert>
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
                placeholder="Search location to autofill city/state/country"
                type="text"
                className="text-base"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
        </Autocomplete>
    );
}
