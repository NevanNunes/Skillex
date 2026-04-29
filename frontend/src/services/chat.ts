import { apiClient } from "@/lib/apiClient";
import type { ChatMessage, ChatRoom, Paginated } from "@/types/api";

export const chatService = {
  async rooms() {
    const { data } = await apiClient.get<Paginated<ChatRoom>>("/api/chat/rooms/");
    return data;
  },
  async messages(roomId: string) {
    const { data } = await apiClient.get<Paginated<ChatMessage>>(
      `/api/chat/rooms/${roomId}/messages/`,
      { params: { ordering: "-created_at" } },
    );
    return data;
  },
  async send(roomId: string, content: string) {
    const { data } = await apiClient.post<ChatMessage>(`/api/chat/rooms/${roomId}/send/`, { content });
    return data;
  },
  async markRead(roomId: string) {
    await apiClient.post(`/api/chat/rooms/${roomId}/read/`);
  },
};
