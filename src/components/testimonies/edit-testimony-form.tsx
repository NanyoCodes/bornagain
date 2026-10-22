"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { Loader2, Camera, Video, X, FileUp, Sparkles, Music, Info, Search, Check, PlayCircle, ChevronDown } from "lucide-react";
import { Testimony, TestimonyCategory } from "@/lib/types";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { searchWorshipSongs, type SearchSongsOutput } from "@/ai/flows/search-worship-songs";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const testimonyCategories: TestimonyCategory[] = [
  'Healing', 
  'Financial Breakthrough', 
  'Salvation', 
  'Relationships', 
  'Deliverance', 
  'Academic Success', 
  'Employment', 
  'Family', 
  'Protection', 
  'Mental Health', 
  'Global Missions', 
  'Business Growth', 
  'General'
];

const atmospherePresets = [
    { label: 'Grateful', icon: '🙏' },
    { label: 'Victory', icon: '🏆' },
    { label: 'Healing', icon: '🏥' },
    { label: 'Power', icon: '🔥' },
    { label: 'Peace', icon: '🕊️' },
    { label: 'Joy', icon: '✨' },
];

const formSchema = z.object({
  category: z.string({ required_error: "Please select a category." }),
  content: z.string().min(50, "Testimony must be at least 50 characters.").max(5000, "Testimony is too long."),
  mediaUrl: z.string().optional().nullable(),
  mediaType: z.enum(['image', 'video', 'audio']).optional().nullable(),
  mediaUrl2: z.string().optional().nullable(),
  mediaType2: z.enum(['image', 'video', 'audio']).optional().nullable(),
  musicUrl: z.string().url("Please enter a valid YouTube URL.").optional().nullable().or(z.literal('')),
  musicTitle: z.string().max(100, "Title too long").optional().nullable(),
});

type EditTestimonyFormProps = {
  testimony: Testimony;
  onTestimonyUpdated: () => void;
};

