'use client';

import * as React from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { Country, State, City } from 'country-state-city';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface LocationWonInputProps {
  form: UseFormReturn<any>;
}

export function LocationWonInput({ form }: LocationWonInputProps) {
  const [countries] = React.useState(Country.getAllCountries());
  
  // Need to find codes to fetch sub-data
  const selectedCountryName = form.watch('locationWonCountry');
  const selectedStateName = form.watch('locationWonState');

  const selectedCountry = React.useMemo(() => 
    countries.find(c => c.name === selectedCountryName)
  , [countries, selectedCountryName]);

  const states = React.useMemo(() => 
    selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : []
  , [selectedCountry]);

  const selectedState = React.useMemo(() => 
    states.find(s => s.name === selectedStateName)
  , [states, selectedStateName]);

  const cities = React.useMemo(() => 
    (selectedCountry && selectedState) 
      ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode) 
      : []
  , [selectedCountry, selectedState]);

  return (
    <div className="grid grid-cols-1 gap-4">
      <FormField
        control={form.control}
        name="locationWonCountry"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</FormLabel>
            <Select
              onValueChange={(val) => {
                field.onChange(val);
                form.setValue('locationWonState', '');
                form.setValue('locationWonCity', '');
              }}
              value={field.value}
            >
              <SelectTrigger className="text-sm h-11">
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {countries.map((c) => (
                  <SelectItem key={c.isoCode} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="locationWonState"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State / Region</FormLabel>
              <Select
                onValueChange={(val) => {
                  field.onChange(val);
                  form.setValue('locationWonCity', '');
                }}
                value={field.value}
                disabled={!selectedCountryName || states.length === 0}
              >
                <SelectTrigger className="text-sm h-11">
                  <SelectValue placeholder={states.length === 0 ? "N/A" : "Select State"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {states.map((s) => (
                    <SelectItem key={s.isoCode + s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locationWonCity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={!selectedStateName || cities.length === 0}
              >
                <SelectTrigger className="text-sm h-11">
                  <SelectValue placeholder={cities.length === 0 ? "N/A" : "Select City"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {cities.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
