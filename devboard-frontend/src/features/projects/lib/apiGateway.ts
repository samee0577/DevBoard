import { api } from "./api";
import { deriveProject } from "./applyTaskToggle";
import type { ProjectGateway } from "./gateway";
import type { projectType } from "../types/project";

// The real implementation. Every method is a thin wrapper over the existing
// `api` client, so behaviour and error handling are unchanged from before the
// gateway was introduced.
//
// Reads re-run `deriveProject` on the way out so the denormalised `completion` and
// feature `status` columns the server sends can never be stale in the UI.
export const apiGateway: ProjectGateway = {
  isSandbox: false,

  async listProjects() {
    return (await api.get("/api/projects")) as projectType[];
  },

  async getProject(projectId) {
    return deriveProject((await api.get(`/api/projects/${projectId}`)) as projectType);
  },

  async editProject(input) {
    return api.put("/api/projects", input);
  },

  async deleteProject(projectId) {
    return api.delete(`/api/projects/delete/${projectId}`);
  },

  async addFeature(projectId, feature) {
    return api.put(`/api/projects/${projectId}/features`, feature);
  },

  async updateFeature(projectId, featureId, feature) {
    return api.put(`/api/projects/${projectId}/features/${featureId}`, feature);
  },

  async deleteFeature(projectId, featureId) {
    return api.delete(`/api/projects/${projectId}/features/${featureId}`);
  },

  async toggleTask({ taskId, status, featureId, projectId }) {
    return api.put("/api/projects/toggleTask", { taskId, status, featureId, projectId });
  },

  detailHref(projectId) {
    return `/projectDetail/${projectId}`;
  },
};