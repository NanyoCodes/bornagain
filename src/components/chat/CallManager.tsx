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
  Timestamp,
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

type CallState = 'idle' | 'creating' | 'outgoing' | 'incoming' | 'active';

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
    const [incomingCall, setIncomingCall] = useState<SignalingMessage | null>(null);

    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    
    const otherParticipantId = chat.participantIds.find(id => id !== user.uid);
    const otherParticipantInfo = otherParticipantId ? chat.participantInfo[otherParticipantId] : null;

    const signalingCollection = useMemo(() => {
        if (!firestore || !chat.id) return null;
        return collection(firestore, 'chats', chat.id, 'signaling');
    }, [firestore, chat.id]);

    // --- Signaling listener ---
    const q = useMemo(() => {
        if (!signalingCollection || !user?.uid) return null;
        return query(signalingCollection, where("receiverId", "==", user.uid), orderBy("createdAt", "asc"));
    }, [signalingCollection, user?.uid]);
    const { data: signals } = useCollection<SignalingMessage>(q);

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

    const handleEndCall = useCallback(async (isInitiator = true) => {
        if (isInitiator) {
           await sendSignal('hangup', {});
        }
        
        pc.current?.close();
        pc.current = null;
        localStream.current?.getTracks().forEach(track => track.stop());
        localStream.current = null;
        remoteStream.current = null;
        if(remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

        setCallState('idle');
        setIncomingCall(null);
        setIsMuted(false);
        
        // Clean up any remaining signaling docs
        if (signalingCollection && user.uid) {
            const snapshot = await getDocs(query(signalingCollection, where('receiverId', '==', user.uid)));
            snapshot.forEach(doc => deleteDoc(doc.ref));
        }

    }, [signalingCollection, user.uid, sendSignal]);

    useEffect(() => {
        if (!signals || signals.length === 0 || !pc.current || !signalingCollection) return;
    
        signals.forEach(async (signal) => {
            try {
                if (signal.type === 'offer') {
                    if (callState === 'idle') {
                        setIncomingCall(signal);
                        setCallState('incoming');
                    }
                } else if (signal.type === 'answer' && pc.current?.signalingState === 'have-local-offer') {
                    const answerDescription = new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit);
                    await pc.current.setRemoteDescription(answerDescription);
                } else if (signal.type === 'ice-candidate' && pc.current?.remoteDescription) {
                    const candidate = new RTCIceCandidate(signal.payload as RTCIceCandidateInit);
                    await pc.current.addIceCandidate(candidate);
                } else if (signal.type === 'hangup') {
                    handleEndCall(false); // false because we are receiving the hangup
                }

                // Delete signal after processing
                const signalRef = doc(signalingCollection, signal.id);
                await deleteDoc(signalRef);

            } catch (error) {
                console.error("Error processing signal:", error);
            }
        });
    }, [signals, signalingCollection, callState, handleEndCall]);


    // --- Main Call Functions ---
    const handleStartCall = async () => {
        if (!otherParticipantId) return;
        setCallState('creating');

        try {
            pc.current = new RTCPeerConnection(servers);
            localStream.current = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            remoteStream.current = new MediaStream();

            localStream.current.getTracks().forEach(track => {
                pc.current?.addTrack(track, localStream.current!);
            });
            
            pc.current.ontrack = event => {
                event.streams[0].getTracks().forEach(track => {
                    remoteStream.current?.addTrack(track);
                });
            };

            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = remoteStream.current;
            }

            pc.current.onicecandidate = event => {
                if (event.candidate) {
                    sendSignal('ice-candidate', event.candidate.toJSON());
                }
            };
            
            const offerDescription = await pc.current.createOffer();
            await pc.current.setLocalDescription(offerDescription);
            
            await sendSignal('offer', { sdp: offerDescription.sdp, type: offerDescription.type });

            setCallState('outgoing');

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Call Failed', description: error.message || 'Could not start call. Check microphone permissions.' });
            handleEndCall(false);
        }
    };
    
    const handleAnswerCall = async () => {
        if (!incomingCall || !otherParticipantId) return;
        setCallState('creating');

        try {
            pc.current = new RTCPeerConnection(servers);
            localStream.current = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            remoteStream.current = new MediaStream();
            
            localStream.current.getTracks().forEach(track => {
                pc.current?.addTrack(track, localStream.current!);
            });

            pc.current.ontrack = event => {
                event.streams[0].getTracks().forEach(track => {
                    remoteStream.current?.addTrack(track);
                });
            };

            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = remoteStream.current;
            }

            pc.current.onicecandidate = event => {
                if (event.candidate) {
                    sendSignal('ice-candidate', event.candidate.toJSON());
                }
            };

            await pc.current.setRemoteDescription(new RTCSessionDescription(incomingCall.payload as RTCSessionDescriptionInit));
            
            const answerDescription = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answerDescription);

            await sendSignal('answer', { sdp: answerDescription.sdp, type: answerDescription.type });
            
            setCallState('active');
            setIncomingCall(null);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Call Failed', description: error.message || 'Could not answer call. Check microphone permissions.' });
            handleEndCall(false);
        }
    };
    
    const handleDeclineCall = async () => {
        if(incomingCall) {
            if (!signalingCollection) return;
            await addDoc(signalingCollection, {
                senderId: user.uid,
                receiverId: incomingCall.senderId,
                type: 'hangup',
                createdAt: serverTimestamp(),
            });
        }
        setIncomingCall(null);
        setCallState('idle');
    }

    const toggleMute = () => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
            setIsMuted(!track.enabled);
        });
    };

    // --- Imperative handle to expose startCall to parent ---
    useImperativeHandle(ref, () => ({
        startCall: () => {
            if (callState === 'idle' && !chat.isGroupChat) {
                handleStartCall();
            }
        }
    }));
    
    // --- Render logic ---
    if (chat.isGroupChat) return null;

    return (
        <>
            <audio ref={remoteAudioRef} autoPlay playsInline />

            {/* Incoming Call Dialog */}
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
                        <Button variant="destructive" size="lg" onClick={handleDeclineCall}>
                            <PhoneOff className="mr-2 h-5 w-5" />
                            Decline
                        </Button>
                        <Button variant="default" size="lg" className="bg-green-600 hover:bg-green-700" onClick={handleAnswerCall}>
                             <Phone className="mr-2 h-5 w-5" />
                            Accept
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Active/Outgoing Call View */}
            <Dialog open={callState === 'active' || callState === 'outgoing' || callState === 'creating'}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-center">
                            {callState === 'outgoing' ? 'Calling...' : callState === 'creating' ? 'Connecting...' : otherParticipantInfo?.displayName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Avatar className={cn("h-24 w-24", callState === 'active' && 'border-2 border-green-500')}>
                           <AvatarImage src={otherParticipantInfo?.photoURL} />
                           <AvatarFallback className="text-4xl">{otherParticipantInfo?.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {callState === 'creating' && <Loader2 className="h-6 w-6 animate-spin mt-4" />}
                    </div>
                    <DialogFooter className="grid grid-cols-3 gap-2">
                        <Button variant="secondary" size="lg" onClick={toggleMute}>
                           {isMuted ? <MicOff /> : <Mic />}
                        </Button>
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
