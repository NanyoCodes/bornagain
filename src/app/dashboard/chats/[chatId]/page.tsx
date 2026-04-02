import ChatPageClient from "@/components/chat/chat-page-client";

export function generateStaticParams() {
  // This satisfies the Next.js static export build requirement
  // by providing a dummy parameter. It does not generate a real page.
  return [{ chatId: 'dummy' }];
}

export default function ChatPage({ params }: { params: { chatId: string } }) {
    // The dummy page is not meant to be rendered.
    // The client component will handle the actual chatId.
    if (params.chatId === 'dummy') {
        return null;
    }
    return <ChatPageClient chatId={params.chatId} />;
}
