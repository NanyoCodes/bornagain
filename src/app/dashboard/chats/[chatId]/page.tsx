import ChatPageClient from "@/components/chat/chat-page-client";

type Params = Promise<{ chatId: string }>;

export default async function ChatPage(props: { params: Params }) {
    const params = await props.params;
    return <ChatPageClient chatId={params.chatId} />;
}