export function EditTestimonyForm({ testimony, onTestimonyUpdated }: EditTestimonyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState<number | null>(null);
  const isMobile = useIsMobile();
  
  const [mediaPreview1, setMediaPreview1] = useState<{ url: string, type: 'image' | 'video' | 'audio' } | null>(
    testimony.mediaUrl ? { url: testimony.mediaUrl, type: testimony.mediaType as any } : null
  );
  const [mediaPreview2, setMediaPreview2] = useState<{ url: string, type: 'image' | 'video' | 'audio' } | null>(
    testimony.mediaUrl2 ? { url: testimony.mediaUrl2, type: testimony.mediaType2 as any } : null
  );

  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [songResults, setSongResults] = useState<SearchSongsOutput['songs']>([]);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: testimony.category,
      content: testimony.content,
      mediaUrl: testimony.mediaUrl || null,
      mediaType: testimony.mediaType || null,
      mediaUrl2: testimony.mediaUrl2 || null,
      mediaType2: testimony.mediaType2 || null,
      musicUrl: testimony.musicUrl || "",
      musicTitle: testimony.musicTitle || "",
    },
  });

  const selectedMusicUrl = useWatch({ control: form.control, name: 'musicUrl' });

  const handleScanSongs = async (atmosphere?: string) => {
    const query = atmosphere || songSearchQuery.trim();
    if (!query) return;

    setIsSearchingSongs(true);
    setSongResults([]);
    try {
        const result = await searchWorshipSongs({ 
            query: atmosphere ? `Gospel songs about ${atmosphere}` : query,
            atmosphere: atmosphere
        });
        if (result && result.songs) {
            setSongResults(result.songs);
            setIsResultsOpen(true);
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Library Access Failed' });
    } finally {
        setIsSearchingSongs(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image or video.' });
      return;
    }

    setIsUploadingMedia(slot);

    const processAndUpload = async () => {
      try {
        let fileToUpload: File | Blob = file;
        const sizeInMb = file.size / (1024 * 1024);

        if (isImage && sizeInMb > 5) {
          fileToUpload = await compressImage(file);
        }

        const fileRef = ref(storage, `testimonies/${user.uid}/${Date.now()}_slot${slot}_${file.name}`);
        const uploadResult = await uploadBytes(fileRef, fileToUpload);
        const url = await getDownloadURL(uploadResult.ref);

        const type = isImage ? 'image' : 'video';
        if (slot === 1) {
            setMediaPreview1({ url, type });
            form.setValue('mediaUrl', url);
            form.setValue('mediaType', type);
        } else {
            setMediaPreview2({ url, type });
            form.setValue('mediaUrl2', url);
            form.setValue('mediaType2', type);
        }
        
        toast({ title: 'Media Updated', description: `Evidence ${slot} updated successfully.` });
      } catch (err: any) {
        console.error("Media upload error:", err);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not transmit media.' });
      } finally {
        setIsUploadingMedia(null);
      }
    };

    processAndUpload();
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new (window as any).Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDimension = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) { height *= maxDimension / width; width = maxDimension; }
        } else {
          if (height > maxDimension) { width *= maxDimension / height; height = maxDimension; }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas compression failed'));
        }, 'image/jpeg', 0.7);
      };
      img.onerror = reject;
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
      return;
    }
    if (user.uid !== testimony.authorId) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You can only edit your own testimonies.' });
      return;
    }

    setIsSubmitting(true);
    
    const testimonyUpdate: { [key: string]: any } = {
        category: values.category,
        content: values.content,
        mediaUrl: values.mediaUrl || null,
        mediaType: values.mediaType || null,
        mediaUrl2: values.mediaUrl2 || null,
        mediaType2: values.mediaType2 || null,
        musicUrl: values.musicUrl || null,
        musicTitle: values.musicTitle || null,
        updatedAt: serverTimestamp(),
    };

    const testimonyRef = doc(firestore, "testimonies", testimony.id);
    
    updateDoc(testimonyRef, testimonyUpdate)
        .then(() => {
            toast({
                title: "Testimony Updated!",
                description: "Your changes have been saved successfully.",
            });
            onTestimonyUpdated();
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
                path: testimonyRef.path,
                operation: 'update',
                requestResourceData: testimonyUpdate,
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  const renderMediaSlot = (slot: 1 | 2, preview: typeof mediaPreview1, setPreview: typeof setMediaPreview1, inputRef: React.RefObject<HTMLInputElement | null>, urlField: 'mediaUrl' | 'mediaUrl2', typeField: 'mediaType' | 'mediaType2') => {
    return (
      <div className="space-y-3 flex-1 text-left">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2 text-left">
              <Camera className="h-3.5 w-3.5 text-left" /> Evidence {slot}
          </Label>
          
          {!preview ? (
              <div 
                  className={cn(
                      "border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center bg-muted/10 transition-colors cursor-pointer group h-[120px] text-left",
                      isUploadingMedia === slot ? "opacity-50 pointer-events-none" : "hover:bg-muted/20"
                  )}
                  onClick={() => inputRef.current?.click()}
              >
                  {isUploadingMedia === slot ? (
                      <div className="flex flex-col items-center gap-2 text-left">
                          <Loader2 className="h-6 w-6 animate-spin text-primary text-left" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-primary text-center text-left">Optimizing...</p>
                      </div>
                  ) : (
                      <>
                          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-left">
                              <FileUp className="h-4 w-4 text-primary text-left" />
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center text-left">Update Media</p>
                      </>
                  )}
              </div>
          ) : (
              <div className="relative rounded-2xl overflow-hidden border-2 bg-muted aspect-square shadow-inner text-left">
                  {preview.type === 'image' ? (
                      <Image src={preview.url} alt={`Evidence ${slot}`} fill className="object-contain text-left" unoptimized />
                  ) : (
                      <video src={preview.url} className="w-full h-full object-contain text-left" playsInline controls />
                  )}
                  <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg text-left" 
                      onClick={() => { setPreview(null); form.setValue(urlField, null); form.setValue(typeField, null); }}
                  >
                      <X className="h-3.5 w-3.5 text-left" />
                  </Button>
              </div>
          )}
          <input type="file" ref={inputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileSelect(e, slot)} />
      </div>
    );
  };

  const resultsList = (
    <div className="space-y-2 p-1 text-left">
        {songResults.map((song, idx) => (
            <button
                key={idx}
                type="button"
                onClick={() => {
                    form.setValue('musicUrl', song.url, { shouldDirty: true });
                    form.setValue('musicTitle', song.title, { shouldDirty: true });
                    setIsResultsOpen(false);
                    setSongSearchQuery('');
                    toast({ title: 'Song Selected', description: `"${song.title}" will accompany your story.` });
                }}
                className="flex items-center justify-between p-4 rounded-2xl border-2 border-transparent bg-muted/5 hover:bg-primary/5 hover:border-primary/20 transition-all text-left w-full group"
            >
                <div className="min-w-0 flex-1 text-left">
                    <p className="font-black text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors text-left">{song.title}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">{song.artist}</p>
                </div>
                <PlayCircle className="h-5 w-5 text-primary/40 group-hover:text-primary transition-colors ml-3 shrink-0" />
            </button>
        ))}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-left">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="text-left">
              <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 text-left">Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl className="text-left">
                  <SelectTrigger className="h-12 rounded-2xl border-2 text-left"><SelectValue className="text-left" /></SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-2xl text-left">
                  {testimonyCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem className="text-left">
              <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 text-left">Your Testimony</FormLabel>
              <FormControl className="text-left">
                <Textarea className="min-h-[180px] rounded-[2rem] p-6 text-base leading-relaxed bg-muted/10 border-2 border-dashed text-left" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4 text-left">
             {renderMediaSlot(1, mediaPreview1, setMediaPreview1, fileInputRef1, 'mediaUrl', 'mediaType')}
             {renderMediaSlot(2, mediaPreview2, setMediaPreview2, fileInputRef2, 'mediaUrl2', 'mediaType2')}
        </div>

        <div className="space-y-4 pt-2 border-t border-dashed text-left">
            <div className="flex items-center gap-2 px-1">
                <Music className="h-4 w-4 text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Kingdom Worship (Optional)</h4>
            </div>

            <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                    {atmospherePresets.map(p => (
                        <Button 
                            key={p.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full h-8 px-3 text-[10px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                            onClick={() => handleScanSongs(p.label)}
                        >
                            <span className="mr-1.5">{p.icon}</span>
                            {p.label}
                        </Button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Input 
                        placeholder="Scan for specific gospel songs..." 
                        value={songSearchQuery}
                        onChange={e => setSongSearchQuery(e.target.value)}
                        className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold"
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleScanSongs())}
                    />
                    <Button 
                        type="button" 
                        onClick={() => handleScanSongs()} 
                        disabled={isSearchingSongs || (!songSearchQuery.trim())}
                        className="h-11 rounded-xl px-6 font-black uppercase tracking-widest text-[10px]"
                    >
                        {isSearchingSongs ? <Loader2 className="h-4 w-4 animate-spin text-left" /> : <Search className="h-4 w-4" />}
                        SCAN
                    </Button>
                </div>

                {selectedMusicUrl && (
                    <div className="bg-primary/5 rounded-2xl p-4 border-2 border-dashed border-primary/20 flex items-center justify-between animate-in zoom-in">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Music className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[8px] font-black uppercase text-primary/60 tracking-widest">Active Sound</p>
                                <p className="text-xs font-black uppercase tracking-tight text-foreground truncate mt-0.5">{form.watch('musicTitle')}</p>
                            </div>
                        </div>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                            onClick={() => {
                                form.setValue('musicUrl', '', { shouldDirty: true });
                                form.setValue('musicTitle', '', { shouldDirty: true });
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>

        <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl tracking-widest uppercase text-left" disabled={isSubmitting || isUploadingMedia !== null}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
          {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
        </Button>
      </form>

      {isMobile ? (
        <Drawer open={isResultsOpen} onOpenChange={setIsResultsOpen}>
            <DrawerContent className="h-[70dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                    <DrawerHeader className="p-0 text-left">
                        <div className="flex items-center gap-2 mb-2 text-left">
                            <Music className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Kingdom Library</span>
                        </div>
                        <DrawerTitle className="text-2xl font-black font-headline uppercase text-left">Select Worship</DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1 text-left">Choose a song to accompany your story.</DrawerDescription>
                        <div className="flex items-center gap-2 mt-4 text-left"><ChevronDown className="h-3 w-3 text-muted-foreground animate-bounce" /><span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Swipe down to close</span></div>
                    </DrawerHeader>
                </div>
                <ScrollArea className="flex-grow p-6">
                    {resultsList}
                </ScrollArea>
            </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col max-h-[80dvh] text-left">
                <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
                    <DialogHeader className="text-left p-0">
                        <DialogTitle className="text-2xl font-black font-headline uppercase text-left">Select Worship</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1 text-left">Pick a song from the Kingdom library.</DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="flex-grow p-6">
                    {resultsList}
                </ScrollArea>
            </DialogContent>
        </Dialog>
      )}
    </Form>
  );
}

