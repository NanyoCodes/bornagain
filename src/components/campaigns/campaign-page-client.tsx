'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { Campaign, UserProfile } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin, CalendarDays, Share2, Edit, UserCheck, PlayCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, parse } from 'date-fns';
import { ManageCampaignForm } from './manage-campaign-form';
import { LogSoulForm } from "@/components/souls/log-soul-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function CampaignPageClient({ campaignId }: { campaignId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);

    const [isManageOpen, setIsManageOpen] = useState(false);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const campaignDocRef = useMemo(() => (firestore ? doc(firestore, 'campaigns', campaignId) : null), [firestore, campaignId]);
    const { data: campaign, loading: campaignLoading, error: campaignError } = useDoc<Campaign>(campaignDocRef);

    const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

    const loading = campaignLoading || profileLoading;
    const isOwner = useMemo(() => user?.uid === campaign?.organizerId, [user, campaign]);

    const dateString = useMemo(() => {
        const start = safeToDate(campaign?.startDate);
        const end = safeToDate(campaign?.endDate);
        if (start && end) {
            if (isSameDay(start, end)) return format(start, "PPP");
            return `${format(start, "PPP")} - ${format(end, "PPP")}`;
        }
        return "Date not set";
    }, [campaign]);

    const timeString = useMemo(() => {
        if (campaign?.startTime && campaign?.endTime) {
            try {
              const start = parse(campaign.startTime, 'HH:mm', new Date());
              const end = parse(campaign.endTime, 'HH:mm', new Date());
              return `${format(start, 'p')} - ${format(end, 'p')}`;
            } catch (e) {
              return `${campaign.startTime} - ${campaign.endTime}`;
            }
        }
        return "Time not set";
    }, [campaign]);

    const handleDeleteCampaign = async () => {
      if (!campaignToDelete || !user || !firestore) return;
      setIsDeleting(true);
      const campaignRef = doc(firestore, 'campaigns', campaignToDelete.id);
      const deleteData = { status: 'deleted', deletedAt: serverTimestamp() };
      try {
          await updateDoc(campaignRef, deleteData);
          toast({ title: 'Campaign Deleted' });
          router.push('/dashboard/campaigns');
      } catch (error) {
          const permissionError = new FirestorePermissionError({ path: campaignRef.path, operation: 'update' }, user);
          errorEmitter.emit('permission-error', permissionError);
      } finally { setIsDeleting(false); }
    };

    const handleShare = async () => {
        if (!campaign) return;
        const shareUrl = `${window.location.origin}/dashboard/campaigns/${campaign.id}`;
        try {
          if (navigator.share) {
            await navigator.share({ title: campaign.title, url: shareUrl });
          } else {
            navigator.clipboard.writeText(shareUrl);
            toast({ title: 'Link Copied' });
          }
        } catch (err) { navigator.clipboard.writeText(shareUrl); toast({ title: 'Link Copied' }); }
    };
    
    const status = useMemo(() => {
        const now = new Date();
        const startDate = safeToDate(campaign?.startDate);
        const endDate = safeToDate(campaign?.endDate);
        if (!startDate || !endDate) return "Past";
        const endDateTime = new Date(endDate);
        if (campaign?.endTime) {
            const [h, m] = campaign.endTime.split(':').map(Number);
            endDateTime.setHours(h, m, 59);
        }
        if (endDateTime < now) return "Past";
        const startDateTime = new Date(startDate);
        if (campaign?.startTime) {
            const [h, m] = campaign.startTime.split(':').map(Number);
            startDateTime.setHours(h, m, 0);
        }
        return startDateTime > now ? "Upcoming" : "Ongoing";
    }, [campaign]);

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;
    if (campaignError || !campaign || campaign.status === 'deleted') return <div className="text-center p-12"><Loader2 className="mx-auto h-12 w-12 opacity-20" /><h2 className="mt-4 text-xl font-bold">Campaign Not Found</h2></div>;

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()} className="w-fit">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Back
            </Button>
            
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-bold font-headline">{campaign.title}</h1>
                <Badge variant={status === 'Ongoing' ? 'default' : 'outline'}>{status}</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {campaign.description}
                            </p>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{campaign.location}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                    Schedule
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="text-sm font-medium">{dateString}</p>
                                <p className="text-xs text-muted-foreground">{timeString}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Organizer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link href={isOwner ? '/dashboard/profile' : `/dashboard/profile/${campaign.organizerId}`} className="flex items-center gap-3 group">
                                <Avatar>
                                    <AvatarFallback>{campaign.organizerFirstName?.charAt(0)}{campaign.organizerLastName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold group-hover:underline">
                                    {campaign.organizerFirstName} {campaign.organizerLastName}
                                </span>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {status === 'Ongoing' && (
                                <Button variant="default" className="w-full" onClick={() => setIsLogSoulOpen(true)}>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Log Soul Won
                                </Button>
                            )}
                            
                            {isOwner && (
                                <Button variant="outline" className="w-full" onClick={() => setIsManageOpen(true)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Manage Campaign
                                </Button>
                            )}

                            <Button variant="outline" className="w-full" onClick={handleShare}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share with Others
                            </Button>

                            {status === 'Ongoing' && campaign.streamUrl && (
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href={campaign.streamUrl} target="_blank" rel="noopener noreferrer">
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Watch Live Stream
                                    </Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log a Soul Won in "{campaign.title}"</DialogTitle>
                        <DialogDescription>Record the details of the person you've ministered to during this campaign.</DialogDescription>
                    </DialogHeader>
                    <LogSoulForm onSoulLogged={() => setIsLogSoulOpen(false)} fellowships={[]} campaigns={[]} defaultCampaign={campaign} />
                </DialogContent>
            </Dialog>

            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage Campaign</DialogTitle>
                        <DialogDescription>Update the details or progress of your campaign.</DialogDescription>
                    </DialogHeader>
                    <ManageCampaignForm 
                        campaign={campaign} 
                        onCampaignUpdated={() => setIsManageOpen(false)} 
                        onDelete={() => { setCampaignToDelete(campaign); setIsManageOpen(false); }} 
                    />
                </DialogContent>
            </Dialog>

            {campaignToDelete && (
                <AlertDialog open={!!campaignToDelete} onOpenChange={() => setCampaignToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{campaignToDelete.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Deletion
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}