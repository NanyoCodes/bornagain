'use client';

import { useState } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';

const libraries: ('places')[] = ['places'];

interface LocationProfileInputProps {
    form: UseFormReturn<any>;
}

export function LocationProfileInput({ form }: LocationProfileInputProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
        setAutocomplete(autocompleteInstance);
    };

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            let city = '';
            let country = '';
            
            place.address_components?.forEach(component => {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                } else if (component.types.includes('administrative_area_level_1')) {
                    // Fallback to state/province if city is not found
                    if (!city) city = component.long_name;
                }
                if (component.types.includes('country')) {
                    country = component.long_name;
                }
            });

            form.setValue('city', city, { shouldDirty: true });
            form.setValue('country', country, { shouldDirty: true });
        }
    };

    if (loadError) {
         return <div className="text-destructive text-sm p-2 rounded-md border border-destructive/50">Error loading maps. Check API key.</div>;
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
        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} fields={['address_components']} types={['(regions)']}>
            <Input
                placeholder="Search location to autofill city/country"
                type="text"
                className="text-base"
            />
        </Autocomplete>
    );
}
