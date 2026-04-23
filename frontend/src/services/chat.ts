import { apiClient } from "@/lib/apiClient";
import type { ChatMessage, ChatRoom, Paginated } from "@/types/api";

export const chatService = {
  async rooms() {
    const { data } = await apiClient.get<Paginated<ChatRoom>>("/api/chat/rooms/");
    return data;
  },
  async messages(roomId: number) {
    const { data } = await apiClient.get<Paginated<ChatMessage>>(
      `/api/chat/rooms/${roomId}/messages/`,
    );
    return data;
  },
  async send(roomId: number, body: string) {
    const { data } = await apiClient.post<ChatMessage>(`/api/chat/rooms/${roomId}/send/`, { body });
    return data;
  },
  async markRead(roomId: number) {
    await apiClient.post(`/api/chat/rooms/${roomId}/read/`);
  },
};
