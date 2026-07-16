import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { applyImport, planApplyImport, previewImport } from "../src/lib/importer";
import type { Opportunity } from "../src/types";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const preview = args.has("--preview") || !apply;
const explicitFile = process.argv.find((arg) => arg.endsWith(".xlsx") || arg.endsWith(".csv"));
const defaultFile = path.resolve(process.cwd(), "Award_Factory_國際競賽工廠_MVP.xlsx");
const file = explicitFile ? path.resolve(explicitFile) : defaultFile;

if (!fs.existsSync(file)) {
  console.error(`Import file not found: ${file}`);
  console.error("Place Award_Factory_國際競賽工廠_MVP.xlsx in award-factory/ or pass a file path.");
  process.exit(1);
}

const workbook = XLSX.readFile(file);
const sheetName = workbook.SheetNames.find((name) => /opportunit/i.test(name)) ?? workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
const existing: Opportunity[] = [];
const result = apply ? planApplyImport(rows, existing, path.basename(file)) : previewImport(rows, existing, path.basename(file));

console.log(JSON.stringify({
  mode: preview ? "preview" : "apply",
  sourceFileName: path.basename(file),
  sheetName,
  create: result.job.createCount,
  update: result.job.updateCount,
  skip: result.job.skipCount,
  errors: result.job.errorCount,
  sampleCreates: result.create.slice(0, 3).map((item) => ({ id: item.id, name: item.name, decision: item.decision })),
  sampleErrors: result.errors.slice(0, 3)
}, null, 2));

if (apply) {
  console.log(`Applied to in-memory acceptance store: ${applyImport(result, existing).length} opportunities.`);
}
