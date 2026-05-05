'use client';

import { Input } from '@/components/ui/input';
import { type UseFormReturn } from 'react-hook-form';
import { useState, useEffect } from 'react';

interface LocationWonInputProps {
    form: UseFormReturn<any>;
}

/**
 * Text-only location input to ensure compatibility and simplicity.
 * Fulfills the requirement: MAKE THIS FIELD INPUT TEXT ONLY.
 */
export function LocationWonInput({ form }: LocationWonInputProps) {
    const initialCity = form.getValues('locationWonCity');
    const initialState = form.getValues('locationWonState');
    const initialCountry = form.getValues('locationWonCountry');
    
    const [inputValue, setInputValue] = useState(
        [initialCity, initialState, initialCountry].filter(Boolean).join(', ')
    );

    useEffect(() => {
        const city = form.getValues('locationWonCity');
        const state = form.getValues('locationWonState');
        const country = form.getValues('locationWonCountry');
        setInputValue([city, state, country].filter(Boolean).join(', '));
    }, [form]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        
        // Map the entire text input to 'city' for simple persistent storage
        form.setValue('locationWonCity', val, { shouldDirty: true });
        form.setValue('locationWonState', '', { shouldDirty: true });
        form.setValue('locationWonCountry', '', { shouldDirty: true });
        form.setValue('locationWonLatitude', null, { shouldDirty: true });
        form.setValue('locationWonLongitude', null, { shouldDirty: true });
    };

    return (
        <Input
            placeholder="e.g. City, State, Country"
            type="text"
            className="text-base"
            value={inputValue}
            onChange={handleChange}
        />
    );
}
