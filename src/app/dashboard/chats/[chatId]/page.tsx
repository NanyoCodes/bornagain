import ChatPageClient from "@/components/chat/chat-page-client";

export default function ChatPage(props: { params: { chatId: string } }) {
    return <ChatPageClient chatId={props.params.chatId} />;
}
