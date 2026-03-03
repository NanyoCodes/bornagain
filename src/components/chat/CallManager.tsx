'use client';

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { User } from 'firebase/auth';
import type { Chat, SignalingMessage } from '@/lib/types';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  getDocs,
  doc,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, PhoneIncoming, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';


// Use Google's public STUN servers. For a production app, you'd want your own TURN server.
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

type CallState = 'idle' | 'requesting' | 'incoming' | 'connecting' | 'active';

export interface CallManagerHandle {
    startCall: () => void;
}

interface CallManagerProps {
    chat: Chat;
    user: User;
}

export const CallManager = forwardRef<CallManagerHandle, CallManagerProps>(({ chat, user }, ref) => {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [callState, setCallState] = useState<CallState>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [incomingRequest, setIncomingRequest] = useState<SignalingMessage | null>(null);

    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    
    const otherParticipantId = useMemo(() => chat.participantIds.find(id => id !== user.uid), [chat.participantIds, user.uid]);
    const otherParticipantInfo = useMemo(() => otherParticipantId ? chat.participantInfo[otherParticipantId] : null, [chat.participantInfo, otherParticipantId]);

    const signalingCollection = useMemo(() => {
        if (!firestore || !chat.id) return null;
        return collection(firestore, 'chats', chat.id, 'signaling');
    }, [firestore, chat.id]);

    const sendSignal = useCallback(async (type: SignalingMessage['type'], payload: any) => {
        if (!otherParticipantId || !signalingCollection) return;
        await addDoc(signalingCollection, {
            senderId: user.uid,
            receiverId: otherParticipantId,
            type,
            payload,
            createdAt: serverTimestamp(),
        });
    }, [otherParticipantId, signalingCollection, user.uid]);
    
    // --- Connection and Cleanup Logic ---
    const setupPeerConnection = useCallback(() => {
        if (pc.current) return pc.current;

        const newPc = new RTCPeerConnection(servers);
        newPc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal('ice-candidate', event.candidate.toJSON());
            }
        };
        newPc.onconnectionstatechange = () => {
            if (newPc.connectionState === 'disconnected' || newPc.connectionState === 'failed' || newPc.connectionState === 'closed') {
                handleEndCall(false);
            }
        };
        newPc.ontrack = event => {
            remoteStream.current = event.streams[0];
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = remoteStream.current;
            }
        };

        pc.current = newPc;
        return newPc;
    }, [sendSignal]);

    const handleEndCall = useCallback(async (isInitiator = true) => {
        if (callState === 'idle') return;

        if (isInitiator && callState !== 'requesting') {
           await sendSignal('hangup', {});
        }
        
        pc.current?.close();
        pc.current = null;
        localStream.current?.getTracks().forEach(track => track.stop());
        localStream.current = null;
        if(remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

        setCallState('idle');
        setIncomingRequest(null);
        setIsMuted(false);
        
        if (signalingCollection && user?.uid) {
            try {
                const snapshot = await getDocs(query(signalingCollection, where('receiverId', '==', user.uid)));
                snapshot.forEach(doc => deleteDoc(doc.ref));
            } catch (error) {
                console.warn("Could not clean up signaling documents on call end:", error);
            }
        }

    }, [signalingCollection, user?.uid, sendSignal, callState]);

    const acquireMediaAndAttachTracks = useCallback(async (peerConnection: RTCPeerConnection) => {
        if (localStream.current) return; // Already have stream
        
        localStream.current = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        localStream.current.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream.current!);
        });
    }, []);

    // --- Signaling listener ---
    const signalingQuery = useMemo(() => {
        if (!signalingCollection || !user?.uid) return null;
        return query(signalingCollection, where("receiverId", "==", user.uid), orderBy("createdAt", "asc"));
    }, [signalingCollection, user?.uid]);
    const { data: signals } = useCollection<SignalingMessage>(signalingQuery);

    useEffect(() => {
        if (!signals || signals.length === 0 || !signalingCollection) return;
    
        signals.forEach(async (signal) => {
            try {
                switch(signal.type) {
                    case 'call-request':
                        if (callState === 'idle') {
                            setIncomingRequest(signal);
                            setCallState('incoming');
                        }
                        break;

                    case 'call-accepted':
                         if (callState === 'requesting') {
                            setCallState('connecting');
                            const currentPc = setupPeerConnection();
                            await acquireMediaAndAttachTracks(currentPc);
                            const offerDescription = await currentPc.createOffer();
                            await currentPc.setLocalDescription(offerDescription);
                            await sendSignal('offer', { sdp: offerDescription.sdp, type: offerDescription.type });
                        }
                        break;
                    
                    case 'call-declined':
                        if (callState === 'requesting') {
                            toast({ variant: 'destructive', title: 'Call Declined', description: `${otherParticipantInfo?.displayName} is not available.` });
                            handleEndCall(false);
                        }
                        break;
                    
                    case 'offer':
                         if (callState === 'connecting') {
                            const currentPc = pc.current;
                            if (currentPc) {
                                await currentPc.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit));
                                await acquireMediaAndAttachTracks(currentPc);
                                const answerDescription = await currentPc.createAnswer();
                                await currentPc.setLocalDescription(answerDescription);
                                await sendSignal('answer', { sdp: answerDescription.sdp, type: answerDescription.type });
                                setCallState('active');
                            }
                        }
                        break;

                    case 'answer':
                        if (pc.current && pc.current.signalingState === 'have-local-offer') {
                            const answerDescription = new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit);
                            await pc.current.setRemoteDescription(answerDescription);
                            setCallState('active');
                        }
                        break;
                    
                    case 'ice-candidate':
                        if (pc.current && pc.current.remoteDescription) {
                            const candidate = new RTCIceCandidate(signal.payload as RTCIceCandidateInit);
                            await pc.current.addIceCandidate(candidate);
                        }
                        break;

                    case 'hangup':
                        handleEndCall(false);
                        break;
                }
                
                await deleteDoc(doc(signalingCollection, signal.id));

            } catch (error) {
                console.error("Error processing signal:", signal.type, error);
                handleEndCall(false);
            }
        });
    }, [signals, signalingCollection, callState, handleEndCall, acquireMediaAndAttachTracks, sendSignal, setupPeerConnection, otherParticipantInfo?.displayName, toast]);

    // --- User-initiated actions ---
    const handleCallRequest = useCallback(async () => {
        if (!otherParticipantId) return;
        setCallState('requesting');
        await sendSignal('call-request', {});
    }, [otherParticipantId, sendSignal]);

    const handleAcceptRequest = useCallback(async () => {
        if (!incomingRequest) return;
        setCallState('connecting');
        setupPeerConnection(); // Setup PC early to receive offer
        await sendSignal('call-accepted', {});
        setIncomingRequest(null);
    }, [incomingRequest, sendSignal, setupPeerConnection]);

    const handleDeclineRequest = async () => {
        if(!incomingRequest) return;
        await sendSignal('call-declined', {});
        setIncomingRequest(null);
        setCallState('idle');
    }

    const toggleMute = () => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
            setIsMuted(!track.enabled);
        });
    };

    useImperativeHandle(ref, () => ({
        startCall: () => {
            if (callState === 'idle' && !chat.isGroupChat) {
                handleCallRequest();
            }
        }
    }));
    
    if (chat.isGroupChat) return null;

    return (
        <>
            <audio ref={remoteAudioRef} autoPlay playsInline />

            <Dialog open={callState === 'incoming'}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-center">Incoming Call</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Avatar className="h-24 w-24">
                           <AvatarImage src={otherParticipantInfo?.photoURL} />
                           <AvatarFallback className="text-4xl">{otherParticipantInfo?.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="text-xl font-semibold">{otherParticipantInfo?.displayName}</p>
                        <p className="text-sm text-muted-foreground animate-pulse">is calling...</p>
                    </div>
                    <DialogFooter className="grid grid-cols-2 gap-2">
                        <Button variant="destructive" size="lg" onClick={handleDeclineRequest}>
                            <PhoneOff className="mr-2 h-5 w-5" />
                            Decline
                        </Button>
                        <Button variant="default" size="lg" className="bg-green-600 hover:bg-green-700" onClick={handleAcceptRequest}>
                             <Phone className="mr-2 h-5 w-5" />
                            Accept
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={['requesting', 'connecting', 'active'].includes(callState)} onOpenChange={(open) => !open && handleEndCall()}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-sm">
                     <DialogHeader>
                        <DialogTitle className="text-center">
                            {callState === 'requesting' && 'Calling...'}
                            {callState === 'connecting' && 'Connecting...'}
                            {callState === 'active' && otherParticipantInfo?.displayName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Avatar className={cn("h-24 w-24", callState === 'active' && 'border-2 border-green-500', callState === 'requesting' && 'animate-pulse')}>
                           <AvatarImage src={otherParticipantInfo?.photoURL} />
                           <AvatarFallback className="text-4xl">{otherParticipantInfo?.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {(callState === 'connecting') && <Loader2 className="h-6 w-6 animate-spin mt-4" />}
                    </div>
                    <DialogFooter className={cn("grid gap-2", callState === 'requesting' ? 'grid-cols-1' : 'grid-cols-2')}>
                        {callState !== 'requesting' && (
                             <Button variant="secondary" size="lg" onClick={toggleMute}>
                                {isMuted ? <MicOff /> : <Mic />}
                            </Button>
                        )}
                         <Button variant="destructive" size="lg" onClick={() => handleEndCall()}>
                            <PhoneOff />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
});

CallManager.displayName = 'CallManager';

    