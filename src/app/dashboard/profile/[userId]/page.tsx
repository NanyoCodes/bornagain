
"use client";

import { useState, useEffect, useMemo } from "react";
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

  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOwnProfile = currentUser?.uid === userId;

  const userDocRef = useMemo(() => userId && firestore ? doc(firestore, 'users', userId) : null, [userId, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const testimoniesQuery = useMemo(() => userId && firestore ? query(collection(firestore, 'testimonies'), where('authorId', '==', userId)) : null, [userId, firestore]);
  const { data: testimonies, loading: testimoniesLoading } = useCollection<Testimony>(testimoniesQuery);

  const soulsQuery = useMemo(() => isOwnProfile && firestore ? query(collection(firestore, `users/${userId}/souls`)) : null, [isOwnProfile, firestore, userId]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const joinedCampaignsQuery = useMemo(() => isOwnProfile && firestore ? query(collection(firestore, `users/${userId}/joinedCampaigns`)) : null, [isOwnProfile, firestore, userId]);
  const { data: joinedCampaigns, loading: campaignsLoading } = useCollection<JoinedCampaign>(joinedCampaignsQuery);

  const loading = profileLoading || testimoniesLoading || (isOwnProfile && (soulsLoading || campaignsLoading));

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!userProfile) {
    return <p>User profile not found.</p>
  }
  
  const { displayName, email, photoURL, bio, location, phone } = userProfile;

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
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
             <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shrink-0">
                <AvatarImage src={photoURL ?? undefined} alt={displayName || 'user'} />
                <AvatarFallback className="text-4xl sm:text-5xl">
                    {displayName?.charAt(0) || email?.charAt(0) || 'U'}
                </AvatarFallback>
            </Avatar>
            <div className="flex-grow">
                <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div className="flex-grow">
                        <h1 className="text-2xl sm:text-3xl font-bold font-headline">{displayName}</h1>
                        <p className="text-muted-foreground mt-1">{bio || (isOwnProfile ? "You haven't shared your testimony yet. You can add one by editing your profile." : "This user hasn't shared a testimony yet.")}</p>
                    </div>
                    {isOwnProfile && (
                        <div className="mt-4 sm:mt-0 sm:ml-4 shrink-0">
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
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    {location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {location}</div>}
                    {email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</div>}
                    {phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</div>}
                </div>
            </div>
          </div>
        </CardContent>
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
