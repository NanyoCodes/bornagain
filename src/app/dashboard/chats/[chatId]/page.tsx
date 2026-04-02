import ChatPageClient from "@/components/chat/chat-page-client";

export function generateStaticParams() {
  return [{ chatId: 'dummy' }];
}

export default function ChatPage({ params }: { params: { chatId: string } }) {
    if (params.chatId === 'dummy') {
        return null;
    }
    return <ChatPageClient chatId={params.chatId} />;
}
