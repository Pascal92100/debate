export type MediaAttachment = {
  url: string;
  pathname: string;
  contentType: string;
  name: string;
};

export function validMediaAttachments(value: unknown): value is MediaAttachment[] {
  return Array.isArray(value) && value.length <= 8 && value.every((item) => item && typeof item.url === "string" && /^https:\/\//.test(item.url) && typeof item.pathname === "string" && typeof item.contentType === "string" && /^(image\/|video\/)/.test(item.contentType) && typeof item.name === "string");
}