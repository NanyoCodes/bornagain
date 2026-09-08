'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useAuth, useDoc, useUserProfile, useCollection, useFirestore } from '@/firebase';
import { useSearch } from '@/context/search-context';
import { doc, collection, addDoc, serverTimestamp, query, getDocs, where, writeBatch, arrayRemove, getDoc, deleteDoc } from 'firebase/firestore';
import type { AccountabilityRequest, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    HeartHandshake, 
    MessagesSquare, 
    MoreVertical, 
    UserX, 
    User, 
    CheckCircle2, 
    XCircle, 
    BellRing, 
    BookOpen, 
    Edit,
    Quote,
    ShieldCheck,
    Zap,
    Users,
    ArrowRight,
    Sparkles,
    Briefcase,
    Heart,
    Mail,
    Phone,
    MapPin,
    Globe,
    Smartphone,
    MessageSquare,
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccountabilitySettingsCard } from '@/components/settings/accountability-settings-card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format, isToday } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const accountabilityVerses = [
    { text: "Iron sharpens iron, and one man sharpens another.", ref: "Proverbs 27:17" },
    { text: "Two are better than one, because they have a good reward for their toil.", ref: "Ecclesiastes 4:9" },
    { text: "Therefore encourage one another and build one another up.", ref: "1 Thessalonians 5:11" },
    { text: "Bear one another's burdens, and so fulfill the law of Christ.", ref: "Galatians 6:2" },
];

