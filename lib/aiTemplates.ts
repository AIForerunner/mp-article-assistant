export type AiTemplateId =
  | "general-analysis"
  | "weekly-signal"
  | "wechat-topic"
  | "knowledge-base"
  | "structure-analysis"
  | "context-only";

export type AiTemplate = {
  id: AiTemplateId;
  name: string;
  description: string;
  instruction?: string;
};

export const DEFAULT_AI_TEMPLATE_ID: AiTemplateId = "general-analysis";

export const AI_TEMPLATES: AiTemplate[] = [
  {
    id: "general-analysis",
    name: "通用文章分析",
    description: "总结观点、事实、论据与可沉淀知识点。",
    instruction: [
      "请基于文章内容完成以下分析：",
      "",
      "1. 用简洁语言总结文章核心观点",
      "2. 提炼关键事实、判断和论据",
      "3. 区分作者明确表达的观点与可进一步推导的结论",
      "4. 指出文章中值得继续验证或讨论的部分",
      "5. 给出适合沉淀的结构化知识点"
    ].join("\n")
  },
  {
    id: "weekly-signal",
    name: "技术周刊素材",
    description: "整理为研发人员可读的周刊候选素材。",
    instruction: [
      "请将文章整理为技术周刊候选素材：",
      "",
      "1. 用一段话概括文章讲了什么",
      "2. 提炼最值得关注的技术信号",
      "3. 说明为什么值得研发人员关注",
      "4. 分析它可能对软件工程、AI Coding、Agent 或研发组织产生的影响",
      "5. 给出是否建议收入周刊及理由"
    ].join("\n")
  },
  {
    id: "wechat-topic",
    name: "公众号选题",
    description: "提炼可继续创作的公众号选题方向。",
    instruction: [
      "请基于文章提炼可继续创作的公众号选题：",
      "",
      "1. 找出文章中最有传播潜力的观点",
      "2. 找出仍未被充分解释的问题",
      "3. 给出 5 个可以独立成文的选题",
      "4. 每个选题包含标题方向、核心判断和与原文的差异",
      "5. 避免只是对原文进行简单改写"
    ].join("\n")
  },
  {
    id: "knowledge-base",
    name: "知识库沉淀",
    description: "转成适合进入知识库的结构化材料。",
    instruction: [
      "请将文章整理为适合进入知识库的结构化内容：",
      "",
      "1. 核心概念",
      "2. 关键结论",
      "3. 方法、流程或框架",
      "4. 事实、案例与数据",
      "5. 适用场景和限制条件",
      "6. 相关标签",
      "7. 与已有知识可能建立的关联"
    ].join("\n")
  },
  {
    id: "structure-analysis",
    name: "文章结构分析",
    description: "分析文章写作结构与可借鉴之处。",
    instruction: [
      "请分析文章的写作结构：",
      "",
      "1. 文章试图回答什么问题",
      "2. 开头如何建立读者兴趣",
      "3. 正文采用了什么论证结构",
      "4. 每个章节承担什么作用",
      "5. 作者如何使用案例、事实和观点",
      "6. 结尾如何完成收束",
      "7. 哪些结构设计值得借鉴，哪些部分可以改进"
    ].join("\n")
  },
  {
    id: "context-only",
    name: "仅复制文章上下文",
    description: "只复制元信息、统计信息和正文，不附加任务指令。"
  }
];

const TEMPLATE_IDS = new Set<AiTemplateId>(AI_TEMPLATES.map((template) => template.id));

export function isAiTemplateId(value: string | undefined): value is AiTemplateId {
  return Boolean(value && TEMPLATE_IDS.has(value as AiTemplateId));
}

export function getAiTemplate(templateId: AiTemplateId): AiTemplate {
  return AI_TEMPLATES.find((template) => template.id === templateId) || AI_TEMPLATES[0];
}
