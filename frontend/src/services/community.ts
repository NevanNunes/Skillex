import { apiClient } from "@/lib/apiClient";
import type { Comment, Community, Paginated, Post, PostSort, PostType } from "@/types/api";

export const communityService = {
  async list() {
    const { data } = await apiClient.get<Paginated<Community>>("/api/communities/");
    return data;
  },
  async create(payload: { name: string; description: string }) {
    const { data } = await apiClient.post<Community>("/api/communities/", payload);
    return data;
  },
  async detail(id: number) {
    const { data } = await apiClient.get<Community>(`/api/communities/${id}/`);
    return data;
  },
  async join(id: number) {
    const { data } = await apiClient.post<Community>(`/api/communities/${id}/join/`);
    return data;
  },
  async leave(id: number) {
    const { data } = await apiClient.delete<Community>(`/api/communities/${id}/leave/`);
    return data;
  },
  async posts(id: number, sort: PostSort = "new") {
    const { data } = await apiClient.get<Paginated<Post>>(`/api/communities/${id}/posts/`, {
      params: { sort },
    });
    return data;
  },
  async createPost(id: number, payload: { title: string; body: string; type: PostType }) {
    const { data } = await apiClient.post<Post>(`/api/communities/${id}/posts/create/`, payload);
    return data;
  },
  async post(id: number) {
    const { data } = await apiClient.get<Post>(`/api/posts/${id}/`);
    return data;
  },
  async votePost(id: number, value: -1 | 0 | 1) {
    const { data } = await apiClient.post<Post>(`/api/posts/${id}/vote/`, { value });
    return data;
  },
  async acceptComment(postId: number, commentId: number) {
    const { data } = await apiClient.put<Post>(`/api/posts/${postId}/accept/${commentId}/`);
    return data;
  },
  async comments(postId: number) {
    const { data } = await apiClient.get<Paginated<Comment>>(`/api/posts/${postId}/comments/`);
    return data;
  },
  async createComment(postId: number, payload: { body: string; parent_id?: number | null }) {
    const { data } = await apiClient.post<Comment>(`/api/posts/${postId}/comments/create/`, payload);
    return data;
  },
  async voteComment(postId: number, commentId: number, value: -1 | 0 | 1) {
    const { data } = await apiClient.post<Comment>(
      `/api/posts/${postId}/comments/${commentId}/vote/`, { value },
    );
    return data;
  },
};
