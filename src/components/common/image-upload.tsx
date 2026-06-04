'use client';

import { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import { useStorage, useUser } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, Crop as CropIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';

// Function to generate a cropped image
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    return Promise.reject(new Error('Canvas context is not available'));
  }
  
  // Set high quality smoothing for sharpest possible result
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
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 1.0); // Maximum quality for JPEG
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

  // Cropping state
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (!isLoading) {
      setPreviewUrl(initialImageUrl || null);
    }
  }, [initialImageUrl, isLoading]);
  
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
      if (file.size > 10 * 1024 * 1024) { // Increase size limit for source to 10MB
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
    if (!user) throw new Error("You must be logged in to upload images.");
    if (!storage) throw new Error("Firebase Storage is not available.");

    const fileName = file instanceof File ? file.name : 'high-res-profile.jpg';
    const fileRef = ref(storage, `${storagePath}/${user.uid}/${Date.now()}_${fileName}`);
    try {
        await uploadBytes(fileRef, file);
        return getDownloadURL(fileRef);
    } catch (err: any) {
        if (err.code === 'storage/unauthorized') {
            throw new Error("Permission denied. Ensure your storage bucket is correctly configured.");
        }
        throw err;
    }
  };

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setIsLoading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      if (croppedImageBlob.size > 5 * 1024 * 1024) { // Allow up to 5MB for the high quality crop
        throw new Error("The processed image is too large. Please select a smaller area or use a lower resolution source.");
      }

      const downloadURL = await handleUpload(croppedImageBlob);
      
      onUploadComplete(downloadURL);
      setPreviewUrl(downloadURL);
      toast({ title: 'Success', description: 'Photo uploaded in high quality.' });
      
      setIsCropModalOpen(false);
      setImgSrc('');

    } catch (error: any) {
      console.error("Storage upload error:", error);
      const message = error.message === 'Failed to fetch' 
        ? "Network error. Please check your storage CORS settings."
        : (error.message || "An unknown error occurred during upload.");
        
      toast({ 
        variant: 'destructive', 
        title: 'Upload Failed', 
        description: message
      });
      setPreviewUrl(initialImageUrl || null);
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
            <div className="relative w-full max-w-xs aspect-video rounded-2xl border-2 border-dashed bg-muted/20 flex items-center justify-center overflow-hidden shadow-md">
              {previewUrl ? (
                <Image src={previewUrl} alt="Preview" fill className="object-contain" unoptimized />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground/20" />
              )}
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-full border">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Processing High Quality...</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={handleFileSelect} className="h-10 px-6 rounded-full font-bold shadow-sm">
                <Camera className="mr-2 h-4 w-4 text-primary"/>
                {previewUrl ? 'Update Identity' : 'Set Profile Photo'}
            </Button>
            {previewUrl && (
              <Button 
                type="button" 
                variant="ghost" 
                className="h-10 px-6 rounded-full font-bold text-destructive hover:text-destructive hover:bg-destructive/10" 
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

      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl">
          <div className="p-6 border-b bg-muted/10">
            <DialogHeader>
                <DialogTitle className="text-xl font-black font-headline uppercase tracking-tight">Refine Your Identity</DialogTitle>
                <p className="text-sm text-muted-foreground">Crop the image to set your profile appearance.</p>
            </DialogHeader>
          </div>
          <div className="p-6 overflow-hidden flex justify-center bg-black/5 min-h-[300px]">
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
                  className="max-h-[60vh] w-auto object-contain"
                />
              </ReactCrop>
            )}
          </div>
          <DialogFooter className="p-6 border-t bg-muted/10 flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsCropModalOpen(false)} disabled={isLoading} className="flex-1 font-bold">Cancel</Button>
            <Button onClick={handleCrop} disabled={!completedCrop || isLoading} className="flex-1 font-black shadow-lg shadow-primary/20 h-12">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CropIcon className="mr-2 h-4 w-4" />}
              {isLoading ? 'ENHANCING...' : 'CONFIRM APPEARANCE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
