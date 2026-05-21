'use client';

import { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import { useStorage, useUser } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, Crop as CropIcon } from 'lucide-react';
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
  
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.reject(new Error('Canvas context is not available'));
  }
  
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
    }, 'image/jpeg', 0.95);
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
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select an image smaller than 5MB.' });
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

    const fileName = file instanceof File ? file.name : 'cropped-image.jpg';
    const fileRef = ref(storage, `${storagePath}/${user.uid}/${Date.now()}_${fileName}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setIsLoading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      if (croppedImageBlob.size > 2 * 1024 * 1024) {
        throw new Error("The cropped image is larger than 2MB. Please select a smaller area.");
      }

      const downloadURL = await handleUpload(croppedImageBlob);
      
      onUploadComplete(downloadURL);
      setPreviewUrl(downloadURL);
      toast({ title: 'Success', description: 'Image uploaded successfully.' });
      
      setIsCropModalOpen(false);
      setImgSrc('');

    } catch (error: any) {
      console.error("Storage upload error:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Upload Failed', 
        description: error.message || "An unknown error occurred during upload."
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
            <Avatar className="h-24 w-24 border">
              <AvatarImage src={previewUrl ?? undefined} />
              <AvatarFallback><Camera className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
            </Avatar>
          ) : (
            <div className="relative w-full max-w-xs aspect-video rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <Image src={previewUrl} alt="Preview" layout="fill" objectFit="cover" unoptimized />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
          )}
          {previewUrl && !isLoading && (
              <button
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10 bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
                  onClick={handleRemoveImage}
                  type="button"
              >
                  <X className="h-4 w-4" />
              </button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading...</span>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={handleFileSelect}>
              <Camera className="mr-2 h-4 w-4"/>
              {previewUrl ? 'Change Photo' : 'Upload Photo'}
          </Button>
        )}
        <Input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden" 
          accept="image/png, image/jpeg, image/gif, image/webp"
        />
      </div>

      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Your Image</DialogTitle>
          </DialogHeader>
          <div className="my-4 overflow-hidden flex justify-center bg-black/5 rounded-lg border">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={cropAspect}
                circularCrop={circularCrop}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  style={{ maxHeight: '60vh', width: 'auto' }}
                />
              </ReactCrop>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)} disabled={isLoading} className="flex-1">Cancel</Button>
            <Button onClick={handleCrop} disabled={!completedCrop || isLoading} className="flex-1">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CropIcon className="mr-2 h-4 w-4" />}
              {isLoading ? 'Processing...' : 'Crop & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}