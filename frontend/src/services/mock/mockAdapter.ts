import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { handleMockRequest } from "./mockData";

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const data =
    typeof config.data === "string" && config.data
      ? safeParse(config.data)
      : config.data;

  const params: Record<string, string | number | undefined> = {};
  if (config.params) {
    Object.entries(config.params).forEach(([k, v]) => {
      params[k] = v as string | number | undefined;
    });
  }
  if (config.url?.includes("?")) {
    const usp = new URLSearchParams(config.url.split("?")[1]);
    usp.forEach((v, k) => (params[k] = v));
  }

  const { status, data: body } = await handleMockRequest({
    method: config.method ?? "get",
    url: config.url ?? "",
    data,
    params,
  });

  const response: AxiosResponse = {
    data: body,
    status,
    statusText: status >= 400 ? "Error" : "OK",
    headers: {},
    config,
    request: null,
  };

  if (status >= 400) {
    const err = new Error((body as { detail?: string })?.detail ?? "Request failed") as Error & {
      response: AxiosResponse;
      config: InternalAxiosRequestConfig;
      isAxiosError: boolean;
    };
    err.response = response;
    err.config = config;
    err.isAxiosError = true;
    throw err;
  }
  return response;
};

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}
