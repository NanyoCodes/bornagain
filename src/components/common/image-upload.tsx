'use client';

import { useState, useRef } from 'react';
import { useStorage, useUser } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface ImageUploadProps {
  initialImageUrl?: string | null;
  onUploadComplete: (url: string) => void;
  storagePath: string; // e.g., 'profile-pictures'
}

export function ImageUpload({ initialImageUrl, onUploadComplete, storagePath }: ImageUploadProps) {
  const { user } = useUser();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.' });
        return;
    }
    
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select an image smaller than 5MB.' });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    handleUpload(file);
  };

  const handleUpload = (file: File) => {
    if (!user || !storage) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to upload images.' });
        return;
    }
    setIsUploading(true);
    setUploadProgress(0);

    const filePath = `${storagePath}/${user.uid}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        setIsUploading(false);
        setUploadProgress(null);
        console.error("Upload error:", error);
        
        let description = 'An unknown error occurred during upload. Please try again.';
        if (error.code === 'storage/unauthorized') {
            description = "You do not have permission to upload. Please ensure your project's Storage Security Rules and CORS policy are configured correctly. Refer to the storage setup guide in the documentation.";
        } else if (error.code === 'storage/canceled') {
            description = "The upload was canceled.";
        }
        
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description,
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          onUploadComplete(downloadURL);
          setPreviewUrl(downloadURL);
          setIsUploading(false);
          setUploadProgress(null);
          toast({ title: 'Success', description: 'Image uploaded successfully.' });
        });
      }
    );
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onUploadComplete('');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-24 w-24 border">
          <AvatarImage src={previewUrl ?? undefined} />
          <AvatarFallback><Camera className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
        </Avatar>
        {previewUrl && !isUploading && (
            <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemoveImage}
            >
                <X className="h-4 w-4" />
            </Button>
        )}
      </div>
      
      {isUploading && uploadProgress !== null ? (
        <div className="w-full max-w-xs text-center">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm mt-2 text-muted-foreground">Uploading... {Math.round(uploadProgress)}%</p>
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
  );
}
