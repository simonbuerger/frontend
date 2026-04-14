import { describe, expect, it } from "vitest";
import { extractAssistChatRichContent } from "../../src/components/assist-chat-rich-content-types";

describe("extractAssistChatRichContent", () => {
  it("extracts snake_case rich content arrays", () => {
    const richContent = [{ type: "entity", entity_id: "light.kitchen" }];

    expect(extractAssistChatRichContent({ rich_content: richContent })).toEqual(
      richContent
    );
  });

  it("extracts camelCase rich content arrays", () => {
    const richContent = [{ type: "markdown", content: "**Kitchen**" }];

    expect(extractAssistChatRichContent({ richContent })).toEqual(richContent);
  });

  it("accepts top-level arrays and filters invalid blocks", () => {
    expect(
      extractAssistChatRichContent([
        { type: "text", content: "Hello" },
        { content: "Missing type" },
        "invalid",
      ])
    ).toEqual([{ type: "text", content: "Hello" }]);
  });

  it("returns an empty array for unsupported payloads", () => {
    expect(extractAssistChatRichContent(undefined)).toEqual([]);
    expect(extractAssistChatRichContent({ rich_content: "invalid" })).toEqual(
      []
    );
  });
});
