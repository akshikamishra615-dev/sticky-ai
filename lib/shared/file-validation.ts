export const SUPPORTED_FORMATS = [
  // PDF
  { ext: "pdf", mime: "application/pdf", limit: 10 * 1024 * 1024, type: "PDF" },
  // Word
  { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", limit: 10 * 1024 * 1024, type: "Word" },
  { ext: "doc", mime: "application/msword", limit: 10 * 1024 * 1024, type: "Word" },
  // Excel
  { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", limit: 10 * 1024 * 1024, type: "Excel" },
  { ext: "xls", mime: "application/vnd.ms-excel", limit: 10 * 1024 * 1024, type: "Excel" },
  { ext: "csv", mime: "text/csv", limit: 5 * 1024 * 1024, type: "CSV" },
  // PowerPoint
  { ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", limit: 20 * 1024 * 1024, type: "PowerPoint" },
  { ext: "ppt", mime: "application/vnd.ms-powerpoint", limit: 20 * 1024 * 1024, type: "PowerPoint" },
  // Text
  { ext: "txt", mime: "text/plain", limit: 5 * 1024 * 1024, type: "Text" },
  // Images
  { ext: "jpg", mime: "image/jpeg", limit: 10 * 1024 * 1024, type: "Image" },
  { ext: "jpeg", mime: "image/jpeg", limit: 10 * 1024 * 1024, type: "Image" },
  { ext: "png", mime: "image/png", limit: 10 * 1024 * 1024, type: "Image" },
  { ext: "webp", mime: "image/webp", limit: 10 * 1024 * 1024, type: "Image" },
];
