import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { extractAssistChatRichContent } from "../../src/components/assist-chat-rich-content-types";

afterEach(() => {
  document.body.innerHTML = "";
});

vi.mock("../../src/state-summary/state-card-content", () => {
  if (!customElements.get("state-card-content")) {
    customElements.define(
      "state-card-content",
      class extends HTMLElement {
        public hass: unknown;

        public stateObj: unknown;
      }
    );
  }

  return {};
});

beforeAll(async () => {
  (globalThis as any).__HASS_URL__ = "";
  await import("../../src/components/ha-assist-chat-rich-content");
});

afterAll(() => {
  delete (globalThis as any).__HASS_URL__;
});

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

describe("ha-assist-chat-rich-content", () => {
  it("renders entity blocks with state-card-content controls", async () => {
    const element = document.createElement(
      "ha-assist-chat-rich-content"
    ) as any;

    element.hass = {
      states: {
        "light.kitchen": {
          entity_id: "light.kitchen",
          state: "on",
          attributes: { friendly_name: "Kitchen lights" },
          last_changed: "2026-04-15T00:00:00.000Z",
          last_updated: "2026-04-15T00:00:00.000Z",
        },
      },
      formatEntityName: (stateObj) => stateObj.attributes.friendly_name,
      formatEntityState: (stateObj) => stateObj.state,
    };
    element.content = [{ type: "entity", entity_id: "light.kitchen" }];

    document.body.append(element);
    await element.updateComplete;

    const stateCard = element.shadowRoot!.querySelector(
      "state-card-content"
    ) as any | null;

    expect(stateCard).not.toBeNull();
    expect(stateCard!.stateObj.entity_id).toBe("light.kitchen");
    expect(stateCard!.hass).toBe(element.hass);
  });
});
