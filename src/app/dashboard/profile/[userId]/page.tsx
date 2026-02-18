"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Loader2, Mail, MapPin, Newspaper, Phone, Target, UserCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, where, doc } from "firebase/firestore";
import type { Soul, Testimony, UserProfile, JoinedCampaign } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParams } from "next/navigation";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const { user: currentUser, loading: loadingUser } = useUser();
  const firestore = useFirestore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOwnProfile = currentUser?.uid === userId;

  const userDocRef = userId ? doc(firestore, 'users', userId) : null;
  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);

  const testimoniesQuery = userId ? query(collection(firestore, 'testimonies'), where('authorId', '==', userId)) : null;
  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const soulsQuery = isOwnProfile ? query(collection(firestore, `users/${userId}/souls`)) : null;
  const { data: soulsWon } = useCollection<Soul>(soulsQuery);

  const joinedCampaignsQuery = isOwnProfile ? query(collection(firestore, `users/${userId}/joinedCampaigns`)) : null;
  const { data: joinedCampaigns } = useCollection<JoinedCampaign>(joinedCampaignsQuery);

  const loading = loadingUser || loadingProfile || loadingTestimonies;

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!userProfile) {
    return <p>User profile not found.</p>
  }
  
  const { displayName, email, photoURL, bio, coverBannerUrl, location, phone } = userProfile;

  const stats = {
    testimonies: testimonies?.length ?? 0,
    soulsWon: soulsWon?.length ?? 0,
    campaignsJoined: joinedCampaigns?.length ?? 0,
  };
  
  const triggerButton = (
    <Button>
      <Edit className="mr-2 h-4 w-4" />
      Edit Profile
    </Button>
  );

  const formContent = <EditProfileModal userProfile={userProfile} onClose={() => setIsEditModalOpen(false)} />;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="relative">
          <Image
            src={coverBannerUrl || "https://images.unsplash.com/photo-1707130869369-c00812966290?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8YWJzdHJhY3QlMjBncmFkaWVudHxlbnwwfHx8fDE3NzEzMzcxOTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"}
            alt="Cover Banner"
            width={1200}
            height={300}
            className="w-full h-48 object-cover"
            data-ai-hint="abstract gradient"
          />
          <div className="absolute top-24 left-8">
             <Avatar className="h-32 w-32 border-4 border-background">
                <AvatarImage src={photoURL ?? undefined} alt={displayName || 'user'} />
                <AvatarFallback className="text-5xl">
                    {displayName?.charAt(0) || email?.charAt(0) || 'U'}
                </AvatarFallback>
            </Avatar>
          </div>
          {isOwnProfile && (
            <div className="absolute top-4 right-4">
              {mounted && isMobile ? (
                <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                  <SheetTrigger asChild>{triggerButton}</SheetTrigger>
                  <SheetContent side="bottom">
                    <SheetHeader>
                      <SheetTitle>Edit Profile</SheetTitle>
                      <SheetDescription>
                        Make changes to your public profile.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">
                      {formContent}
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                  <DialogTrigger asChild>{triggerButton}</DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Make changes to your public profile.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto pr-2">
                      {formContent}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>
        <div className="pt-20 px-8 pb-8">
          <h1 className="text-3xl font-bold font-headline">{displayName}</h1>
          <p className="text-muted-foreground">{bio}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {location}</div>}
            {email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</div>}
            {phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</div>}
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activity Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Newspaper className="h-4 w-4" />Testimonies</span> <Badge variant="secondary">{stats.testimonies}</Badge></div>
            {isOwnProfile && (
                <>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Target className="h-4 w-4" />Campaigns Joined</span> <Badge variant="secondary">{stats.campaignsJoined}</Badge></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><UserCheck2 className="h-4 w-4" />Souls Won</span> <Badge variant="secondary">{stats.soulsWon}</Badge></div>
                </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
