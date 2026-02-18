
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Globe, Loader2, Mail, MapPin, Newspaper, Phone, Target, UserCheck2 } from "lucide-react";
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

const mockAchievements = [
    { id: 'ach-1', level: 3, name: 'Faithful Witness', description: 'Shared over 10 testimonies.' },
    { id: 'ach-2', level: 2, name: 'Campaign Enthusiast', description: 'Joined 5 campaigns.' },
    { id: 'ach-3', level: 4, name: 'Soul Winner', description: 'Led over 30 people to Christ.' },
];

function AchievementBadge({ achievement }: { achievement: (typeof mockAchievements)[0] }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-20 h-20">
          <path
            d="M50 2.5 L90 25 L90 75 L50 97.5 L10 75 L10 25 Z"
            className="fill-secondary"
          />
          <path
            d="M50 2.5 L90 25 L90 75 L50 97.5 L10 75 L10 25 Z"
            className="fill-transparent stroke-primary"
            strokeWidth="3"
          />
          <text x="50" y="58" textAnchor="middle" className="font-bold text-4xl fill-primary">
            {achievement.level}
          </text>
        </svg>
      </div>
      <p className="font-semibold text-sm">{achievement.name}</p>
      <p className="text-xs text-muted-foreground">{achievement.description}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: loadingUser } = useUser();
  const firestore = useFirestore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const userDocRef = user ? doc(firestore, 'users', user.uid) : null;
  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);

  const testimoniesQuery = user ? query(collection(firestore, 'testimonies'), where('authorId', '==', user.uid)) : null;
  const { data: testimonies } = useCollection<Testimony>(testimoniesQuery);

  const soulsQuery = user ? query(collection(firestore, `users/${user.uid}/souls`)) : null;
  const { data: soulsWon } = useCollection<Soul>(soulsQuery);

  const joinedCampaignsQuery = user ? query(collection(firestore, `users/${user.uid}/joinedCampaigns`)) : null;
  const { data: joinedCampaigns } = useCollection<JoinedCampaign>(joinedCampaignsQuery);

  const loading = loadingUser || loadingProfile;

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!user || !userProfile) {
    return <p>Please log in to see your profile.</p>
  }
  
  const { displayName, email, photoURL } = user;
  const { bio, coverBannerUrl, location, phone, website } = userProfile;

  const stats = {
    testimonies: testimonies?.length ?? 0,
    soulsWon: soulsWon?.length ?? 0,
    campaignsJoined: joinedCampaigns?.length ?? 0,
  }
  
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
        </div>
        <div className="pt-20 px-8 pb-8">
          <h1 className="text-3xl font-bold font-headline">{displayName}</h1>
          <p className="text-muted-foreground">{bio}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {location}</div>}
            {email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</div>}
            {phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</div>}
            {website && <div className="flex items-center gap-2"><Globe className="h-4 w-4" /> <a href={website} className="text-primary hover:underline">{website}</a></div>}
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Activity Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Newspaper className="h-4 w-4" />Testimonies</span> <Badge variant="secondary">{stats.testimonies}</Badge></div>
            <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Target className="h-4 w-4" />Campaigns</span> <Badge variant="secondary">{stats.campaignsJoined}</Badge></div>
            <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><UserCheck2 className="h-4 w-4" />Souls Won</span> <Badge variant="secondary">{stats.soulsWon}</Badge></div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {mockAchievements.map(ach => <AchievementBadge key={ach.id} achievement={ach} />)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
