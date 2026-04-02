import ChatPageClient from "@/components/chat/chat-page-client";

export default function ChatPage({ params }: { params: { chatId: string } }) {
    return <ChatPageClient chatId={params.chatId} />;
}
