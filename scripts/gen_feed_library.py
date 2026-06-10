"""Generate src/lib/feedLibrary.ts from the Main Feed library xlsx."""
import json
import openpyxl

XLSX = r"d:\work\Innovations\AI Pashu Sahayak\Knowledge Repository\Main Feed library .xlsx"
OUT = r"d:\work\Innovations\AI Pashu Sahayak\c-Users-sinjini-Projects-dairy-sakha\src\lib\feedLibrary.ts"

# Groups considered roughage/forage for the concentrate:forage constraint
ROUGHAGE_GROUPS = {
    "Grass", "Green Fodder", "Hay", "Silage", "Straw", "Leaves", "Other roughage",
}
MINERAL_GROUPS = {"Minerals"}

wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb["Feed library"]

feeds = []
for row in ws.iter_rows(min_row=2, values_only=True):
    name, group, _default, rate, dm, tdn, cp, ca, p = row[:9]
    if not name or not group:
        continue
    group = str(group).strip()
    if group in ROUGHAGE_GROUPS:
        cat = "roughage"
    elif group in MINERAL_GROUPS:
        cat = "mineral"
    else:
        cat = "concentrate"
    feeds.append({
        "id": str(name).strip().lower().replace(" ", "_").replace("/", "_").replace("(", "").replace(")", "").replace(".", "").replace("-", "_"),
        "name": str(name).strip(),
        "group": group,
        "category": cat,
        "rate": float(rate or 0),
        # per kg fresh (as-fed): grams of DM, TDN, CP, Ca, P
        "dm": float(dm or 0),
        "tdn": float(tdn or 0),
        "cp": float(cp or 0),
        "ca": float(ca or 0),
        "p": float(p or 0),
    })

# de-dup ids
seen = {}
for f in feeds:
    if f["id"] in seen:
        seen[f["id"]] += 1
        f["id"] = f"{f['id']}_{seen[f['id']]}"
    else:
        seen[f["id"]] = 0

ts = """// AUTO-GENERATED from "Main Feed library .xlsx" (NDDB INAPH feed library).
// Nutrient values are grams per kg of feed on fresh (as-fed) basis.
// rate = default market price in Rs/kg (farmer can override).

export type FeedCategory = "roughage" | "concentrate" | "mineral";

export interface FeedItem {
  id: string;
  name: string;
  group: string;
  category: FeedCategory;
  /** Default price Rs per kg fresh */
  rate: number;
  /** g dry matter per kg fresh */
  dm: number;
  /** g TDN per kg fresh */
  tdn: number;
  /** g crude protein per kg fresh */
  cp: number;
  /** g calcium per kg fresh */
  ca: number;
  /** g phosphorus per kg fresh */
  p: number;
}

export const FEED_LIBRARY: FeedItem[] = """ + json.dumps(feeds, indent=2, ensure_ascii=False) + """;

export const FEED_BY_ID: Record<string, FeedItem> = Object.fromEntries(
  FEED_LIBRARY.map((f) => [f.id, f])
);

export function searchFeeds(query: string, category?: FeedCategory): FeedItem[] {
  const q = query.trim().toLowerCase();
  return FEED_LIBRARY.filter(
    (f) =>
      (!category || f.category === category) &&
      (!q || f.name.toLowerCase().includes(q) || f.group.toLowerCase().includes(q))
  );
}
"""

with open(OUT, "w", encoding="utf-8") as fh:
    fh.write(ts)
print("wrote", OUT, len(feeds), "feeds")
