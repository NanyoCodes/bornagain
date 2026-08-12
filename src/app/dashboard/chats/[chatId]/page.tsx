import ChatPageClient from "@/components/chat/chat-page-client";

type Params = Promise<{ chatId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ChatPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
    const { chatId } = await params;
    await searchParams;
    
    return <ChatPageClient chatId={chatId} />;
}
