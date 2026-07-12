export type BackendConfig = {
  apiBaseUrl: string;
  apiToken?: string;
  requestMethod?: "POST" | "PUT" | "PATCH";
  customHeadersJson?: string;
  requestBodyTemplate?: string;
};

export type UserPreference = {
  autoExtractOnStable: boolean;
  aiTemplateId?: string;
};
