import { LitElement, css, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../types";
import type { AssistChatRichContent } from "./assist-chat-rich-content";

const stringifyBlock = (value: unknown): string =>
  JSON.stringify(value, null, 2);

@customElement("ha-assist-chat-rich-content")
export class HaAssistChatRichContent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public content: AssistChatRichContent[] = [];

  @state() private _markdownLoaded = !!customElements.get("ha-markdown");

  protected willUpdate() {
    if (
      !this._markdownLoaded &&
      this.content.some((block) => block.type === "markdown")
    ) {
      this._loadMarkdown();
    }
  }

  protected render() {
    if (!this.content.length) {
      return nothing;
    }

    return html`${this.content.map((block, index) =>
      this._renderBlock(block, index)
    )}`;
  }

  private _renderBlock(
    block: AssistChatRichContent,
    index: number
  ): TemplateResult {
    switch (block.type) {
      case "text":
        return this._renderTextBlock(block, index);
      case "markdown":
        return this._renderMarkdownBlock(block, index);
      case "code":
        return this._renderCodeBlock(block, index);
      case "entity":
        return this._renderEntityBlock(block, index);
      default:
        return this._renderFallbackBlock(block);
    }
  }

  private async _loadMarkdown() {
    await import("./ha-markdown");
    this._markdownLoaded = true;
  }

  private _renderTextBlock(
    block: AssistChatRichContent,
    _index: number
  ): TemplateResult {
    if (typeof block.content !== "string") {
      return this._renderFallbackBlock(block);
    }

    return html`<div class="block text">${block.content}</div>`;
  }

  private _renderMarkdownBlock(
    block: AssistChatRichContent,
    index: number
  ): TemplateResult {
    if (typeof block.content !== "string") {
      return this._renderFallbackBlock(block);
    }

    if (!this._markdownLoaded) {
      return this._renderTextBlock(block, index);
    }

    return html`<ha-markdown
      class="block markdown"
      breaks
      cache
      .content=${block.content}
    ></ha-markdown>`;
  }

  private _renderCodeBlock(
    block: AssistChatRichContent,
    _index: number
  ): TemplateResult {
    if (typeof block.code !== "string") {
      return this._renderFallbackBlock(block);
    }

    return html`<pre class="block code"><code>${block.code}</code></pre>`;
  }

  private _renderEntityBlock(
    block: AssistChatRichContent,
    _index: number
  ): TemplateResult {
    const entityId =
      typeof block.entity_id === "string"
        ? block.entity_id
        : typeof block.entityId === "string"
          ? block.entityId
          : undefined;

    if (!entityId) {
      return this._renderFallbackBlock(block);
    }

    return html`<div class="block entity">
      ${this._renderEntity(entityId)}
    </div>`;
  }

  private _renderEntity(entityId: string): TemplateResult {
    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return html`<div class="entity-name">${entityId}</div>`;
    }

    return html`
      <div class="entity-name">
        ${this.hass.formatEntityName(stateObj, { type: "entity" })}
      </div>
      <div class="entity-state">${this.hass.formatEntityState(stateObj)}</div>
    `;
  }

  private _renderFallbackBlock(block: AssistChatRichContent): TemplateResult {
    return html`<pre class="block code"><code>${stringifyBlock(
      block
    )}</code></pre>`;
  }

  static styles = css`
    :host {
      display: block;
      margin-top: var(--ha-space-2);
    }

    .block {
      display: block;
    }

    .block:not(:first-child) {
      margin-top: var(--ha-space-2);
    }

    .text {
      white-space: pre-wrap;
    }

    .entity {
      padding: var(--ha-space-2);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-md);
      background: var(--card-background-color);
    }

    .entity-name {
      font-weight: var(--ha-font-weight-medium, 500);
    }

    .entity-state {
      margin-top: var(--ha-space-1);
      color: var(--secondary-text-color);
    }

    .code {
      margin: 0;
      padding: var(--ha-space-3);
      border-radius: var(--ha-border-radius-md);
      overflow: auto;
      white-space: pre-wrap;
      background: var(--code-editor-gutter-color, rgba(115, 123, 124, 0.1));
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-assist-chat-rich-content": HaAssistChatRichContent;
  }
}
