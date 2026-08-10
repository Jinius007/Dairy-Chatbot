// Direct farmer-facing replies for Ration Advisory — bypasses LLM during data collection
// so generic ration advice from the knowledge base cannot leak through.

type ReplyFn = (herdSize: number, animalIndex: number, profiled: number) => string;

const GATHERING: Record<string, ReplyFn> = {
  hi: (h, i, p) =>
    `ठीक है, आपके पास ${h} पशu हैं। अभी ${p}/${h} की पूरी जानकारी मिली है।\n\n` +
    `पशu #${i} के बारे में बताइए:\n` +
    `• कौन सी नसl?\n` +
    `• दूध दे रही है, सूखी, या गर्भ में?\n` +
    `• इस अवस्था में कितne दिन/महीne? रोज़ कितna litre दूध?\n` +
    `• कितni बार बचcha / गाभिन? उमr कितni?\n` +
    `• अभी क्या खिलाती हैं — हara chara, bhusa, dana kitna kg?`,

  bn: (h, i, p) =>
    `ঠিক আছে, আপনার ${h}টি পশu আছে। এখনো ${p}/${h} এর সম্পূর্ণ তথ্য পেয়েছি।\n\n` +
    `#${i} নং পশu সম্পর্কে বলুন:\n` +
    `• কোন জাত?\n• দুধ দিচ্ছে, শুকনো, নাকি গর্ভবতী?\n` +
    `• কত দin/mas? প্রতিদিন কত লিটার দুধ?\n• কতবার বachhur/গর্ভ? বয়স?\n• এখন কী খাওয়ান?`,

  ta: (h, i, p) =>
    `சரி, உங்களிடம் ${h} மிருகங்கள் உள்ளன. ${p}/${h} விவரம் கிடைத்தது.\n\n` +
    `#${i} பற்றி சொல்லுங்கள்:\n• இனம்? • பால்/ dry/ கர்ப்பம்?\n• எத்தனை நாட்கள்? எத்தனை லிட்டர்?\n• எத்தனை முறை கன்று? வயது?\n• என்ன தீவனம்?`,

  te: (h, i, p) =>
    `సరే, మీ వద్ద ${h} పశuvulu unnayi. ippati varaku ${p}/${h} samacharam vachindi.\n\n` +
    `#${i} gurinchi cheppandi:\n• breed? • paalu/dry/garbham?\n• enni rojulu? roju enna litre?\n• enni saarla dhenu? vayassu?\n• ippudu emi feed?`,

  mr: (h, i, p) =>
    `ठीक, tumchya kadhe ${h} pashu aahet. aata ${p}/${h} mahiti milali.\n\n` +
    `Pashu #${i} — nasl? dudh deto/sukhi/garbha? kiti divas? roj kiti litre?\n` +
    `kiti vela vasa? vay? aata kay khataat?`,

  gu: (h, i, p) =>
    `ઠીક છે, તમારી પાસે ${h} પશu છે. હમણાં ${p}/${h} માહિતી મળી.\n\n` +
    `પશu #${i}: breed? dudh/sukhi/garbh? ketla divas? roj ketla litre?\n` +
    `ketli vaar bachhu? umar? shu khavado cho?`,

  kn: (h, i, p) =>
    `ಸರಿ, ನಿಮ್ಮ ಬಳಿ ${h} ಪಶuಗಳಿವೆ. ${p}/${h} ಮಾಹಿತಿ ಬಂದಿದೆ.\n\n` +
    `#${i} — breed? halu/dry/garbha? eshtu dina? dina eshtu litre?\n` +
    `eshtu sala? vayassu? enu feed?`,

  ml: (h, i, p) =>
    `ശരി, നിങ്ങൾക്ക് ${h} പശuകൾ ഉണ്ട്. ${p}/${h} വിവരം ലഭിച്ചു.\n\n` +
    `#${i} — breed? paal/dry/garbham? etra divasam? daily etra litre?\n` +
    `etra thavana? vayassu? enthu feed?`,

  pa: (h, i, p) =>
    `ਠੀਕ ਹੈ, ਤੁਹਾਡੇ ਕੋਲ ${h} ਪਸ਼u ਹਨ। ${p}/${h} ਜਾਣਕਾਰੀ ਮਿਲੀ।\n\n` +
    `#${i} — breed? doodh/sukhi/garbhi? kinne din? roz kinna litre?\n` +
    `kinni vaar bachha? umar? ki khilaunde ho?`,

  or: (h, i, p) =>
    `ଠିକ୍ ଅଛି, ଆପଣଙ୍କ ପାଖରେ ${h} ପଶu ଅଛି। ${p}/${h} ତଥ୍ୟ ମିଳିଲା।\n\n` +
    `#${i} — breed? dudha/dry/garbha? kete dina? daily kete litre?\n` +
    `kete thara bachha? baya? kana khuaanti?`,

  as: (h, i, p) =>
    `ঠিক আছে, আপোনাৰ ${h}টা পশu আছে। ${p}/${h} তথ্য পালোঁ।\n\n` +
    `#${i} — breed? gakh/dry/garbhini? kiman din? daily kiman litre?\n` +
    `kiman bar bachha? boyos? ki khua?`,

  ur: (h, i, p) =>
    `ٹھیک ہے، آپ کے پاس ${h} پशu ہیں۔ ${p}/${h} معلومات ملی۔\n\n` +
    `#${i} — nasl? doodh/sukhi/hamla? kitne din? roz kitna litre?\n` +
    `kitni baar bachha? umar? kya khilati hain?`,

  en: (h, i, p) =>
    `OK, you have ${h} animals. I have full details for ${p}/${h} so far.\n\n` +
    `Tell me about Animal #${i}:\n• Breed?\n• Milking, dry, or pregnant?\n` +
    `• How long in this state? Daily milk litres?\n• Times calved / age?\n• Current feed (kg)?`,
};

