'use client';

import ChatPageClient from "@/components/chat/chat-page-client";
import { AppShell } from "@/components/layout/app-shell";
import { useParams } from "next/navigation";

/**
 * @fileOverview Standalone root-level page for specific chat conversations.
 * Ensures the chat interface is wrapped in the AppShell and handles dynamic chatId.
 */
export default function ChatStandalonePage() {
    const params = useParams();
    const chatId = params?.chatId as string;
    
    return (
        <AppShell>
            {chatId ? <ChatPageClient chatId={chatId} /> : <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>}
        </AppShell>
    );
}