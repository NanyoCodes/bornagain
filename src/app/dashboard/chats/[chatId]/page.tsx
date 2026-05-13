import ChatPageClient from "@/components/chat/chat-page-client";

type Params = Promise<{ chatId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ChatPage(props: { params: Params; searchParams: SearchParams }) {
    const params = await props.params;
    await props.searchParams;
    
    return <ChatPageClient chatId={params.chatId} />;
}