const NEED_COUNT: Record<string, string> = {
  hi: "आपके पास कितne डेयरी पशu hain? पहle yeh batayiye, phir har pashu ki alag jaankari lenge — nasl, doodh/sukhi/garbh, byaat, chara.",
  bn: "আপনার কতগুলো দুগ্ধ পশu আছে? আগে সংখ্যা বলুন, তারপর প্রতিটির তথ্য নেব।",
  ta: "எத்தனை பால் பண்ணai மிருகங்கள்? முதலில் எண்ணிக்கை சொல்லுங்கள்.",
  te: "Meeku enni dairy pashuvulu unnayi? mundu ennikalu cheppandi.",
  mr: "Kiti pashu aahet? adhi sankhya sanga, mag pratyekachi mahiti gheu.",
  gu: "Ketla pashu che? pehla sankhya kaho, pachhi doro ek ni mahiti.",
  kn: "Eshtu pashu ide? modala ennikke heli.",
  ml: "Ethra pashukal? avasanam ennikam parayuka.",
  pa: "Kinne pashu ne? pehla ginati daso.",
  or: "Kete pashu achhi? prathame sankhya kuhantu.",
  as: "Kiman pashu asse? prothome kiman janabo.",
  ur: "Kitne pashu hain? pehle ginati batayein.",
  en: "How many dairy animals do you have? Tell me the count first, then we'll go through each one.",
};

const COUNT_CONFLICT: Record<string, (counts: number[]) => string> = {
  hi: (c) => `Aapne alag sankhya batayi (${c.join(", ")}). Asal mein kitne pashu hain — ek number batayiye.`,
  en: (c) => `You mentioned different counts (${c.join(", ")}). How many animals exactly?`,
};

function pickLang(lang: string | null): string {
  return lang && lang in GATHERING ? lang : "hi";
}

export function buildDirectGatheringReply(
  lang: string | null,
  herdSize: number,
  animalIndex: number,
  profiled: number,
): string {
  const code = pickLang(lang);
  return `[[LANG:${code}]]\n${GATHERING[code](herdSize, animalIndex, profiled)}`;
}

export function buildDirectNeedCountReply(lang: string | null): string {
  const code = pickLang(lang);
  const text = NEED_COUNT[code] ?? NEED_COUNT.hi;
  return `[[LANG:${code}]]\n${text}`;
}

export function buildDirectCountConflictReply(lang: string | null, counts: number[]): string {
  const code = pickLang(lang);
  const fn = COUNT_CONFLICT[code] ?? COUNT_CONFLICT.hi;
  return `[[LANG:${code}]]\n${fn(counts)}`;
}

export function buildDirectVerificationReply(
  lang: string | null,
  herdSize: number,
  summaryLines: string[],
): string {
  const code = pickLang(lang);
  const header = code === "hi"
    ? `Maine yeh samjha — kul ${herdSize} pashu:\n${summaryLines.join("\n")}\n\nKya sab sahi hai? "haan" likhein to main ration batata/bataati hoon.`
    : code === "en"
    ? `I understood — ${herdSize} animals total:\n${summaryLines.join("\n")}\n\nIs this correct? Reply "yes" for ration.`
    : `${summaryLines.join("\n")}\n\nTotal ${herdSize}. Sahi hai? "haan"/yes likhein.`;
  return `[[LANG:${code}]]\n${header}`;
}
