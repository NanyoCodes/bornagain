"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Video, MapPin, User, Trash2, Sparkles, Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import type { Event, EventCategory } from "@/lib/types";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { safeToDate } from "@/lib/utils";

const eventCategories: EventCategory[] = [
  'Conference', 'Worship', 'Seminar', 'Outreach', 'Prayer', 'Youth', 'Church Service', 'Other'
];

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(5000),
  category: z.string({ required_error: "Please select a category." }),
  organizerName: z.string().min(2, "Host name is required.").max(100),
  location: z.string().min(3, "A location is required.").max(200),
  locationType: z.enum(['Physical', 'Virtual', 'Both'], { required_error: "Select location type." }),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().min(1, "End time is required."),
  maxParticipants: z.number().optional().nullable(),
  streamUrl: z.string().url("Valid URL required").optional().or(z.literal('')),
}).refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
});

export function ManageEventForm({ event, onEventUpdated, onDelete }: { event: Event; onEventUpdated: () => void; onDelete: () => void }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event.title || "",
      description: event.description || "",
      organizerName: event.organizerName || "",
      category: event.category,
      location: event.location || "",
      locationType: event.locationType || 'Physical',
      startDate: safeToDate(event.startDate) ?? new Date(),
      endDate: safeToDate(event.endDate) ?? new Date(),
      startTime: event.startTime || "10:00",
      endTime: event.endTime || "12:00",
      maxParticipants: event.maxParticipants ?? null,
      streamUrl: event.streamUrl || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) return;
    setIsSubmitting(true);

    const eventRef = doc(firestore, 'events', event.id);

    const updateData = {
        title: values.title,
        description: values.description,
        category: values.category,
        organizerName: values.organizerName,
        location: values.location,
        locationType: values.locationType,
        startDate: values.startDate,
        endDate: values.endDate,
        startTime: values.startTime,
        endTime: values.endTime,
        maxParticipants: values.maxParticipants || null,
        streamUrl: values.streamUrl || null,
        updatedAt: serverTimestamp(),
    };

    try {
        await updateDoc(eventRef, updateData);
        toast({ title: 'Event Updated', description: `Changes to "${values.title}" have been saved.` });
        onEventUpdated();
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: eventRef.path,
                operation: 'update',
                requestResourceData: updateData
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'An unexpected error occurred.' });
        }
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 text-left">
        <div className="space-y-6">
            <div className="flex items-center gap-3 px-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">General Info</h3>
            </div>
            
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Event Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Night of Wonders" {...field} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />

            <FormField control={form.control} name="organizerName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Event Host / Organizer</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                      <Input placeholder="e.g., Pastor John Smith" {...field} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                          {eventCategories.map(cat => <SelectItem key={cat} value={cat} className="rounded-xl">{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="locationType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meeting Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                            <SelectValue placeholder="Format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="Physical" className="rounded-xl">Physical Only</SelectItem>
                          <SelectItem value="Virtual" className="rounded-xl">Virtual Only</SelectItem>
                          <SelectItem value="Both" className="rounded-xl">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                )} />
            </div>
        </div>

        <div className="space-y-6">
            <div className="flex items-center gap-3 px-1">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Logistics</h3>
            </div>
            <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Address / Venue</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                      <Input placeholder="e.g., Kingdom Hall, Center City" {...field} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" value={field.value ? format(field.value, "yyyy-MM-dd") : ""} onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">End Date</FormLabel>
                      <FormControl>
                        <Input type="date" value={field.value ? format(field.value, "yyyy-MM-dd") : ""} onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Time</FormLabel>
                      <FormControl><Input type="time" {...field} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">End Time</FormLabel>
                      <FormControl><Input type="time" {...field} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                )} />
            </div>

            <FormField control={form.control} name="streamUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meeting Link (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                      <Input placeholder="https://meet.google.com/..." {...field} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )} />
        </div>

        <div className="space-y-6">
            <div className="flex items-center gap-3 px-1">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Description</h3>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">About this Event</FormLabel>
                <FormControl><Textarea placeholder="Share the vision and schedule..." className="min-h-[120px] rounded-[2rem] p-6 bg-muted/10 border-2 border-dashed text-base leading-relaxed" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )} />
        </div>

        <div className="flex flex-col gap-4">
            <Button type="submit" className="w-full h-14 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                SAVE CHANGES
            </Button>
            
            <Button type="button" variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> CANCEL HUB
            </Button>
        </div>
      </form>
    </Form>
  );
}
