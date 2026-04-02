import ChatPageClient from "@/components/chat/chat-page-client";

export function generateStaticParams() {
  // This tells Next.js not to pre-render any chat pages at build time.
  // They will be rendered on the client-side when a user navigates to them.
  return [];
}

export default function ChatPage({ params }: { params: { chatId: string } }) {
    return <ChatPageClient chatId={params.chatId} />;
}
