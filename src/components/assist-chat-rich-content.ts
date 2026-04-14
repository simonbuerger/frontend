export interface AssistChatRichContentBase {
  type: string;
  [key: string]: unknown;
}

export type AssistChatRichContent = AssistChatRichContentBase;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAssistChatRichContent = (
  value: unknown
): value is AssistChatRichContent =>
  isObject(value) && typeof value.type === "string";

export const extractAssistChatRichContent = (
  extraData: unknown
): AssistChatRichContent[] => {
  const candidate = Array.isArray(extraData)
    ? extraData
    : isObject(extraData) && Array.isArray(extraData.rich_content)
      ? extraData.rich_content
      : isObject(extraData) && Array.isArray(extraData.richContent)
        ? extraData.richContent
        : undefined;

  return candidate?.filter(isAssistChatRichContent) ?? [];
};
