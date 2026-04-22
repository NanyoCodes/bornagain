import ChatPageClient from "@/components/chat/chat-page-client";

export default function ChatPage({ params, searchParams }: { params: { chatId: string }, searchParams: { [key: string]: string | string[] | undefined } }) {
    return <ChatPageClient chatId={params.chatId} />;
}
