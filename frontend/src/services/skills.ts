import { apiClient } from "@/lib/apiClient";
import type { LearnSkill, Paginated, Skill, TeachSkill } from "@/types/api";

export const skillsService = {
  async search(query?: string) {
    const { data } = await apiClient.get<Paginated<Skill>>("/api/skills/", { params: { search: query } });
    return data.results; // unwrap pagination for convenience
  },
  async listTeach() {
    const { data } = await apiClient.get<Paginated<TeachSkill>>("/api/skills/teach/");
    return data.results;
  },
  async addTeach(payload: { skill_id: string; proficiency_level: TeachSkill["proficiency_level"]; description?: string }) {
    const { data } = await apiClient.post<TeachSkill>("/api/skills/teach/", payload);
    return data;
  },
  async removeTeach(id: string) {
    await apiClient.delete(`/api/skills/teach/${id}/`);
  },
  async listLearn() {
    const { data } = await apiClient.get<Paginated<LearnSkill>>("/api/skills/learn/");
    return data.results;
  },
  async addLearn(payload: { skill_id: string; current_level: LearnSkill["current_level"] }) {
    const { data } = await apiClient.post<LearnSkill>("/api/skills/learn/", payload);
    return data;
  },
  async removeLearn(id: string) {
    await apiClient.delete(`/api/skills/learn/${id}/`);
  },
};
