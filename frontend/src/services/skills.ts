import { apiClient } from "@/lib/apiClient";
import type { LearnSkill, Skill, TeachSkill } from "@/types/api";

export const skillsService = {
  async search(query?: string) {
    const { data } = await apiClient.get<Skill[]>("/api/skills/", { params: { search: query } });
    return data;
  },
  async listTeach() {
    const { data } = await apiClient.get<TeachSkill[]>("/api/skills/teach/");
    return data;
  },
  async addTeach(payload: { skill_id: number; level: TeachSkill["level"]; description?: string }) {
    const { data } = await apiClient.post<TeachSkill>("/api/skills/teach/", payload);
    return data;
  },
  async removeTeach(id: number) {
    await apiClient.delete(`/api/skills/teach/${id}/`);
  },
  async listLearn() {
    const { data } = await apiClient.get<LearnSkill[]>("/api/skills/learn/");
    return data;
  },
  async addLearn(payload: { skill_id: number; goal?: string; priority?: LearnSkill["priority"] }) {
    const { data } = await apiClient.post<LearnSkill>("/api/skills/learn/", payload);
    return data;
  },
  async removeLearn(id: number) {
    await apiClient.delete(`/api/skills/learn/${id}/`);
  },
};
