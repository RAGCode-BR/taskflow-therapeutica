import sanitizeHtmlLibrary from "sanitize-html";

const allowedStyles = {
  "*": {
    color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^[a-z]+$/i],
    "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^[a-z]+$/i],
    "text-align": [/^(left|right|center|justify)$/],
    "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/],
    "font-weight": [/^(normal|bold|bolder|lighter|[1-9]00)$/],
    "font-style": [/^(normal|italic|oblique)$/],
    "text-decoration": [/^(?:none|underline|line-through)(?:\s+(?:underline|line-through))*$/],
  },
};

/** Sanitizes user- and AI-generated rich text before it reaches the DOM or database. */
export function sanitizeRichHtml(value: string | null | undefined): string {
  return sanitizeHtmlLibrary(value ?? "", {
    allowedTags: [
      "p",
      "br",
      "div",
      "span",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "code",
      "pre",
      "blockquote",
      "a",
      "hr",
      "mark",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "font",
    ],
    allowedAttributes: {
      "*": ["style"],
      a: ["href", "target", "rel", "title"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      ol: ["start"],
      font: ["color", "size", "face"],
    },
    allowedStyles,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
        },
      }),
    },
  });
}

/** Converts rich text to safe plain text for compact previews and labels. */
export function richHtmlToText(value: string | null | undefined): string {
  return sanitizeHtmlLibrary(value ?? "", {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => text,
  })
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escapes plain text for the few complete HTML documents created for print previews. */
export function escapeHtmlText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
