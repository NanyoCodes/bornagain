'use client';

import { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import { useStorage, useUser } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, Crop as CropIcon, Trash2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  const MAX_WIDTH = 1200;
  let targetWidth = crop.width * scaleX;
  let targetHeight = crop.height * scaleY;

  if (targetWidth > MAX_WIDTH) {
    const scale = MAX_WIDTH / targetWidth;
    targetWidth = MAX_WIDTH;
    targetHeight = targetHeight * scale;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    return Promise.reject(new Error('Canvas context is not available'));
  }
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.8);
  });
}

interface ImageUploadProps {
  initialImageUrl?: string | null;
  onUploadComplete: (url: string) => void;
  storagePath: string;
  cropAspect?: number;
  circularCrop?: boolean;
}

export function ImageUpload({ initialImageUrl, onUploadComplete, storagePath, cropAspect, circularCrop }: ImageUploadProps) {
  const { user } = useUser();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (initialImageUrl !== undefined && initialImageUrl !== previewUrl) {
      setPreviewUrl(initialImageUrl || null);
    }
  }, [initialImageUrl, previewUrl]);
  
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
       if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.' });
        return;
      }
      if (file.size > 20 * 1024 * 1024) { 
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select an image smaller than 20MB.' });
        return;
      }
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
      setIsCropModalOpen(true);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
    
    const photoAspect = naturalWidth / naturalHeight;
    const aspectToUse = cropAspect || (circularCrop ? 1 : photoAspect);
    
    // Expanded initialization: Initialize crop to cover full width
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 100 }, aspectToUse, width, height),
      width,
      height
    );
    setCrop(crop);
  };

  const handleUpload = async (file: Blob): Promise<string> => {
    if (!user?.uid || !storage) throw new Error("Kingdom session not ready. Please sign in.");

    const fileName = `upload_${Date.now()}.jpg`;
    const fileRef = ref(storage, `${storagePath}/${user.uid}/${fileName}`);
    
    const metadata = { contentType: 'image/jpeg' };

    return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(fileRef, file, metadata);
        
        uploadTask.on('state_changed', 
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => reject(error),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
            }
        );
    });
  };

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Required', description: 'Please sign in to upload photos.' });
        return;
    }
    
    setIsLoading(true);
    setUploadProgress(0);
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      const downloadURL = await handleUpload(croppedImageBlob);
      
      setPreviewUrl(downloadURL);
      onUploadComplete(downloadURL);
      
      toast({ title: 'Success', description: 'Identity proof optimized and transmitted.' });
      setIsCropModalOpen(false);
      setImgSrc('');
    } catch (error: any) {
      console.error("Photo processing failed:", error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || "Access denied." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onUploadComplete('');
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4 w-full py-4 text-left">
        <div className="relative">
          {circularCrop ? (
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-xl ring-2 ring-primary/10">
              <AvatarImage src={previewUrl ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-muted"><Camera className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30" /></AvatarFallback>
            </Avatar>
          ) : (
            <div 
              className="relative w-full max-w-xs rounded-2xl border-2 border-dashed bg-muted/20 flex items-center justify-center overflow-hidden shadow-md"
              style={{ aspectRatio: cropAspect || 1.777 }}
            >
              {previewUrl ? (
                <Image src={previewUrl} alt="Preview" fill className="object-cover" unoptimized />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground/20" />
              )}
            </div>
          )}
          {!previewUrl && (
            <div className="absolute -top-2 -right-2 bg-primary text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg border-2 border-background animate-bounce whitespace-nowrap z-20">
                IT CAN COVER ENTIRE PHOTO
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 bg-muted/50 px-5 py-2.5 rounded-full border shadow-inner">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Transmitting {Math.round(uploadProgress)}%</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={handleFileSelect} className="h-10 px-6 rounded-full font-bold shadow-sm border-primary/20 hover:bg-primary/5 transition-all uppercase tracking-widest text-[10px]">
                    <Camera className="mr-2 h-4 w-4 text-primary"/>
                    Set Photo
                </Button>
                {previewUrl && (
                <Button 
                    type="button" 
                    variant="ghost" 
                    className="h-10 px-6 rounded-full font-bold text-destructive hover:text-destructive hover:bg-destructive/10 uppercase tracking-widest text-[10px]" 
                    onClick={handleRemoveImage}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                </Button>
                )}
            </div>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          className="hidden" 
          accept="image/png, image/jpeg, image/webp"
        />
      </div>

      <Dialog open={isCropModalOpen} onOpenChange={(open) => { if (!isLoading) setIsCropModalOpen(open); }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0 overflow-hidden rounded-2xl sm:rounded-[2.5rem] border-none shadow-2xl flex flex-col max-h-[90dvh] text-left">
          <div className="p-6 sm:p-10 border-b bg-muted/10 shrink-0 relative overflow-hidden text-left">
            <DialogHeader className="text-left relative z-10 p-0 text-left">
                <div className="flex items-center gap-2 mb-2 text-left">
                    <CropIcon className="h-4 w-4 text-primary text-left" />
                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Kingdom Identity Hub</span>
                </div>
                <DialogTitle className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tight text-left">Refine Your Image</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm font-medium mt-1 text-left">Set your focus for the global Kingdom directory.</DialogDescription>
            </DialogHeader>
          </div>
          <ScrollArea className="flex-1 min-h-0 bg-black/5 relative">
            <div className="p-4 sm:p-10 overflow-hidden flex justify-center items-center min-h-[300px] relative z-10">
              {imgSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={cropAspect}
                  circularCrop={circularCrop}
                  className="max-h-full shadow-2xl rounded-lg border-4 border-background"
                >
                  <img
                    ref={imgRef}
                    alt="Source"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    className="max-h-[50dvh] w-auto object-contain"
                  />
                </ReactCrop>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 sm:p-10 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 shrink-0 text-left">
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)} disabled={isLoading} className="flex-1 font-bold rounded-xl h-12 text-left">Cancel</Button>
            <div className="flex-1 flex flex-col gap-2 text-left">
                {user ? (
                    <Button 
                        onClick={handleCrop} 
                        disabled={!completedCrop || isLoading} 
                        className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : <Sparkles className="mr-2 h-4 w-4 text-left" />}
                        {isLoading ? 'OPTIMIZING...' : 'ACTIVATE IDENTITY'}
                    </Button>
                ) : (
                    <div className="space-y-2 text-left">
                        <p className="text-[9px] text-destructive font-black uppercase tracking-widest text-center animate-pulse text-left">
                            Sign in to upload photo
                        </p>
                        <Button disabled className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-center opacity-50 text-left">
                            SIGN IN REQUIRED
                        </Button>
                    </div>
                )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}