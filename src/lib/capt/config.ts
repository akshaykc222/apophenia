export function getCaptConfig() {
  const tendersUrl =
    process.env.CAPT_TENDERS_URL?.trim() || "https://capt.gov.kw/en/";
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim() || "";
  const enabled = process.env.CAPT_SYNC_ENABLED !== "false";

  return {
    tendersUrl,
    firecrawlKey,
    enabled,
    isFirecrawlConfigured: firecrawlKey.length > 0,
  };
}
