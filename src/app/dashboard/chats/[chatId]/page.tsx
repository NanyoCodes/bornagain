import ChatPageClient from "@/components/chat/chat-page-client";

export function generateStaticParams() {
  // Returning a dummy param to satisfy a persistent Next.js build error.
  return [{ chatId: 'do-not-render' }];
}

export default function ChatPage({ params }: { params: { chatId: string } }) {
    return <ChatPageClient chatId={params.chatId} />;
}
