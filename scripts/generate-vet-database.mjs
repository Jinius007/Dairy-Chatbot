/**
 * Generate dummy vet + paravet database (~50k) partitioned by Indian state.
 * Output: catalyst/functions/pashumitra_api/data/vets/{stateCode}.json
 *
 * Run: npm run generate:vets
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(
  __dirname,
  "..",
  "catalyst/functions/pashumitra_api/data/vets",
);

const TOTAL = Number(process.env.VET_DB_SIZE || "50000");

const STATES = [
  { code: "PB", name: "Punjab", lat: 31.15, lng: 75.78, weight: 0.045 },
  { code: "HR", name: "Haryana", lat: 29.06, lng: 76.08, weight: 0.04 },
  { code: "UP", name: "Uttar Pradesh", lat: 26.85, lng: 80.95, weight: 0.16 },
  { code: "UK", name: "Uttarakhand", lat: 30.07, lng: 79.02, weight: 0.02 },
  { code: "DL", name: "Delhi NCR", lat: 28.61, lng: 77.21, weight: 0.015 },
  { code: "RJ", name: "Rajasthan", lat: 26.91, lng: 75.79, weight: 0.07 },
  { code: "GJ", name: "Gujarat", lat: 22.26, lng: 71.19, weight: 0.065 },
  { code: "MP", name: "Madhya Pradesh", lat: 23.26, lng: 77.41, weight: 0.08 },
  { code: "MH", name: "Maharashtra", lat: 19.08, lng: 72.88, weight: 0.095 },
  { code: "CG", name: "Chhattisgarh", lat: 21.25, lng: 81.63, weight: 0.03 },
  { code: "KA", name: "Karnataka", lat: 12.97, lng: 77.59, weight: 0.065 },
  { code: "AP", name: "Andhra Pradesh", lat: 15.91, lng: 79.74, weight: 0.055 },
  { code: "TS", name: "Telangana", lat: 17.39, lng: 78.49, weight: 0.04 },
  { code: "TN", name: "Tamil Nadu", lat: 13.08, lng: 80.27, weight: 0.07 },
  { code: "KL", name: "Kerala", lat: 10.85, lng: 76.27, weight: 0.035 },
  { code: "WB", name: "West Bengal", lat: 22.57, lng: 88.36, weight: 0.075 },
  { code: "BR", name: "Bihar", lat: 25.59, lng: 85.13, weight: 0.07 },
  { code: "OR", name: "Odisha", lat: 20.3, lng: 85.82, weight: 0.04 },
  { code: "AS", name: "Assam", lat: 26.14, lng: 91.79, weight: 0.035 },
  { code: "JH", name: "Jharkhand", lat: 23.61, lng: 85.28, weight: 0.03 },
];

const FIRST = [
  "Rajesh", "Suresh", "Amit", "Priya", "Anita", "Ravi", "Sunil", "Deepak", "Kavita", "Manoj",
  "Sunita", "Vijay", "Pooja", "Sanjay", "Neha", "Ashok", "Rekha", "Pradeep", "Meena", "Arun",
  "Lakshmi", "Gopal", "Radha", "Harish", "Suman", "Vinod", "Geeta", "Mohan", "Sarita", "Dinesh",
];
const LAST = [
  "Sharma", "Singh", "Kumar", "Patel", "Yadav", "Verma", "Gupta", "Reddy", "Nair", "Das",
  "Rao", "Joshi", "Mehta", "Choudhary", "Pandey", "Mishra", "Thakur", "Saini", "Kaur", "Devi",
];
const VILLAGES = [
  "Rampur", "Shivpuri", "Krishnapur", "Govindpur", "Lakhanpur", "Bharatpur", "Nandgaon",
  "Sitapur", "Devgarh", "Chandpur", "Mohanpur", "Ramnagar", "Sultanpur", "Kishanpur",
  "Bajpur", "Gangapur", "Sonpur", "Basantpur", "Nagar", "Kheri", "Patti", "Kalan", "Khurd",
];
const CITIES = [
  "Lucknow", "Kanpur", "Jaipur", "Ahmedabad", "Pune", "Nagpur", "Patna", "Bhopal", "Indore",
  "Ludhiana", "Amritsar", "Meerut", "Agra", "Varanasi", "Surat", "Rajkot", "Coimbatore",
  "Madurai", "Mysuru", "Hubballi", "Guwahati", "Ranchi", "Raipur", "Bhubaneswar",
];
const VET_COLLEGES = [
  "IVRI Bareilly", "GADVASU Ludhiana", "MAFSU Nagpur", "KVAFSU Bidar", "AAU Anand",
  "DUVASU Mathura", "LUVAS Hisar", "WBUAFS Kolkata", "OUAT Bhubaneswar", "TANUVAS Chennai",
  "Kerala Veterinary University", "Assam Agricultural University", "Bihar Veterinary College",
  "Rajasthan University of Veterinary Sciences", "GBPUAT Pantnagar",
];
const PARAVET_QUAL = [
  "Diploma in Animal Husbandry (DAH)",
  "Certificate in Livestock Health Worker (LHW)",
  "BVSc & AH (Paravet extension)",
  "NDDB AI Technician + Animal Health",
];
const VET_QUAL = ["BVSc & AH", "BVSc & AH, MVSc", "BVSc & AH, MVSc (Medicine)", "BVSc & AH, MVSc (Surgery)"];

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function phone(rng) {
  const prefixes = ["6", "7", "8", "9"];
  let n = "91" + pick(rng, prefixes);
  for (let i = 0; i < 9; i++) n += Math.floor(rng() * 10);
  return n;
}

function regNo(rng, type, stateCode) {
  const prefix = type === "vet" ? "VCI" : "PV";
  return `${prefix}/${stateCode}/${2010 + Math.floor(rng() * 14)}/${10000 + Math.floor(rng() * 89999)}`;
}

function allocateCounts(total) {
  const weights = STATES.map((s) => s.weight);
  const sum = weights.reduce((a, b) => a + b, 0);
  let allocated = 0;
  const counts = STATES.map((s, i) => {
    if (i === STATES.length - 1) return total - allocated;
    const c = Math.round((s.weight / sum) * total);
    allocated += c;
    return c;
  });
  return counts;
}

function generateForState(state, count, seedBase) {
  const rng = mulberry32(seedBase);
  const out = [];
  for (let i = 0; i < count; i++) {
    const isParavet = rng() < 0.58;
    const type = isParavet ? "paravet" : "vet";
    const gender = rng() < 0.72 ? "male" : "female";
    const first = pick(rng, FIRST);
    const last = pick(rng, LAST);
    const name = gender === "female" && rng() < 0.35 ? `${first} ${last} Devi` : `Dr. ${first} ${last}`;
    const inCity = rng() < 0.28;
    const village = inCity ? null : `${pick(rng, VILLAGES)} ${pick(rng, ["", "Kalan", "Khurd", "Nagar"])}`.trim();
    const city = inCity ? pick(rng, CITIES) : pick(rng, CITIES);
    const district = `${pick(rng, CITIES)} ${pick(rng, ["", "Rural", "District"])}`.trim();
    const lat = state.lat + (rng() - 0.5) * 4.5;
    const lng = state.lng + (rng() - 0.5) * 4.5;
    const p = phone(rng);
    const slug = `${state.code.toLowerCase()}${i}`;
    out.push({
      id: `${type}-${slug}`,
      type,
      name,
      phone: p,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(rng() * 99)}@vetmail.in`,
      qualification: isParavet ? pick(rng, PARAVET_QUAL) : pick(rng, VET_QUAL),
      college: isParavet ? pick(rng, ["State AH Department Training", "KVK Extension", ...VET_COLLEGES]) : pick(rng, VET_COLLEGES),
      licenseBody: isParavet ? "State Animal Husbandry Dept" : "Veterinary Council of India",
      registrationNumber: regNo(rng, type, state.code),
      village,
      city,
      district,
      state: state.name,
      stateCode: state.code,
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
      yearsExperience: 1 + Math.floor(rng() * 28),
      languages: rng() < 0.6 ? ["hi", "en"] : ["hi"],
      available: rng() > 0.08,
    });
  }
  return out;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const counts = allocateCounts(TOTAL);
  let total = 0;
  let vets = 0;
  let paravets = 0;

  for (let i = 0; i < STATES.length; i++) {
    const state = STATES[i];
    const records = generateForState(state, counts[i], 1000 + i * 99991);
    total += records.length;
    for (const r of records) {
      if (r.type === "vet") vets++;
      else paravets++;
    }
    const fp = path.join(OUT_DIR, `${state.code}.json`);
    fs.writeFileSync(fp, JSON.stringify(records), "utf8");
    console.log(`  ${state.code}: ${records.length} (${(fs.statSync(fp).size / 1024).toFixed(0)} KB)`);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total,
        vets,
        paravets,
        states: STATES.map((s) => s.code),
        note: "Dummy demo database for PashuMitra vet directory",
      },
      null,
      2,
    ),
    "utf8",
  );
  fs.writeFileSync(path.join(OUT_DIR, "registrations.json"), "[]\n", "utf8");
  console.log(`Done: ${total} professionals (${vets} vets, ${paravets} paravets)`);
}

main();
