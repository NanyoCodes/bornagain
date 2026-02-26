'use client';

import { useState } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { type ControllerRenderProps } from 'react-hook-form';

const libraries: ('places')[] = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;


interface LocationAutocompleteInputProps {
    field: ControllerRenderProps<any, string>;
}

export function LocationAutocompleteInput({ field }: LocationAutocompleteInputProps) {
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
            if (place.formatted_address) {
                field.onChange(place.formatted_address);
            }
        }
    };

    if (!GOOGLE_MAPS_API_KEY) {
        return <div className="text-destructive text-sm p-2 rounded-md border border-destructive/50 bg-destructive/10">Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.</div>;
    }

    if (loadError) {
        return <div className="text-destructive text-sm p-2 rounded-md border border-destructive/50 bg-destructive/10">Error loading Google Maps. Please check your API key and network connection.</div>;
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
        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} fields={['formatted_address']} types={['geocode']}>
            <Input
                {...field}
                placeholder="Start typing an address, city, or place..."
                type="text"
                className="text-base"
                onChange={(e) => field.onChange(e.target.value)}
            />
        </Autocomplete>
    );
}
