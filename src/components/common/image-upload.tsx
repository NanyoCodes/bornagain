'use client';

import { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import { useStorage, useUser } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, Crop as CropIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Sync with prop if it changes externally
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
      if (file.size > 10 * 1024 * 1024) { 
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select an image smaller than 10MB.' });
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
    const { width, height } = e.currentTarget;
    const aspectToUse = cropAspect ?? (circularCrop ? 1 : undefined);
    const finalAspect = aspectToUse ?? width / height;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, finalAspect, width, height),
      width,
      height
    );
    setCrop(crop);
  };

  const handleUpload = async (file: File | Blob): Promise<string> => {
    // 1. Direct Auth Check via getAuth() to avoid timing issues with hooks
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser || !user?.uid) {
        throw new Error("Kingdom session not ready. Please try again.");
    }

    // 2. Identity Verification & Diagnostic Logging
    if (currentUser.uid !== user.uid) {
        console.error("UID Mismatch in Upload Flow:", {
            authUid: currentUser.uid,
            hookUid: user.uid,
            path: storagePath
        });
        throw new Error("Identity verification failed. Please try again.");
    }

    if (!storage) throw new Error("Storage service unavailable.");

    // 3. Force Fresh Token to resolve storage/unauthorized errors
    try {
        await currentUser.getIdToken(true);
    } catch (tokenErr) {
        console.error("Failed to refresh auth token:", tokenErr);
    }

    const fileName = file instanceof File ? file.name : 'optimized-image.jpg';
    // All Kingdom assets are stored in UID-isolated directories: folder/userId/filename
    const fileRef = ref(storage, `${storagePath}/${currentUser.uid}/${Date.now()}_${fileName}`);
    
    const metadata = {
      contentType: file.type || 'image/jpeg'
    };

    try {
        await uploadBytes(fileRef, file, metadata);
        return getDownloadURL(fileRef);
    } catch (err: any) {
        console.error("Firebase Storage Upload Failure:", {
            code: err.code,
            message: err.message,
            path: fileRef.fullPath
        });
        throw new Error(err.message || "Unauthorized access to Kingdom storage.");
    }
  };

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setIsLoading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      const downloadURL = await handleUpload(croppedImageBlob);
      
      setPreviewUrl(downloadURL);
      onUploadComplete(downloadURL);
      
      toast({ title: 'Success', description: 'Photo updated and optimized.' });
      
      setIsCropModalOpen(false);
      setImgSrc('');

    } catch (error: any) {
      console.error("Photo processing failed:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Upload Failed', 
        description: error.message
      });
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
      <div className="flex flex-col items-center gap-4 w-full py-4">
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
                <Image src={previewUrl} alt="Preview" fill className="object-contain" unoptimized />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground/20" />
              )}
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex items-center gap-3 bg-muted/50 px-5 py-2.5 rounded-full border shadow-inner">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Transmitting...</span>
          </div>
        ) : (
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
        )}
        <Input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden" 
          accept="image/png, image/jpeg, image/webp"
        />
      </div>

      <Dialog open={isCropModalOpen} onOpenChange={(open) => { if (!isLoading) setIsCropModalOpen(open); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="p-8 border-b bg-muted/10">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Refine Frame</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1">Adjust the crop to set your Kingdom asset appearance.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 overflow-hidden flex justify-center bg-black/5 min-h-[300px]">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={cropAspect}
                circularCrop={circularCrop}
                className="max-h-[60vh] shadow-2xl rounded-lg"
              >
                <img
                  ref={imgRef}
                  alt="Source"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  className="max-h-[50vh] w-auto object-contain"
                />
              </ReactCrop>
            )}
          </div>
          <DialogFooter className="p-8 border-t bg-muted/5 flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)} disabled={isLoading} className="flex-1 font-bold rounded-xl h-12">Cancel</Button>
            <Button onClick={handleCrop} disabled={!completedCrop || isLoading} className="flex-1 font-black shadow-lg shadow-primary/20 h-12 rounded-xl uppercase tracking-widest">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CropIcon className="mr-2 h-4 w-4" />}
              {isLoading ? 'OPTIMIZING...' : 'CONFIRM & UPLOAD'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
