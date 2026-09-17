const pdfParse = require("pdf-parse");
const { AppError } = require("../utils/errors");

async function extractPdfText(buffer) {
  try {
    const parsed = await pdfParse(buffer);
    return (parsed.text || "").trim();
  } catch (error) {
    throw new AppError(`Failed to read PDF: ${error.message}`, "PDF_READ_FAILED", 400);
  }
}

module.exports = {
  extractPdfText,
};