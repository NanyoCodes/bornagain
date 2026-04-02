import ChatPageClient from "@/components/chat/chat-page-client";

export function generateStaticParams() {
  // Provide a dummy param to satisfy the Next.js static export build process.
  // This page will not be pre-rendered with meaningful data.
  return [{ chatId: 'dummy' }];
}

export default function ChatPage({ params }: { params: { chatId: string } }) {
    return <ChatPageClient chatId={params.chatId} />;
}
