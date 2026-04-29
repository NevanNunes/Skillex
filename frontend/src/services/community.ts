import { apiClient } from "@/lib/apiClient";
import type { Comment, Community, Paginated, Post, PostSort, PostType } from "@/types/api";

export const communityService = {
  async list() {
    const { data } = await apiClient.get<Paginated<Community>>("/api/communities/");
    return data;
  },
  async create(payload: { name: string; slug: string; description?: string; skill?: string }) {
    const { data } = await apiClient.post<Community>("/api/communities/", payload);
    return data;
  },
  async detail(id: string) {
    const { data } = await apiClient.get<Community>(`/api/communities/${id}/`);
    return data;
  },
  async join(id: string) {
    const { data } = await apiClient.post(`/api/communities/${id}/join/`);
    return data;
  },
  async leave(id: string) {
    await apiClient.post(`/api/communities/${id}/leave/`);
  },
  async posts(id: string, sort: PostSort = "new") {
    const { data } = await apiClient.get<Paginated<Post>>(`/api/communities/${id}/posts/`, {
      params: { sort },
    });
    return data;
  },
  async createPost(id: string, payload: { title: string; body: string; post_type: PostType; tags?: string[] }) {
    const { data } = await apiClient.post<Post>(`/api/communities/${id}/posts/create/`, payload);
    return data;
  },
  async post(id: string) {
    const { data } = await apiClient.get<Post>(`/api/posts/${id}/`);
    return data;
  },
  async votePost(id: string, vote_type: "upvote" | "downvote") {
    const { data } = await apiClient.post<Post>(`/api/posts/${id}/vote/`, { vote_type });
    return data;
  },
  async acceptComment(postId: string, commentId: string) {
    const { data } = await apiClient.put<Post>(`/api/posts/${postId}/accept/${commentId}/`);
    return data;
  },
  async comments(postId: string) {
    const { data } = await apiClient.get<Paginated<Comment>>(`/api/posts/${postId}/comments/`);
    return data;
  },
  async createComment(postId: string, payload: { body: string; parent_comment_id?: string | null }) {
    const { data } = await apiClient.post<Comment>(`/api/posts/${postId}/comments/create/`, payload);
    return data;
  },
  async voteComment(postId: string, commentId: string, vote_type: "upvote" | "downvote") {
    const { data } = await apiClient.post<Comment>(
      `/api/posts/${postId}/comments/${commentId}/vote/`, { vote_type },
    );
    return data;
  },
};
