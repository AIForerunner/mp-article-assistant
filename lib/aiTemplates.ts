export type AiTemplateId =
  | "article-summary"
  | "key-insights"
  | "knowledge-base"
  | "structure-analysis"
  | "context-only";

export type AiTemplate = {
  id: AiTemplateId;
  name: string;
  description: string;
  instruction?: string;
};

export const DEFAULT_AI_TEMPLATE_ID: AiTemplateId = "article-summary";

export const AI_TEMPLATES: AiTemplate[] = [
  {
    id: "article-summary",
    name: "文章总结",
    description: "总结文章内容、核心观点和主要结论。",
    instruction: [
      "请基于文章内容完成总结：",
      "",
      "1. 用一段话说明文章主要讲了什么",
      "2. 提炼文章的核心观点",
      "3. 列出主要事实、案例或论据",
      "4. 总结作者最终得出的结论",
      "5. 指出文章中值得继续关注的问题"
    ].join("\n")
  },
  {
    id: "key-insights",
    name: "观点与信息提炼",
    description: "区分事实、观点、判断和可进一步推导的信息。",
    instruction: [
      "请提炼文章中的关键信息：",
      "",
      "1. 提取重要事实和数据",
      "2. 提取作者明确表达的观点",
      "3. 提取文章中的关键判断",
      "4. 区分原文结论与可进一步推导的结论",
      "5. 指出需要进一步验证的信息",
      "6. 给出最值得记住的 5 个要点"
    ].join("\n")
  },
  {
    id: "knowledge-base",
    name: "知识库沉淀",
    description: "整理为适合长期保存和检索的结构化知识。",
    instruction: [
      "请将文章整理为适合进入知识库的结构化内容：",
      "",
      "1. 核心概念",
      "2. 关键结论",
      "3. 方法、流程或框架",
      "4. 事实、案例和数据",
      "5. 适用场景",
      "6. 限制条件",
      "7. 相关标签",
      "8. 可以与哪些已有知识建立关联"
    ].join("\n")
  },
  {
    id: "structure-analysis",
    name: "文章结构分析",
    description: "分析文章的组织方式、论证结构和写作方法。",
    instruction: [
      "请分析文章的写作结构：",
      "",
      "1. 文章试图回答什么问题",
      "2. 开头如何引出问题并吸引读者",
      "3. 正文采用了什么组织或论证结构",
      "4. 每个主要章节承担什么作用",
      "5. 作者如何使用案例、事实和观点",
      "6. 结尾如何完成收束",
      "7. 哪些结构值得借鉴",
      "8. 哪些部分仍可以改进"
    ].join("\n")
  },
  {
    id: "context-only",
    name: "仅复制文章上下文",
    description: "复制文章内容和结构化信息，不附加分析要求。"
  }
];

const TEMPLATE_IDS = new Set<AiTemplateId>(AI_TEMPLATES.map((template) => template.id));

const LEGACY_TEMPLATE_ID_MAP: Record<string, AiTemplateId> = {
  "general-analysis": "article-summary",
  "weekly-signal": "article-summary",
  "wechat-topic": "key-insights"
};

export function isAiTemplateId(value: string | undefined): value is AiTemplateId {
  return Boolean(value && TEMPLATE_IDS.has(value as AiTemplateId));
}

export function resolveAiTemplateId(value: string | undefined): AiTemplateId {
  if (isAiTemplateId(value)) {
    return value;
  }

  if (value && LEGACY_TEMPLATE_ID_MAP[value]) {
    return LEGACY_TEMPLATE_ID_MAP[value];
  }

  return DEFAULT_AI_TEMPLATE_ID;
}

export function getAiTemplate(templateId: AiTemplateId): AiTemplate {
  return AI_TEMPLATES.find((template) => template.id === templateId) || AI_TEMPLATES[0];
}