function AccountabilitySidebar({ partnerCount = 0, pendingCount = 0 }: { partnerCount?: number, pendingCount?: number }) {
    const verse = useMemo(() => accountabilityVerses[Math.floor(Math.random() * accountabilityVerses.length)], []);

    return (
        <div className="hidden lg:flex flex-col gap-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar pb-10 text-left">
            <Card className="rounded-3xl border-none shadow-lg bg-indigo-600 text-white overflow-hidden border-b-8 border-b-black/10 shrink-0 text-left">
                <CardHeader className="p-6 pb-2 text-left">
                    <div className="flex items-center justify-between mb-2 text-left">
                        <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center text-left">
                            <HeartHandshake className="h-5 w-5 text-white text-left" />
                        </div>
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-black text-[9px] uppercase tracking-widest text-left">Active Alliance</Badge>
                    </div>
                    <CardTitle className="text-xl font-black font-headline uppercase tracking-tight text-left">Alliance Hub</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-3 text-left">
                        <div className="bg-white/10 rounded-2xl p-3 text-center border border-white/10 text-left">
                            <p className="text-2xl font-black text-center">{partnerCount}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 text-center">Partners</p>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-3 text-center border border-white/10 text-left">
                            <p className="text-2xl font-black text-center">{pendingCount}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 text-center">Requests</p>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed opacity-80 text-balance text-left">
                        Strategic spiritual support through mutual observation and prayer.
                    </p>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden shrink-0 text-left">
                <CardHeader className="p-5 pb-2 text-left">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 text-left">
                        <BookOpen className="h-4 w-4 text-primary text-left" /> Iron Sharpens Iron
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-4 text-left">
                    <div className="p-5 rounded-2xl bg-muted/20 border-2 border-dashed border-primary/20 relative group text-left">
                        <Quote className="absolute top-2 right-4 h-8 w-8 opacity-5 rotate-12 transition-transform group-hover:scale-110 text-left" />
                        <p className="text-sm font-medium italic leading-relaxed text-muted-foreground text-balance text-left">
                            &ldquo;{verse.text}&rdquo;
                        </p>
                        <p className="text-[9px] font-black text-primary text-right mt-3 uppercase tracking-widest text-left">— {verse.ref}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden shrink-0 text-left">
                <CardHeader className="p-5 pb-2 text-left">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground text-left">Kingdom Protocol</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-left">
                    {[
                        { icon: ShieldCheck, label: "Strict Confidentiality", color: "text-blue-500" },
                        { icon: Zap, label: "Regular Nudges", color: "text-amber-500" },
                        { icon: Sparkles, label: "Prayer Agreement", color: "text-primary" },
                        { icon: Users, label: "Truth with Love", color: "text-indigo-600" },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/10 border border-transparent text-left">
                            <item.icon className={cn("h-4 w-4 text-left", item.color)} />
                            <span className="text-[10px] font-bold uppercase tracking-tight text-left">{item.label}</span>
                        </div>
                    ))}
                </CardContent>
                <CardFooter className="p-5 pt-0 text-left">
                    <div className="p-4 bg-muted/30 rounded-2xl border border-dashed text-center w-full text-left">
                        <p className="text-[9px] font-bold text-muted-foreground leading-relaxed italic uppercase tracking-widest text-center text-left">
                            "Bearing one another's burdens"
                        </p>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

const disciplines = [
  { id: 'pray', label: 'Pray' },
  { id: 'read_bible', label: 'Read Bible' },
  { id: 'attend_church', label: 'Church' },
  { id: 'take_notes', label: 'Journal' },
];

function PartnerDisciplineStatus({ partnerId, date }: { partnerId: string; date: Date }) {
    const firestore = useFirestore();
    const dateStr = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
    
    const disciplineDocRef = useMemo(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', partnerId, 'disciplineHistory', dateStr);
    }, [firestore, partnerId, dateStr]);

    const { data: partnerDiscipline, loading } = useDoc<{ completed?: string[] }>(disciplineDocRef);
    const completedOnDate = partnerDiscipline?.completed || [];

    if (loading) {
        return (
            <div className="flex justify-around items-center h-12 bg-muted/5 rounded-xl border border-dashed text-left">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground text-left" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse text-left">Checking records...</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-4 gap-1 items-center h-14 text-left">
            {disciplines.map(d => (
                <div key={d.id} className="flex flex-col items-center gap-1.5 text-[9px] sm:text-[10px] text-center min-w-0 text-left">
                    {completedOnDate.includes(d.id) ? (
                        <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center text-left">
                            <CheckCircle2 className="h-4 w-4 text-green-500 text-left" />
                        </div>
                    ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-left">
                            <XCircle className="h-4 w-4 text-muted-foreground/30 text-left" />
                        </div>
                    )}
                    <span className={cn(
                        "leading-tight uppercase font-black tracking-tighter truncate w-full px-1 text-center text-left",
                        completedOnDate.includes(d.id) ? 'text-foreground' : 'text-muted-foreground/60'
                    )}>
                        {d.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

function PartnerCard({ 
    partner, 
    onNudge, 
    onChat, 
    onRemove 
}: { 
    partner: UserProfile['accountabilityPartners'][0], 
    onNudge: (p: any) => void, 
    onChat: (p: any) => void, 
    onRemove: (p: any) => void 
}) {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    
    const partnerDocRef = useMemo(() => partner.userId ? doc(firestore, 'users', partner.userId) : null, [firestore, partner.userId]);
    const { data: partnerProfile } = useDoc<UserProfile>(partnerDocRef);
    const livePhotoURL = partnerProfile?.photoURL || partner.photoURL;
    const phone = partnerProfile?.phone;
    
    const selectedDate = useMemo(() => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }, [dateStr]);

    return (
        <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x border-b-2 sm:border-b shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all border-l-4 border-l-primary/10 text-left">
            <CardHeader className="flex flex-col items-start p-4 sm:p-6 gap-4 text-left">
                 <div className="flex items-start gap-4 min-w-0 w-full text-left">
                    <Dialog>
                      <DialogTrigger asChild disabled={!livePhotoURL}>
                        <div className="relative cursor-pointer active:scale-95 transition-transform hover:scale-105 shrink-0 text-left">
                            <Avatar className="h-11 w-11 sm:h-14 sm:w-14 border shadow-sm text-left">
                                <AvatarImage src={livePhotoURL} className="object-contain text-left" />
                                <AvatarFallback className="font-black text-lg bg-primary/10 text-primary text-left">{partner.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                      </DialogTrigger>
                      {livePhotoURL && (
                          <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center text-left">
                              <DialogHeader className="sr-only text-center text-left"><DialogTitle className="text-left">Profile photo</DialogTitle></DialogHeader>
                              <div className="relative h-full w-full flex items-center justify-center p-4 text-left">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-left text-left">
                                    <Image src={livePhotoURL} alt="partner" fill className="object-contain shadow-2xl ring-4 ring-white/10 text-left text-left" unoptimized />
                                </div>
                              </div>
                          </DialogContent>
                      )}
                    </Dialog>
                    <div className="min-w-0 flex-1 text-left">
                        <div className="group inline-flex flex-col text-left max-w-full text-left">
                            <Link href={`/profile/${partner.userId}`} className="text-sm sm:text-base font-black truncate hover:underline leading-none uppercase tracking-tight max-w-[140px] sm:max-w-[200px] text-left">{partner.firstName} {partner.lastName}</Link>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 opacity-60 truncate text-left">Spiritual Partner</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 w-full text-left mt-3">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-primary/20 text-primary hover:text-primary hover:bg-primary/5 shadow-md bg-background text-left" onClick={() => onNudge({...partner, phone})}>
                                            <BellRing className="h-3.5 w-3.5 text-left" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-left"><p className="text-[10px] font-bold uppercase text-left">Nudge {partner.firstName}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-full border-primary/20 text-primary hover:text-primary hover:bg-primary/5 shadow-md bg-background text-left" 
                                            onClick={() => setIsMessageOpen(true)}
                                        >
                                            <Smartphone className="h-3.5 w-3.5 text-left" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-left"><p className="text-[10px] font-bold uppercase text-left">Connect Externally</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-primary/20 text-primary hover:text-primary hover:bg-primary/5 shadow-md bg-background text-left" onClick={() => onChat(partner)}>
                                            <MessagesSquare className="h-3.5 w-3.5 text-left" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-left"><p className="text-[10px] font-bold uppercase text-left">Chat with {partner.firstName}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-left">
                                <MoreVertical className="h-4 w-4 text-left" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl text-left">
                            <DropdownMenuItem onSelect={() => router.push(`/profile/${partner.userId}`)} className="rounded-lg text-left">
                                <User className="mr-2 h-4 w-4 text-left" /> View Identity
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => router.push('/bible')} className="rounded-lg text-left">
                                <BookOpen className="mr-2 h-4 w-4 text-left" /> Word Study
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="text-left" />
                            <DropdownMenuItem className="text-destructive focus:text-destructive rounded-lg text-left" onSelect={() => onRemove(partner)}>
                                <UserX className="mr-2 h-4 w-4 text-left" /> End Alliance
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6 text-left">
                <div className="pt-4 border-t border-dashed space-y-4 text-left">
                    <div className="flex justify-between items-center gap-2 text-left">
                        <div className="flex items-center gap-1.5 text-left">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse text-left" />
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">Discipline Records</h4>
                        </div>
                        <Input 
                            type="date" 
                            value={dateStr} 
                            onChange={(e) => setDateStr(e.target.value)} 
                            className="w-[140px] h-8 text-[10px] sm:text-xs font-bold uppercase tracking-tighter bg-muted/20 border-none rounded-lg text-left"
                        />
                    </div>
                    <PartnerDisciplineStatus partnerId={partner.userId} date={selectedDate} />
                </div>
            </CardContent>

            <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">
                    <DialogHeader className="text-center space-y-2 text-left">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-center text-left">
                            <MessageSquare className="h-7 w-7 text-primary text-center text-left" />
                        </div>
                        <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-balance text-left">Message {partner.firstName}</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-center text-balance text-left">Choose how to encourage your partner externally.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 pt-6 text-left">
                        <Button 
                            onClick={() => {
                                if (!phone) {
                                    toast({ variant: 'destructive', title: 'Phone Missing', description: `${partner.firstName} hasn't provided a phone number.` });
                                    return;
                                }
                                const cleanPhone = phone.replace(/\+/g, '').replace(/\D/g, '');
                                const msg = encodeURIComponent(`Hi ${partner.firstName}, just checking in to see how you're doing with your daily disciplines. Let's keep growing together on Testify! ${window.location.origin}\n\nGod bless you!`);
                                window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                                setIsMessageOpen(false);
                            }} 
                            className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-center text-left"
                        >
                            <WhatsAppIcon className="h-5 w-5 text-center text-left" /> WhatsApp
                        </Button>
                        <Button 
                            onClick={() => {
                                if (!phone) {
                                    toast({ variant: 'destructive', title: 'Phone Missing', description: `${partner.firstName} hasn't provided a phone number.` });
                                    return;
                                }
                                const msg = encodeURIComponent(`Hi ${partner.firstName}, just checking in to see how you're doing with your daily disciplines. Let's keep growing together on Testify! ${window.location.origin}\n\nGod bless you!`);
                                window.location.href = `sms:${phone}?body=${msg}`;
                                setIsMessageOpen(false);
                            }} 
                            variant="outline" 
                            className="h-14 rounded-2xl gap-3 font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-center text-left"
                        >
                            <MessageSquare className="h-5 w-5 text-center text-left" /> Standard SMS
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

export default function AccountabilityPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isChatLoading, setIsChatLoading] = useState<string | null>(null);
  const [removalTarget, setRemovalTarget] = useState<UserProfile['accountabilityPartners'][0] | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  useEffect(() => {
    setIsSearchVisible(true);
    setSearchPlaceholder("Search partners by name...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

  const userDocRef = useMemo(() => (user?.uid ? doc(firestore, 'users', user.uid) : null), [user?.uid, firestore]);
  const { data: userProfile, loading: loadingProfile } = useDoc<UserProfile>(userDocRef);

  const requestsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'accountabilityRequests'), where('participantIds', 'array-contains', user.uid));
  }, [user?.uid, firestore]);
  const { data: allRequests } = useCollection<AccountabilityRequest>(requestsQuery);

  const pendingRequestsCount = useMemo(() => allRequests?.filter(r => r.status === 'pending').length || 0, [allRequests]);
  const activePartnersCount = useMemo(() => allRequests?.filter(r => r.status === 'accepted').length || 0, [allRequests]);

  const partners = userProfile?.accountabilityPartners || [];

  const filteredPartners = useMemo(() => {
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId) {
          if (!uniqueMap.has(p.userId) || (!uniqueMap.get(p.userId).photoURL && p.photoURL)) {
            uniqueMap.set(p.userId, p);
          }
        }
    });
    const uniquePartners = Array.from(uniqueMap.values());
    if (!searchTerm) return uniquePartners;
    const lowercasedTerm = searchTerm.toLowerCase();
    return uniquePartners.filter(partner => `${partner.firstName} ${partner.lastName}`.toLowerCase().includes(lowercasedTerm));
  }, [partners, searchTerm]);

  const handleNudgePartner = async (partner: { userId: string, firstName: string, lastName: string, phone?: string }) => {
    if (!user || !firestore || !userProfile) return;
    try {
        await addDoc(collection(firestore, 'users', partner.userId, 'notifications'), {
            userId: partner.userId,
            type: 'accountability_nudge',
            title: 'Kingdom Nudge!',
            message: `${userProfile.firstName} is encouraging you to complete your daily disciplines. Check your progress on Testify!`,
            link: '/growth',
            isRead: false,
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Nudge Sent!', description: `You've sent an internal encouragement notification to ${partner.firstName}.` });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${partner.userId}/notifications`, operation: 'create' }, user));
    }
  };

  const handleInitiateChat = async (partner: { userId: string, firstName: string, lastName: string, photoURL?: string }) => {
    if (!user || !firestore || !userProfile) return;
    setIsChatLoading(partner.userId);
    try {
        const participantIds = [user.uid, partner.userId].sort();
        const chatsRef = collection(firestore, 'chats');
        const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
        const querySnapshot = await getDocs(q);
        let existingChat = querySnapshot.docs.find(doc => !doc.data().campaignId);
        let chatId: string;

        if (existingChat) {
            chatId = existingChat.id;
        } else {
            const partnerUserRef = doc(firestore, 'users', partner.userId);
            const partnerDoc = await getDoc(partnerUserRef);
            const pProfile = partnerDoc.data() as UserProfile;
            
            const chatPayload = {
                participantIds,
                participantInfo: {
                    [user.uid]: {
                        firstName: userProfile.firstName || '',
                        lastName: userProfile.lastName || '',
                        photoURL: userProfile.photoURL || '',
                    },
                    [partner.userId]: {
                        firstName: partner.firstName,
                        lastName: partner.lastName,
                        photoURL: pProfile?.photoURL || partner.photoURL || '',
                    }
                },
                lastUpdatedAt: serverTimestamp(),
                isGroupChat: false,
                hasMessages: false
            };
            const chatDocRef = await addDoc(chatsRef, chatPayload);
            chatId = chatDocRef.id;
        }
        router.push(`/chats/${chatId}`);
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `chats`, operation: 'create' }, user));
    } finally { setIsChatLoading(null); }
  };

  const handleRemovePartner = async (e: React.MouseEvent) => {
    if (!user || !firestore || !userProfile?.accountabilityPartners || !removalTarget || !removalReason.trim()) {
        return;
    }
    
    e.preventDefault();
    const partnerId = removalTarget.userId;
    const partnerName = removalTarget.firstName;
    setIsRemoving(partnerId);

    try {
        const batch = writeBatch(firestore);
        const requestId = [user.uid, partnerId].sort().join('_');
        const requestRef = doc(firestore, 'accountabilityRequests', requestId);
        const partnerUserRef = doc(firestore, 'users', partnerId);
        const partnerDoc = await getDoc(partnerUserRef);

        if (partnerDoc.exists()) {
             const pData = partnerDoc.data() as UserProfile;
            const myEntryInPartnerList = pData.accountabilityPartners?.find(p => p.userId === user.uid);
            if (myEntryInPartnerList) {
                batch.update(partnerUserRef, { 
                    accountabilityPartners: arrayRemove(myEntryInPartnerList), 
                    partnerIds: arrayRemove(user.uid) 
                });
            }
        }

        const myEntryForPartner = userProfile.accountabilityPartners?.find(p => p.userId === partnerId);
        if (myEntryForPartner) {
            batch.update(doc(firestore, 'users', user.uid), { 
                accountabilityPartners: arrayRemove(myEntryForPartner), 
                partnerIds: arrayRemove(partnerId) 
            });
        }
        
        batch.delete(requestRef);
        const notificationRef = doc(collection(firestore, `users/${partnerId}/notifications`));
        batch.set(notificationRef, { 
            userId: partnerId, 
            type: 'accountability_partner_removed', 
            title: 'Alliance Ended', 
            message: `${userProfile.firstName} ${userProfile.lastName} has ended your accountability partnership. Reason: ${removalReason}`, 
            link: '/accountability', 
            isRead: false, 
            createdAt: serverTimestamp() 
        });

        await batch.commit();
        toast({ title: 'Partner Removed', description: `Alliance with ${partnerName} has ended.` });
        setRemovalTarget(null);
    } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${partnerId}`, operation: 'write' }, user));
    } finally { 
        setIsRemoving(null); 
        setRemovalReason(''); 
    }
  };

  if (userLoading || loadingProfile) return <div className="flex h-full w-full flex-col items-center justify-center py-20 text-left text-left"><Loader2 className="h-12 w-12 animate-spin text-primary text-left text-left" /><p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse text-left text-left">Establishing Connection...</p></div>;
  
  return (
    <div className="w-full max-w-7xl mx-auto text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 text-left">
            <div className="lg:col-span-8 space-y-10 pb-32 text-left">
                <header className="px-4 sm:px-0 space-y-1 text-left">
                    <div className="flex items-center gap-4 text-left">
                        <div className="space-y-1 text-left">
                            <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase text-left">MY PARTNERS</h1>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2 text-left">
                                <HeartHandshake className="h-4 w-4 text-primary text-left" /> Spiritual Accountability
                            </p>
                        </div>
                    </div>
                </header>

                <div className="space-y-4 text-left">
                    {filteredPartners.map(partner => (
                        <PartnerCard key={partner.userId} partner={partner} onNudge={handleNudgePartner} onChat={handleInitiateChat} onRemove={setRemovalTarget} />
                    ))}
                    {partners.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center p-12 sm:p-24 bg-muted/20 rounded-[2rem] border-2 border-dashed border-muted text-left">
                            <div className="h-20 w-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 text-left">
                                <HeartHandshake className="h-10 w-10 text-indigo-600 opacity-40 text-left" />
                            </div>
                            <h2 className="text-2xl font-black font-headline tracking-tight uppercase opacity-60 text-center text-left">No Active Alliance</h2>
                            <p className="mt-3 max-w-xs text-sm text-muted-foreground font-medium leading-relaxed italic mx-auto text-center text-left">
                            "Two are better than one... for if they fall, the one will lift up his fellow." — Eccl 4:9-10
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-4 sm:px-0 text-left">
                    {userProfile && user && <AccountabilitySettingsCard userProfile={userProfile} userId={user.uid} />}
                </div>
            </div>

            <div className="lg:col-span-4 text-left">
                <AccountabilitySidebar partnerCount={activePartnersCount} pendingCount={pendingRequestsCount} />
            </div>
        </div>

        {removalTarget && (
            <AlertDialog open={!!removalTarget} onOpenChange={(open) => { if (!open) { setRemovalTarget(null); setRemovalReason(''); } }}>
                <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl text-left">
                    <AlertDialogHeader className="text-left">
                        <AlertDialogTitle className="text-2xl font-black font-headline leading-tight text-left">End Alliance?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left text-left">You're about to end your accountability partnership with {removalTarget?.firstName || 'this partner'}.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-4 py-6 text-left text-left">
                        <Label htmlFor="removal-reason" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left text-left text-left">Reason for Removal</Label>
                        <Textarea id="removal-reason" value={removalReason} onChange={(e) => setRemovalReason(e.target.value)} placeholder="e.g., Seasonal change, moved church..." className="text-base rounded-2xl min-h-[100px] bg-muted/20 border-none shadow-inner text-left text-left text-left text-left" />
                    </div>
                    <AlertDialogFooter className="gap-3 text-left text-left text-left text-left">
                        <AlertDialogCancel disabled={!!isRemoving} className="rounded-xl h-11 text-left text-left text-left text-left">Close</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemovePartner} disabled={!!isRemoving || !removalReason.trim()} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold text-left text-left text-left text-left">
                            {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left text-left" /> : <UserX className="mr-2 h-4 w-4 text-left text-left text-left text-left" />}
                            Confirm Removal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </div>
  );
}