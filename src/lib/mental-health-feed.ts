export interface PublicHealthStat {
  id: string;
  label: string;
  value: string;
  context: string;
  sourceName: string;
  sourceUrl: string;
  asOf: string;
}

export interface ExpertResource {
  id: string;
  title: string;
  tidbit: string;
  sourceName: string;
  sourceUrl: string;
}

export interface ExternalArticle {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string | null;
}

const NIMH_MAIN_FEED_URLS = [
  "https://www.nimh.nih.gov/site-info/index-rss.atom",
  "https://www.nimh.nih.gov/site-info/index-rss.xml",
];

const MEN_MENTAL_HEALTH_KEYWORDS = [
  "men",
  "man",
  "male",
  "father",
  "fathers",
  "boy",
  "boys",
  "husband",
  "masculinity",
  "veteran men",
];

const MEN_FALLBACK_ARTICLES: ExternalArticle[] = [
  {
    id: "nimh-men-and-mental-health",
    title: "Men and Mental Health",
    url: "https://www.nimh.nih.gov/health/topics/men-and-mental-health",
    sourceName: "NIMH",
    publishedAt: null,
  },
  {
    id: "nimh-suicide-data",
    title: "Suicide Data and Statistics",
    url: "https://www.nimh.nih.gov/health/statistics/suicide",
    sourceName: "NIMH",
    publishedAt: null,
  },
  {
    id: "nimh-publications",
    title: "NIMH Brochures and Fact Sheets (Men's Mental Health topic)",
    url: "https://www.nimh.nih.gov/health/publications",
    sourceName: "NIMH",
    publishedAt: null,
  },
];

export const publicHealthStats: PublicHealthStat[] = [
  {
    id: "men-suicide-rate",
    label: "Suicide rate among males (U.S.)",
    value: "22.8",
    context: "Deaths per 100,000 in 2023",
    sourceName: "NIMH Suicide Statistics",
    sourceUrl: "https://www.nimh.nih.gov/health/statistics/suicide",
    asOf: "2023",
  },
  {
    id: "men-vs-women-suicide",
    label: "Relative suicide risk (male vs female)",
    value: "Nearly 4x",
    context: "Males die by suicide at nearly four times the rate of females",
    sourceName: "NIMH Suicide Statistics",
    sourceUrl: "https://www.nimh.nih.gov/health/statistics/suicide",
    asOf: "2023",
  },
  {
    id: "treatment-gap-men",
    label: "Treatment uptake among men",
    value: "Lower",
    context: "Men are less likely to have received mental health treatment than women in the past year",
    sourceName: "NIMH Men's Mental Health",
    sourceUrl: "https://www.nimh.nih.gov/health/topics/men-and-mental-health",
    asOf: "NIMH guidance",
  },
];

export const expertReviewedResources: ExpertResource[] = [
  {
    id: "nimh-men-topic",
    title: "NIMH: Men and Mental Health",
    tidbit:
      "How mental health symptoms can show up in men, warning signs, and when to seek help.",
    sourceName: "NIMH",
    sourceUrl: "https://www.nimh.nih.gov/health/topics/men-and-mental-health",
  },
  {
    id: "nimh-men-facts",
    title: "NIMH Men's Mental Health Fact Sheets",
    tidbit:
      "Expert-reviewed explainers and printable resources for men's mental health topics.",
    sourceName: "NIMH",
    sourceUrl: "https://www.nimh.nih.gov/health/publications",
  },
  {
    id: "nimh-suicide-stats",
    title: "NIMH Suicide Data and Statistics",
    tidbit:
      "Official U.S. suicide trends and breakdowns useful for understanding men's risk patterns.",
    sourceName: "NIMH",
    sourceUrl: "https://www.nimh.nih.gov/health/statistics/suicide",
  },
];

function looksMenFocused(text: string): boolean {
  const lower = text.toLowerCase();
  return MEN_MENTAL_HEALTH_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function decodeXml(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripTags(raw: string): string {
  return decodeXml(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(
    /<[^>]*>/g,
    ""
  );
}

function pickTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return null;
  return stripTags(match[1]).trim() || null;
}

function pickLink(block: string): string | null {
  const href = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
  if (href?.[1]) return href[1];
  const content = pickTag(block, "link");
  return content;
}

function normalizeUrl(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `https://www.nimh.nih.gov${raw}`;
  return `https://www.nimh.nih.gov/${raw.replace(/^\.\//, "")}`;
}

export async function fetchNimhArticles(limit = 8): Promise<ExternalArticle[]> {
  for (const url of NIMH_MAIN_FEED_URLS) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/atom+xml, application/xml, text/xml" },
      });
      if (!response.ok) continue;

      const xml = await response.text();
      const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
      const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
      const blocks = entryBlocks.length > 0 ? entryBlocks : itemBlocks;
      if (blocks.length === 0) continue;

      const parsed = blocks
        .map((block, index): ExternalArticle | null => {
          const title = pickTag(block, "title");
          const link = normalizeUrl(pickLink(block) ?? "");
          const publishedAt =
            pickTag(block, "updated") ?? pickTag(block, "published") ?? pickTag(block, "pubDate");

          if (!title || !link) return null;
          return {
            id: `${link}-${index}`,
            title,
            url: link,
            sourceName: "NIMH",
            publishedAt,
          };
        })
        .filter((item): item is ExternalArticle => Boolean(item))
        .filter((item) => looksMenFocused(`${item.title} ${item.url}`))
        .slice(0, limit);

      if (parsed.length > 0) return parsed;
    } catch {
      // Try the next feed URL.
    }
  }

  return MEN_FALLBACK_ARTICLES.slice(0, limit);
}

export function summarizeForApp(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("men") || lower.includes("male")) {
    return "Short take: this explains common ways mental health concerns can show up in men and when to seek support.";
  }
  if (lower.includes("father")) {
    return "Short take: this covers stress, burnout, and emotional health patterns often seen in fathers and caregivers.";
  }
  if (lower.includes("anxiety")) {
    return "Short take: this helps men recognize anxiety signs that are often masked by irritability, overwork, or withdrawal.";
  }
  if (lower.includes("depression")) {
    return "Short take: this breaks down depression symptoms in men and practical treatment options that actually help.";
  }
  if (lower.includes("suicide") || lower.includes("988") || lower.includes("crisis")) {
    return "Short take: this highlights men's suicide-risk patterns and when to use urgent support like 988 immediately.";
  }
  return "Short take: this is a men's mental-health update translated into practical, app-friendly language.";
}
