'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { 
    collection, 
    query, 
    addDoc, 
    serverTimestamp, 
    doc, 
    orderBy,
    updateDoc,
    deleteDoc,
    where 
} from 'firebase/firestore';
import type { Stronghold, StrongholdStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
    Plus, 
    ShieldCheck, 
    Flame, 
    Zap, 
    Loader2, 
    Trash2, 
    CheckCircle2, 
    MoreVertical,
    Info,
    ArrowRight,
    Users,
    Newspaper,
    ChevronDown
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { CreateTestimonyForm } from '@/components/testimonies/create-testimony-form';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

const strongholdCategories = [
    'Pride', 'Lust', 'Fear', 'Bitterness', 'Poverty', 'Unforgiveness', 'Anger', 'Discouragement', 'Addiction', 'Loneliness', 'Laziness', 'Confusion', 'Grief', 'Disobedience', 'Comparison', 'Self-Righteousness', 'Unbelief', 'Gluttony', 'Depression', 'Procrastination', 'Greed', 'Rejection', 'Worldliness', 'Jealousy', 'Other'
];

const victoryScriptures = [
    { text: "But thanks be to God, who gives us the victory through our Lord Jesus Christ.", ref: "1 Corinthians 15:57" },
    { text: "In all these things we are more than conquerors through him who loved us.", ref: "Romans 8:37" },
    { text: "For everyone born of God overcomes the world.", ref: "1 John 5:4" },
    { text: "The one who is in you is greater than the one who is in the world.", ref: "1 John 4:4" },
    { text: "I have given you authority... to overcome all the power of the enemy.", ref: "Luke 10:19" },
    { text: "Where sin abounded, grace abounded much more.", ref: "Romans 5:20" },
    { text: "No weapon forged against you will prevail.", ref: "Isaiah 54:17" },
    { text: "The Lord will fight for you; you need only to be still.", ref: "Exodus 14:14" }
];

export function StrongholdTracker() {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [category, setCategory] = useState('Other');
    const [title, setTitle] = useState('');
    
    const [testimonyStronghold, setTestimonyStronghold] = useState<Stronghold | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const strongholdsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'strongholds'),
            orderBy('createdAt', 'desc')
        );
    }, [user?.uid, firestore]);

    const { data: strongholds, loading } = useCollection<Stronghold>(strongholdsQuery);

    const handleAddStronghold = async () => {
        if (!user || !firestore || !title.trim()) return;
        setIsSubmitting(true);
        
        const strongholdData = {
            userId: user.uid,
            title: title.trim(),
            category,
            status: 'active' as StrongholdStatus,
            lastRelapse: serverTimestamp(),
            createdAt: serverTimestamp(),
            notes: ""
        };

        try {
            await addDoc(collection(firestore, 'users', user.uid, 'strongholds'), strongholdData);
            toast({ title: 'Victory Tracker Initialized', description: 'Transparency is the first step to victory.' });
            setIsAddOpen(false);
            setCategory('Other');
            setTitle('');
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${user.uid}/strongholds`,
                operation: 'create',
                requestResourceData: strongholdData
            }, user));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClaimVictory = async (id: string) => {
        if (!user || !firestore) return;
        const strongholdRef = doc(firestore, 'users', user.uid, 'strongholds', id);
        
        try {
            await updateDoc(strongholdRef, {
                status: 'victorious'
            });
            toast({ title: 'Hallelujah!', description: 'You have claimed victory in this area of your life.' });
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: strongholdRef.path,
                operation: 'update'
            }, user));
        }
    };

    const handleDelete = async (id: string) => {
        if (!user || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'users', user.uid, 'strongholds', id));
            toast({ title: 'Tracker Removed' });
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${user.uid}/strongholds/${id}`,
                operation: 'delete'
            }, user));
        }
    };

    const formFields = (
        <div className="space-y-6 text-left">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Area of Struggle</Label>
                <Input 
                    placeholder="e.g. My hidden pride" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category of Struggle</Label>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                        <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl text-left">
                        <ScrollArea className="h-64">
                            {strongholdCategories.map(c => (
                                <SelectItem key={c} value={c} className="rounded-xl">
                                    {c}
                                </SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </div>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">This record is <span className="font-black text-foreground">strictly private</span>. It exists only for your personal accountability before God.</p>
            </div>
        </div>
    );

    const formFooter = (
        <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Cancel</Button>
            <Button 
                onClick={handleAddStronghold} 
                disabled={isSubmitting || !title.trim()} 
                className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
            >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                BEGIN TRACKING
            </Button>
        </div>
    );

    return (
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden relative group/victory text-left">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover/victory:opacity-[0.05] transition-opacity">
                <ShieldCheck className="h-32 w-32 text-primary rotate-12" />
            </div>

            <CardHeader className="p-4 sm:p-6 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-base sm:text-lg font-black font-headline uppercase tracking-tight flex items-center gap-2">
                            <Flame className="h-5 w-5 text-primary" />
                            Victory Tracker
                        </CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60 text-left">Overcoming strongholds in Christ</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="h-10 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        DEFEAT A STRONGHOLD
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 pb-6 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
                ) : strongholds && strongholds.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {strongholds.map((s) => {
                            const isVictorious = s.status === 'victorious';
                            const circleLink = `/strongholds/${(s.category || 'Other').toLowerCase().replace(/ /g, '-')}`;
                            
                            const scriptureIdx = s.id.charCodeAt(s.id.length - 1) % victoryScriptures.length;
                            const victoryVerse = victoryScriptures[scriptureIdx];

                            return (
                                <div key={s.id} className={cn(
                                    "p-0 rounded-[1.5rem] border-2 transition-all group/item relative overflow-hidden text-left",
                                    isVictorious ? "bg-green-500/5 border-green-500/20" : "bg-muted/10 border-transparent hover:border-primary/10"
                                )}>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Link href={circleLink}>
                                                        <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black uppercase tracking-tighter bg-background/50 hover:bg-primary/10 transition-colors cursor-pointer">{s.category}</Badge>
                                                    </Link>
                                                    {isVictorious && <Badge className="h-4 px-1.5 text-[7px] font-black uppercase tracking-tighter bg-green-500 text-white border-none">Victorious</Badge>}
                                                </div>
                                                <Link href={circleLink} className="group/title">
                                                    <h4 className="font-black text-sm sm:text-base uppercase tracking-tight truncate group-hover/title:text-primary transition-colors">{s.title}</h4>
                                                </Link>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={circleLink} className="w-full flex items-center">
                                                            <Users className="mr-2 h-4 w-4" /> Enter Circle
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {isVictorious ? (
                                                        <DropdownMenuItem onSelect={() => setTestimonyStronghold(s)} className="rounded-lg">
                                                            <Newspaper className="mr-2 h-4 w-4 text-primary" /> Share Testimony
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onSelect={() => handleClaimVictory(s.id)} className="rounded-lg">
                                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Claim Victory
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => handleDelete(s.id)} className="text-destructive focus:text-destructive rounded-lg">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Tracker
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {isVictorious && (
                                            <div className="flex items-center justify-between gap-4 py-1">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    </div>
                                                    <p className="text-[10px] font-bold text-green-700 leading-tight italic break-words">
                                                        "{victoryVerse.text}" — {victoryVerse.ref}
                                                    </p>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-8 rounded-xl text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20 px-3 shrink-0"
                                                    onClick={() => setTestimonyStronghold(s)}
                                                >
                                                    <Newspaper className="mr-1.5 h-3 w-3" />
                                                    TESTIFY
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <Link href={circleLink} className="block w-full py-2.5 bg-primary/20 border-t border-primary/20 text-center group/circle hover:bg-primary/30 transition-all">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary group-hover/circle:scale-105 transition-transform flex items-center justify-center gap-1.5">
                                            ENTER VICTORY CIRCLE <ArrowRight className="h-3 w-3" />
                                        </span>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-muted/20 rounded-[2rem] border-2 border-dashed">
                        <div className="h-12 w-12 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Zap className="h-6 w-6 text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium italic px-12 text-balance leading-relaxed text-center">"For the weapons of our warfare are not carnal but mighty in God for pulling down strongholds." — 2 Cor 10:4</p>
                        <Button variant="link" onClick={() => setIsAddOpen(true)} className="mt-2 text-primary font-black uppercase text-[10px] tracking-widest w-full text-center">Initialize a Tracker</Button>
                    </div>
                )}
            </CardContent>

            {mounted && isMobile ? (
                <Drawer open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) setTitle(''); }}>
                    <DrawerContent hideCloseButton className="h-auto max-h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                            <DrawerHeader className="text-left flex-shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Warfare Protocol</span>
                                </div>
                                <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight">Enter the Warfare</DrawerTitle>
                                <DrawerDescription className="text-sm font-medium mt-1">Naming a struggle is the first step toward the Light.</DrawerDescription>
                            </DrawerHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-8">
                                {formFields}
                            </div>
                        </ScrollArea>
                        <div className="p-8 border-t bg-background/80 backdrop-blur-sm">
                            {formFooter}
                        </div>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) setTitle(''); }}>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                        <div className="p-8 border-b bg-muted/10 text-left">
                            <DialogHeader className="text-left">
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Enter the Warfare</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-left">Naming a struggle is the first step toward the Light.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <div className="p-8">
                            {formFields}
                        </div>
                        <div className="p-8 bg-muted/5 border-t">
                            {formFooter}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            <Dialog open={!!testimonyStronghold} onOpenChange={(open) => !open && setTestimonyStronghold(null)}>
                <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90dvh] text-left">
                    <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Share Your Victory</DialogTitle>
                            <DialogDescription className="text-sm font-medium mt-1 text-left">
                                Encourage the body of Christ by sharing how God gave you victory over "{testimonyStronghold?.title}".
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-8">
                            {userProfile && testimonyStronghold && (
                                <CreateTestimonyForm 
                                    userProfile={userProfile} 
                                    onTestimonyCreated={() => {
                                        setTestimonyStronghold(null);
                                    }} 
                                />
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
