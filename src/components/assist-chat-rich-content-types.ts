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

/**
 * Supports the raw array shape as well as `rich_content` and `richContent`
 * wrappers so Assist responses can pass through backend-native snake_case data
 * or frontend-authored camelCase data without additional translation.
 */
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

export const getEntityId = (
  block: AssistChatRichContent
): string | undefined =>
  typeof block.entity_id === "string"
    ? block.entity_id
    : typeof block.entityId === "string"
      ? block.entityId
      : undefined;
