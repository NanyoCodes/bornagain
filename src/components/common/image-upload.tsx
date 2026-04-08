
'use client';

import { useState, useRef, useEffect } from 'react';
import { useStorage, useUser } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2 } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  
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
    setIsUploading(true);

    const filePath = `${storagePath}/${user.uid}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);

    uploadBytes(storageRef, file)
      .then((snapshot) => {
        getDownloadURL(snapshot.ref).then((downloadURL) => {
          onUploadComplete(downloadURL);
          setPreviewUrl(downloadURL);
          setIsUploading(false);
          toast({ title: 'Success', description: 'Image uploaded successfully.' });
        });
      })
      .catch((error) => {
        setIsUploading(false);
        console.error("Firebase Storage Upload Error:", error);
        
        let title = "Upload Failed";
        let description = `An unknown error occurred. (Code: ${error.code})`;
        
        if (error.code === 'storage/unauthorized' || error.code === 'storage/unknown') {
            title = "Configuration Required to Enable Uploads";
            description = "This is a project setup issue, not a code bug. To fix this, you MUST run a command to update your cloud storage settings. Please open the file `docs/storage-cors-guide.md` and follow the instructions carefully.";
        }
        
        toast({
          variant: 'destructive',
          title: title,
          description: description,
          duration: 15000,
        });
      });
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onUploadComplete('');
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full py-4">
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
  );
}
