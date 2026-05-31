/**
 * Delete all gazette/PDF issue data (DB rows + PDF files in Storage).
 *
 * Usage:
 *   npx tsx scripts/clear-gazette-data.mts              # dry-run (counts only)
 *   npx tsx scripts/clear-gazette-data.mts --confirm    # delete everything
 *   npx tsx scripts/clear-gazette-data.mts --confirm --issue-id=<uuid>
 *
 * Requires in .env.local (or env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "gazettes";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const issueIdArg = args.find((a) => a.startsWith("--issue-id="));
const issueId = issueIdArg?.split("=")[1]?.trim() || null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function count(table: string, filter?: { column: string; value: string }) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter.column, filter.value);
  const { count: n, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

async function listIssues() {
  let q = supabase.from("pdf_issues").select("id, issue_date, storage_path, original_filename");
  if (issueId) q = q.eq("id", issueId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function deleteStoragePaths(paths: string[]) {
  if (paths.length === 0) return 0;
  const batchSize = 100;
  let removed = 0;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) throw new Error(`storage: ${error.message}`);
    removed += batch.length;
  }
  return removed;
}

async function main() {
  const issues = await listIssues();
  if (issueId && issues.length === 0) {
    console.error(`No pdf_issues row found for id ${issueId}`);
    process.exit(1);
  }

  const storagePaths = issues.map((i) => i.storage_path).filter(Boolean);

  const summary = {
    pdf_issues: issues.length,
    content_items: issueId
      ? await count("content_items", { column: "issue_id", value: issueId })
      : await count("content_items"),
    content_drafts: issueId
      ? await count("content_drafts", { column: "issue_id", value: issueId })
      : await count("content_drafts"),
    issue_text_chunks: issueId
      ? await count("issue_text_chunks", { column: "issue_id", value: issueId })
      : await count("issue_text_chunks"),
    extraction_jobs: issueId
      ? await count("extraction_jobs", { column: "issue_id", value: issueId })
      : await count("extraction_jobs"),
    storage_files: storagePaths.length,
  };

  console.log(issueId ? `Target issue: ${issueId}` : "Target: ALL gazette data");
  console.log("Will delete:");
  console.log(JSON.stringify(summary, null, 2));

  if (issues.length > 0) {
    console.log("\nIssues:");
    for (const i of issues) {
      console.log(
        `  - ${i.id} | ${i.issue_date} | ${i.original_filename ?? i.storage_path}`
      );
    }
  }

  if (!confirm) {
    console.log("\nDry run only. Re-run with --confirm to delete.");
    return;
  }

  console.log("\nDeleting…");

  if (issueId) {
    await supabase.from("content_items").delete().eq("issue_id", issueId);
    await supabase.from("content_drafts").delete().eq("issue_id", issueId);
    await supabase.from("issue_text_chunks").delete().eq("issue_id", issueId);
    await supabase.from("extraction_jobs").delete().eq("issue_id", issueId);
    await supabase.from("pdf_issues").delete().eq("id", issueId);
  } else {
    // content_items.issue_id is ON DELETE SET NULL — delete explicitly first
    await supabase.from("content_items").delete().not("issue_id", "is", null);
    await supabase
      .from("content_items")
      .delete()
      .eq("source_name", "كويت اليوم");
    await supabase.from("content_drafts").delete().not("issue_id", "is", null);
    await supabase.from("issue_text_chunks").delete().not("issue_id", "is", null);
    await supabase.from("extraction_jobs").delete().not("issue_id", "is", null);
    await supabase.from("pdf_issues").delete().not("id", "is", null);
  }

  const removedFiles = await deleteStoragePaths(storagePaths);

  console.log("Done.");
  console.log(`Removed ${removedFiles} file(s) from storage bucket "${BUCKET}".`);
  console.log("Categories, ministries, and tender_categories were NOT touched.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
