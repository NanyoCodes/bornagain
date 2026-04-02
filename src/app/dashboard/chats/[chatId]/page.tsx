import ChatPageClient from "@/components/chat/chat-page-client";

export function generateStaticParams() {
  return [];
}

export default function ChatPage({ params }: { params: { chatId: string } }) {
    return <ChatPageClient chatId={params.chatId} />;
}
