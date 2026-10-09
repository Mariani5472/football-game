export function parseCsv(text: string): { headers: string[]; rows: Array<{ line: number; values: Record<string, string> }> } {
  const records: Array<{ cells: string[]; line: number }> = [];
  let cells: string[] = [];
  let value = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;
  let touched = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      value += '"'; index++; touched = true;
    } else if (char === '"') {
      quoted = !quoted; touched = true;
    } else if (!quoted && char === ",") {
      cells.push(value); value = ""; touched = true;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      if (quoted) { value += "\n"; line++; touched = true; continue; }
      cells.push(value);
      if (touched || cells.some(cell => cell.trim() !== "")) records.push({ cells, line: recordLine });
      cells = []; value = ""; touched = false; line++; recordLine = line;
    } else {
      value += char; touched = true;
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field.");
  if (touched || cells.length) {
    cells.push(value);
    if (cells.some(cell => cell.trim() !== "")) records.push({ cells, line: recordLine });
  }
  if (!records.length) throw new Error("CSV file is empty.");

  const headers = records[0].cells.map(header => header.trim().replace(/^\uFEFF/, ""));
  if (headers.some(header => !header)) throw new Error("CSV column names cannot be empty.");
  if (new Set(headers).size !== headers.length) throw new Error("CSV column names must be unique.");
  const rows = records.slice(1).map(({ cells: row, line: sourceLine }) => {
    if (row.length !== headers.length) throw new Error(`Line ${sourceLine} has ${row.length} values; expected ${headers.length}.`);
    return { line: sourceLine, values: Object.fromEntries(headers.map((header, index) => [header, row[index]])) };
  });
  return { headers, rows };
}
