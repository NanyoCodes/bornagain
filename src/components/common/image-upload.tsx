
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropping state
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (!isUploading) {
      setPreviewUrl(initialImageUrl || null);
    }
  }, [initialImageUrl, isUploading]);
  
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
      if (file.size > 2 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select an image smaller than 2MB.' });
        return;
      }
      setCrop(undefined); // Reset crop on new image
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
      setIsCropModalOpen(true);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const aspectToUse = cropAspect ?? (circularCrop ? 1 : undefined);

    // Ensure makeAspectCrop receives a valid aspect ratio
    const finalAspect = aspectToUse ?? width / height;

    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, finalAspect, width, height),
      width,
      height
    );
    setCrop(crop);
  };

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current) {
      return;
    }
    
    setIsCropping(true);
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      if (croppedImageBlob.size > 2 * 1024 * 1024) {
        toast({
            variant: "destructive",
            title: "Image Too Large After Crop",
            description: "The cropped image is still larger than 2MB. Please select a smaller area or use a smaller original image.",
        });
        setIsCropping(false);
        return;
      }

      const localUrl = URL.createObjectURL(croppedImageBlob);
      setPreviewUrl(localUrl);
  
      await handleUpload(croppedImageBlob);
      setIsCropModalOpen(false);
      setImgSrc('');
    } catch (e) {
      console.error("Cropping failed", e);
      toast({
        variant: "destructive",
        title: "Crop Failed",
        description: "There was an error while cropping the image. Please try again or use a different image.",
      });
    } finally {
      setIsCropping(false);
    }
  };

  const handleUpload = async (file: File | Blob) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'You must be logged in to upload images.' });
        throw new Error("User must be logged in");
    }
    if (!storage) {
       toast({ variant: 'destructive', title: 'Upload Failed', description: 'Firebase Storage is not available.' });
       setPreviewUrl(initialImageUrl || null); // revert preview
       return;
    }
    setIsUploading(true);
    try {
      const fileName = file instanceof File ? file.name : 'cropped-image.jpg';
      const fileRef = ref(storage, `${storagePath}/${user.uid}/${Date.now()}_${fileName}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      onUploadComplete(downloadURL);
      toast({ title: 'Success', description: 'Image uploaded successfully.' });
    } catch (error: any) {
      console.error("Firebase Storage Upload Error:", error);
      let title = 'Upload Failed';
      let description = `An unknown error occurred. (Code: ${error.code || 'unknown'})`;
      if (error.code === 'storage/unauthorized' || error.code === 'storage/retry-limit-exceeded') {
        title = 'Upload Failed: Configuration Required';
        description = "This error often means your Firebase project is not on the 'Blaze' (Pay-as-you-go) plan. Please refer to `docs/storage-cors-guide.md` for instructions."
      }
      toast({ variant: 'destructive', title, description, duration: 15000 });
      setPreviewUrl(initialImageUrl || null);
    } finally {
      setIsUploading(false);
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
                <Image src={previewUrl} alt="Preview" layout="fill" objectFit="cover" />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
          )}
          {previewUrl && !isUploading && (
              <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10"
                  onClick={handleRemoveImage}
              >
                  <X className="h-4 w-4" />
              </Button>
          )}
        </div>
        
        {isUploading ? (
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
          <div className="my-4">
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
                  style={{ maxHeight: '70vh' }}
                />
              </ReactCrop>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCrop} disabled={!completedCrop || isCropping}>
              {isCropping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CropIcon className="mr-2 h-4 w-4" />}
              {isCropping ? 'Processing...' : 'Crop & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
