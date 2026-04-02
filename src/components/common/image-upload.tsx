
'use client';

import { useState, useRef, useEffect } from 'react';
import { useStorage, useUser } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // This effect ensures that if the initialImageUrl prop changes from the parent
    // (e.g., after a successful form submission and re-opening the modal),
    // the preview is updated, but only if an upload isn't in progress.
    if (!isUploading) {
      setPreviewUrl(initialImageUrl || null);
    }
  }, [initialImageUrl, isUploading]);

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
    setUploadError(null);
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
        console.error("Firebase Storage Upload Error:", error);
        
        let title = "Upload Failed";
        let description = `An unknown error occurred. (Code: ${error.code})`;
        
        switch (error.code) {
          case 'storage/unauthorized':
            title = "Permission Denied: Action Required";
            description = `Your project's configuration is preventing uploads. This is usually caused by two things: (1) Your project must be on the Blaze (Pay-as-you-go) billing plan. (2) Your storage bucket needs the correct CORS settings.`;
            break;
          case 'storage/canceled':
            description = "The upload was canceled.";
            break;
          case 'storage/unknown':
             title = "Network Error: Action Required";
             description = "A network error occurred. This is most often caused by incorrect CORS settings on your Google Cloud project. Your project also needs to be on the Blaze billing plan.";
            break;
           case 'storage/object-not-found':
            description = "The file could not be found. This should not happen during an upload. Please try again.";
            break;
          case 'storage/project-not-found':
            description = "Your Firebase project could not be found. Please check your Firebase configuration.";
            break;
          case 'storage/quota-exceeded':
            title = "Storage Quota Exceeded";
            description = "You have exceeded your storage quota. Please upgrade your plan or free up space in your Firebase Storage bucket.";
            break;
        }
        
        setUploadError(description);
        toast({
          variant: 'destructive',
          title: title,
          description: "See the error message in the upload component for a step-by-step guide to fix this.",
          duration: 12000,
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          onUploadComplete(downloadURL);
          setPreviewUrl(downloadURL);
          setIsUploading(false);
          setUploadProgress(null);
          setUploadError(null);
          toast({ title: 'Success', description: 'Image uploaded successfully.' });
        });
      }
    );
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onUploadComplete('');
    setUploadError(null);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
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
            <p className="text-sm mt-2 text-muted-foreground">Uploading...</p>
        </div>
      ) : (
        <>
            <Button type="button" variant="outline" onClick={handleFileSelect} disabled={!!uploadError}>
                <Camera className="mr-2 h-4 w-4"/>
                {previewUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>
        </>
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
