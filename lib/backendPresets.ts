import type { BackendConfig } from "../types";

export const COZE_WORKFLOW_PRESET: BackendConfig = {
  apiBaseUrl: "https://api.coze.cn/v1/workflow/stream_run",
  requestMethod: "POST",
  customHeadersJson: JSON.stringify({ "Content-Type": "application/json" }, null, 2),
  requestBodyTemplate: JSON.stringify(
    {
      workflow_id: "",
      app_id: "",
      parameters: {
        url: "{{url}}",
        title: "{{title}}",
        content: "{{content}}",
        account: "{{account}}",
        follow_avatar: "{{follow_avatar}}",
        create_time: "{{create_time}}"
      }
    },
    null,
    2
  )
};
