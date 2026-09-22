import { describe, expect, it } from "vitest";
import { richHtmlToText, sanitizeRichHtml } from "./sanitize-html";

describe("sanitizeRichHtml", () => {
  it("preserves supported rich-text formatting", () => {
    const result = sanitizeRichHtml(
      '<h2>Resumo</h2><p style="text-align: center; color: #123456">Texto <strong>forte</strong></p>',
    );

    expect(result).toContain("<h2>Resumo</h2>");
    expect(result).toContain("<strong>forte</strong>");
    expect(result).toContain("text-align:center");
  });

  it("removes scripts, event handlers and unsafe URLs", () => {
    const result = sanitizeRichHtml(
      '<script>alert(1)</script><p onclick="alert(2)">Olá</p><a href="javascript:alert(3)">link</a><svg onload="alert(4)" />',
    );

    expect(result).toBe("<p>Olá</p><a>link</a>");
  });

  it("adds isolation to links opened in a new tab", () => {
    expect(sanitizeRichHtml('<a href="https://example.com" target="_blank">site</a>')).toContain(
      'rel="noopener noreferrer"',
    );
  });
});

describe("richHtmlToText", () => {
  it("returns text without interpreting encoded markup as HTML", () => {
    expect(richHtmlToText("<p>Olá <strong>mundo</strong></p>")).toBe("Olá mundo");
    expect(richHtmlToText("&lt;img src=x onerror=alert(1)&gt;")).toBe(
      "&lt;img src=x onerror=alert(1)&gt;",
    );
  });
});
