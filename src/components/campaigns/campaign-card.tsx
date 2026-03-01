
"use client";

import Link from "next/link";
import { format, formatDistanceToNow, parse, isSameDay } from "date-fns";
import { CalendarDays, MapPin, Users, Share2, Edit, MoreVertical, Loader2, MessageSquare, UserCheck2, PlayCircle } from "lucide-react";
import type { Campaign, CampaignParticipant, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, serverTimestamp, query, where, limit, getDocs, addDoc, doc, runTransaction, getDoc } from "firebase/firestore";
import { useState, useRef, useEffect, useMemo } from "react";
import { ManageCampaignForm } from "./manage-campaign-form";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { LogSoulForm } from "../souls/log-soul-form";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Skeleton } from "../ui/skeleton";


function ParticipantsDialog({ campaign, children }: { campaign: Campaign; children: React.ReactNode; }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const participantsQuery = useMemo(() => {
    // Only create query when dialog is open and user is organizer to avoid unnecessary fetches/permission errors
    if (!isOpen || !firestore || !user || user.uid !== campaign.organizerId) return null;
    return query(collection(firestore, 'campaigns', campaign.id, 'participants'));
  }, [isOpen, firestore, campaign.id, user, campaign.organizerId]);

  const { data: participants, loading } = useCollection<CampaignParticipant>(participantsQuery);
  
  const organizer = useMemo(() => participants?.find(p => p.id === campaign.organizerId), [participants, campaign.organizerId]);
  const otherParticipants = useMemo(() => participants?.filter(p => p.id !== campaign.organizerId), [participants, campaign.organizerId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Participants for "{campaign.title}"</DialogTitle>
          <DialogDescription>
            {loading ? 'Loading...' : `${campaign.participants || 0} people have joined this campaign.`}
            <br/>
             {user?.uid !== campaign.organizerId && (
                <span className="text-xs">Note: Only the campaign organizer can see the full participant list.</span>
             )}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!loading && participants && (
             <div className="space-y-4">
                {organizer && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">ORGANIZER</h3>
                        <div className="flex items-center justify-between rounded-lg p-3 bg-muted/50">
                            <span className='font-medium'>{organizer.displayName}</span>
                        </div>
                    </div>
                )}
                {otherParticipants && otherParticipants.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">PARTICIPANTS ({otherParticipants.length})</h3>
                    <div className="space-y-2">
                      {otherParticipants.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className='font-medium'>{p.displayName}</span>
                           {p.email && <span className="text-sm text-muted-foreground">{p.email}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
           {!loading && (!participants || participants.length === 0) && user?.uid === campaign.organizerId && (
                <p className="text-center text-muted-foreground py-4">No other participants yet.</p>
           )}
           {!loading && !participants && user?.uid !== campaign.organizerId && (
            <p className="text-center text-muted-foreground py-4">You do not have permission to view the participant list.</p>
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


export function CampaignCard({ campaign, userId, isJoined }: { campaign: Campaign; userId?: string, isJoined: boolean }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const isOwner = campaign.organizerId === userId;
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (descriptionRef.current) {
      // We need to check after a small delay to ensure rendering is complete
      const checkTruncation = () => {
        if (descriptionRef.current) {
          setIsDescriptionTruncated(
            descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight
          );
        }
      };
      setTimeout(checkTruncation, 100); // A small delay
      window.addEventListener('resize', checkTruncation); // Re-check on resize
      return () => window.removeEventListener('resize', checkTruncation);
    }
  }, [campaign.description]);

  const handleViewGroupChat = () => {
    if (!campaign.id) return;
    
    if (campaign.hasGroupChat) {
        router.push(`/dashboard/chats/${campaign.id}`);
    } else {
        toast({
            title: "Group Chat Not Started",
            description: "The organizer has not started the group chat for this campaign yet.",
        });
    }
  };


  const handleJoin = async () => {
    if (!user || !firestore) return;
    setIsJoining(true);

    const campaignRef = doc(firestore, 'campaigns', campaign.id);
    const joinedRef = doc(firestore, 'users', user.uid, 'joinedCampaigns', campaign.id);
    const participantRef = doc(firestore, 'campaigns', campaign.id, 'participants', user.uid);

    try {
        await runTransaction(firestore, async (transaction) => {
            const campaignDoc = await transaction.get(campaignRef);
            if (!campaignDoc.exists()) {
                throw "Campaign does not exist!";
            }
            
            const currentCampaign = campaignDoc.data() as Campaign;
            if (currentCampaign.maxParticipants && currentCampaign.participants >= currentCampaign.maxParticipants) {
                throw new Error("This campaign is already full.");
            }

            const newParticipantCount = (currentCampaign.participants || 0) + 1;
            transaction.update(campaignRef, { participants: newParticipantCount });

            const joinData = {
                campaignId: campaign.id,
                joinedAt: serverTimestamp(),
            };
            transaction.set(joinedRef, joinData);

            const participantData: { [key: string]: any; } = {
                userId: user.uid,
                displayName: user.displayName || 'Anonymous',
                photoURL: user.photoURL || null,
                joinedAt: serverTimestamp()
            };
            if (user.email) {
                participantData.email = user.email;
            }
            transaction.set(participantRef, participantData);
            
            if (user.uid !== campaign.organizerId) {
                const notificationRef = doc(collection(firestore, `users/${campaign.organizerId}/notifications`));
                const notificationData = {
                    userId: campaign.organizerId,
                    type: 'campaign_join',
                    title: 'New Participant!',
                    message: `${user.displayName || 'A new user'} has joined your campaign: "${campaign.title}"`,
                    link: `/dashboard/campaigns`,
                    isRead: false,
                    createdAt: serverTimestamp(),
                };
                transaction.set(notificationRef, notificationData);
            }
        });
        
        toast({
            title: "Campaign Joined!",
            description: `You have successfully joined the "${campaign.title}" campaign.`,
        });

    } catch (error: any) {
        if (error.name === 'FirestoreError' && error.code === 'aborted') {
            toast({ variant: 'destructive', title: "Join Failed", description: `Could not join campaign as it was updated during the process. It might be full. Please try again.` });
        } else {
            const permissionError = new FirestorePermissionError({
                path: `TRANSACTION:JOIN_CAMPAIGN:${campaign.id}`,
                operation: 'write',
                requestResourceData: {
                    action: 'User joining campaign',
                    userId: user.uid,
                    campaignId: campaign.id
                }
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    } finally {
        setIsJoining(false);
    }
  };
  
  const handleInitiateChat = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Please log in', description: 'You must be logged in to start a chat.' });
      return;
    }
    setIsChatLoading(true);
    try {
      const participantIds = [user.uid, campaign.organizerId].sort();
      const chatsRef = collection(firestore, 'chats');
      const q = query(
        chatsRef,
        where('participantIds', '==', participantIds),
        where('campaignId', '==', campaign.id),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      let chatId: string;

      if (!querySnapshot.empty) {
        chatId = querySnapshot.docs[0].id;
      } else {
         const organizerDoc = await getDoc(doc(firestore, "users", campaign.organizerId));
         const organizerProfile = organizerDoc.data() as UserProfile | undefined;
         const newChatData = {
              participantIds,
              participantInfo: {
                  [user.uid]: {
                      displayName: user.displayName || 'User',
                      photoURL: user.photoURL || '',
                      email: user.email || '',
                  },
                  [campaign.organizerId]: {
                      displayName: campaign.organizerName,
                      photoURL: organizerProfile?.photoURL || '', 
                      email: organizerProfile?.email || '',
                  },
              },
              campaignId: campaign.id,
              campaignTitle: campaign.title,
              lastUpdatedAt: serverTimestamp(),
              hasMessages: false,
              isGroupChat: false,
          };
          const chatDocRef = await addDoc(chatsRef, newChatData);
          chatId = chatDocRef.id;
      }
      router.push(`/dashboard/chats/${chatId}`);

    } catch (error) {
       console.error("Error initiating chat:", error);
       toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not start the chat session.'});
    } finally {
      setIsChatLoading(false);
    }
  }


  const handleShare = async () => {
    const shareData = {
      title: `Join the '${campaign.title}' campaign on Testify!`,
      text: `Join me in the '${campaign.title}' evangelism campaign. Let's make an impact together!`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for desktop browsers
         handleShareDropdown('link');
      }
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback for when navigator.share fails
      handleShareDropdown('link');
    }
  };

  const handleShareDropdown = (platform: "link" | "facebook" | "twitter" | "whatsapp") => {
    const url = typeof window !== "undefined" ? window.location.origin + '/dashboard/campaigns' : '';
    const titleText = `Join the '${campaign.title}' campaign on Testify!`;
    const shareTextWithUrl = `${titleText} ${url}`;
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(titleText)}`;
        window.open(shareUrl, "_blank");
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(titleText)}`;
        window.open(shareUrl, "_blank");
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTextWithUrl)}`;
        window.open(shareUrl, "_blank");
        break;
      case "link":
        navigator.clipboard.writeText(shareTextWithUrl);
        toast({
          title: 'Link Copied!',
          description: 'Campaign link has been copied to your clipboard.',
        });
        break;
    }
  };


  const safeToDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    try {
      if (typeof value === 'object' && value.seconds) {
         const d = new Date(value.seconds * 1000);
         if(!isNaN(d.getTime())) return d;
      }
    } catch(e) {}
    return null;
  };

  const startDate = safeToDate(campaign.startDate);
  const endDate = safeToDate(campaign.endDate);

  const startTimeFormatted = campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)
    ? format(parse(campaign.startTime, 'HH:mm', new Date()), 'p')
    : campaign.startTime;

  const endTimeFormatted = campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)
    ? format(parse(campaign.endTime, 'HH:mm', new Date()), 'p')
    : campaign.endTime;

  let dateString;
  if (startDate && endDate) {
      const startFormatted = format(startDate, "PPP");
      if (isSameDay(startDate, endDate)) {
          dateString = startFormatted;
      } else {
          const endFormatted = format(endDate, "PPP");
          dateString = `${startFormatted} to ${endFormatted}`;
      }
  } else {
      dateString = "Date not set";
  }
  
  const timeString = campaign.startTime && campaign.endTime ? `${startTimeFormatted} - ${endTimeFormatted}` : "Time not set";
  
  const getStatus = (): "Ongoing" | "Upcoming" | "Past" => {
    const now = new Date();
    if (!startDate || !endDate) return "Past";
    
    const endDateTime = new Date(endDate);
    if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
        const [hours, minutes] = campaign.endTime.split(':').map(Number);
        endDateTime.setHours(hours, minutes, 59, 999);
    } else {
        endDateTime.setHours(23, 59, 59, 999);
    }

    if (endDateTime < now) return "Past";
    
    const startDateTime = new Date(startDate);
    if (campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)) {
        const [hours, minutes] = campaign.startTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);
    } else {
        startDateTime.setHours(0,0,0,0);
    }

    if (startDateTime > now) return "Upcoming";
    return "Ongoing";
  };
  const status = getStatus();

  const footerDateText = (() => {
    const createdAtDate = safeToDate(campaign.createdAt);
    if (!createdAtDate) return '';
    if (status === 'Past' && endDate) {
        const endDateTime = new Date(endDate);
        if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
            const [hours, minutes] = campaign.endTime.split(':').map(Number);
            endDateTime.setHours(hours, minutes, 59, 999);
        } else {
            endDateTime.setHours(23, 59, 59, 999);
        }
        return `Ended ${formatDistanceToNow(endDateTime, { addSuffix: true })}`;
    }
    return `Created ${formatDistanceToNow(createdAtDate, { addSuffix: true })}`;
  })();

  const LogSoulDialog = (
    <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
      <DialogTrigger asChild>
        <Button>Log Soul</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a Soul Won in "{campaign.title}"</DialogTitle>
          <DialogDescription>
            Record the details of the person ministered to during this campaign. This will appear on your personal dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <LogSoulForm
            onSoulLogged={() => {
              setIsLogSoulOpen(false);
              toast({ title: "Soul Logged!", description: "The new soul has been added to your personal dashboard." });
            }}
            defaultCampaign={campaign}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  const shareButton = (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" onClick={(e) => {
              e.preventDefault();
              if (navigator.share) {
                handleShare();
              }
            }} disabled={status === 'Past'}>
                <Share2 className="h-4 w-4" />
                <span className="sr-only">Share Campaign</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleShareDropdown('link')}>
                Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShareDropdown('whatsapp')}>
                Share on WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShareDropdown('facebook')}>
                Share on Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShareDropdown('twitter')}>
                Share on Twitter (X)
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  const isFull = campaign.maxParticipants && campaign.participants >= campaign.maxParticipants;


  const renderOwnerActions = () => (
    <div className="flex items-center gap-2">
      {LogSoulDialog}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DialogTrigger asChild>
                    <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Manage
                    </DropdownMenuItem>
                </DialogTrigger>
            </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Campaign</DialogTitle>
            <DialogDescription>
              Update the progress and details of your campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <ManageCampaignForm
              campaign={campaign}
              onCampaignUpdated={() => setIsManageOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      {shareButton}
    </div>
  );

  const renderParticipantActions = () => (
    <div className="flex items-center gap-2">
      {LogSoulDialog}
       <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button onClick={handleViewGroupChat} variant="outline" size="icon" disabled={status === 'Past'}>
                    <Users className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Group Chat</p></TooltipContent>
        </Tooltip>
       </TooltipProvider>
      {shareButton}
    </div>
  );

  const renderVisitorActions = () => (
    <div className="flex items-center gap-2">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleInitiateChat} variant="outline" size="icon" disabled={!userId || isChatLoading}>
                         {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Chat with Organizer</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
        {shareButton}
        <Button onClick={handleJoin} disabled={!userId || isJoining || status === 'Past' || isFull}>
            {isJoining ? <Loader2 className="h-4 w-4 animate-spin" />
             : isFull ? 'Campaign Full'
             : 'Join Campaign'
            }
        </Button>
    </div>
  );


  return (
    <>
        <Card id={campaign.id} className="flex flex-col h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 scroll-mt-20">
        <CardHeader className="p-6 flex flex-row items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
                <CardTitle className="font-bold text-xl truncate">{campaign.title}</CardTitle>
                <CardDescription className="text-sm mt-1 truncate">{campaign.goal}</CardDescription>
            </div>
            <Badge variant={status === 'Ongoing' ? 'default' : status === 'Upcoming' ? 'secondary' : 'outline'}>
                {status}
            </Badge>
        </CardHeader>
        <CardContent className="p-6 pt-0 flex-grow space-y-4">
            
            <div className="space-y-1">
                <p ref={descriptionRef} className="text-muted-foreground text-sm line-clamp-3">{campaign.description}</p>
                {isDescriptionTruncated && (
                    <Dialog open={showFullDescription} onOpenChange={setShowFullDescription}>
                        <DialogTrigger asChild>
                        <Button variant="link" className="p-0 h-auto text-sm">Read More</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{campaign.title}</DialogTitle>
                            <DialogDescription>Full Campaign Description</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto pr-4">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaign.description}</p>
                        </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            
            {campaign.scriptureTestimony ? (
                <blockquote className="mt-4 border-l-2 pl-4 italic text-muted-foreground">
                    &ldquo;{campaign.scriptureTestimony}&rdquo;
                    {campaign.scripture && (
                        <footer className="text-right text-xs not-italic mt-1">- Inspired by {campaign.scripture}</footer>
                    )}
                </blockquote>
            ) : campaign.scripture ? (
                <div className="mt-4 text-sm text-muted-foreground">
                    <span className="font-semibold">Inspirational Scripture:</span> {campaign.scripture}
                </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border p-3 flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-1" />
                    <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground break-words">{campaign.location}</p>
                    </div>
                </div>
                <div className="rounded-lg border p-3 flex items-start gap-3">
                    <CalendarDays className="h-5 w-5 text-primary shrink-0 mt-1" />
                    <div>
                        <p className="font-medium">Date & Time</p>
                        <p className="text-muted-foreground">{dateString}</p>
                        <p className="text-muted-foreground">{timeString}</p>
                    </div>
                </div>
            </div>

        </CardContent>
        <CardFooter className="p-6 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-auto border-t bg-muted/50">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <ParticipantsDialog campaign={campaign}>
                    <Button variant="ghost" className="h-auto p-0 justify-start text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-primary">
                        <Users className="h-4 w-4" />
                        <span>
                            {campaign.participants}
                            {campaign.maxParticipants ? ` / ${campaign.maxParticipants}` : ''} participant{campaign.participants === 1 ? '' : 's'}
                        </span>
                    </Button>
                </ParticipantsDialog>
                {(status === "Ongoing" || status === "Past") && (
                    <div className="flex items-center gap-2">
                        <UserCheck2 className="h-4 w-4" />
                        <span>{campaign.soulsLogged || 0} soul{campaign.soulsLogged === 1 ? '' : 's'} won</span>
                    </div>
                )}
            </div>

            {status === 'Ongoing' && campaign.streamUrl ? (
                <Button asChild className="w-full sm:w-auto">
                    <Link href={campaign.streamUrl} target="_blank" rel="noopener noreferrer">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Watch Live
                    </Link>
                </Button>
            ) : isOwner ? (
                renderOwnerActions()
            ) : isJoined ? (
                renderParticipantActions()
            ) : (
                renderVisitorActions()
            )}
        </CardFooter>
        <CardFooter className="p-4 bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span className="truncate">
                Created by{" "}
                <Link href={`/dashboard/profile/${campaign.organizerId}`} className="font-medium text-primary hover:underline px-1">
                    {campaign.organizerName}
                </Link>
            </span>
            <span className="flex-shrink-0">{footerDateText}</span>
        </CardFooter>
        </Card>
    </>
  );
}
