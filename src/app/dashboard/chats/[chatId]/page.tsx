import ChatPageClient from "@/components/chat/chat-page-client";

export function generateStaticParams() {
  // This satisfies the Next.js static export build requirement
  // by providing a dummy parameter.
  return [{ chatId: 'dummy' }];
}

export default function ChatPage({ params }: { params: { chatId: string } }) {
    return <ChatPageClient chatId={params.chatId} />;
}
