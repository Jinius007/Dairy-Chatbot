/** Detect feed / ration questions in main chat and offer the Ration Advisory panel. */

const FEED_RATION_QUERY =
  /(?:what\s+(?:to\s+)?feed|feed\s+plan|balanced\s+ration|least\s*cost|lcf\b|ration\s+balanc|poshan|fodder|concentrate|compound\s+feed|mineral\s+mix|berseem|bajra|straw|silage|bhusa|chara|chare|ghaas|green\s+fodder|dry\s+fodder|dan(?:a)?|mittha|tdn\b|kya\s+khil|kya\s+khila|kya\s+de(?:n|na)|kya\s+doo?n|khana\s+kya|chara\s+kya|aahar|aahara|rasan|rashan|खुराक|चारा|भोजन|आहार|क्या\s+खिल|दाना|भूसा|हरा\s+चार|सूखा\s+चार|संतुलित|राशन|রেশন|খাদ্য|খাবার|কী\s+খ|চারা|தீவன|என்ன\s+க|ఆహార|దాణా|ఏ\s+ప|మేత|आहार|આહાર|શું\s+ખ|ಆಹಾರ|ಮೇವು|ആഹാര|തീറ്റ|ਖੁਰਾਕ|ਖਾਣ|ଆହାର|ଖାଦ୍ୟ|আহাৰ|খুৱ|خوراک|کھل)/i;

const EXCLUDE_PATTERNS =
  /(?:human|people|worker|labour|staff|scheme|yojana|loan|insurance|subsidy|market\s+price|milk\s+rate|sell\s+milk|buy\s+cow|purchase\s+cattle|manure\s+compost|biogas|vaccin|disease|fever|mastitis|doctor|vet\b|paravet)/i;

export const RATION_ADVISORY_OFFER_MARKER = "[[RATION_ADVISORY_OFFER]]";

export function isFeedRationQuery(text: string): boolean {
  const t = (text || "").trim();
  if (!t || t.length < 4) return false;
  if (EXCLUDE_PATTERNS.test(t) && !FEED_RATION_QUERY.test(t)) return false;
  return FEED_RATION_QUERY.test(t);
}

export function isAffirmativeRationOfferReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (/^(haan|han|ha|yes|y|ok|okay|ji|please|chalo|start|shuru|karo|karein|banao|banao|bana|karo na)\b/i.test(t)) return true;
  return /\b(haan|yes|ji haan|ration advisory|balanced ration|khurak|chara plan|poshan|aahara|feed plan|start karo|shuru karo|chahiye|chahie|lagbe|venum|চাই|हाँ|हां)\b/i.test(t);
}

export function isNegativeRationOfferReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(nahi|nahin|no|n|mat|cancel|skip|baad mein|later)\b/i.test(t)
    || /\b(nahi chahiye|no thanks|not now|abhi nahi)\b/i.test(t);
}

export function stripRationAdvisoryOfferMarker(text: string): string {
  return text.replace(/\[\[RATION_ADVISORY_OFFER\]\]/g, "").trim();
}

export function hasRationAdvisoryOfferMarker(text: string): boolean {
  return text.includes(RATION_ADVISORY_OFFER_MARKER);
}

/** Appended when the model forgets the marker on a feed query. */
export function rationAdvisoryOfferPrompt(lang: string): string {
  const prompts: Record<string, string> = {
    hi: "क्या आप संतुलित खुराक की योजना चाहेंगे? Ration Advisory में मैं एक-एक करके आसान सवाल पूछूंगा।",
    bn: "আপনি কি প্রতিটি পশুর জন্য সন্তুলিত খাদ্য পরিকল্পনা চান? Ration Advisory-তে সহজ প্রশ্ন করব।",
    ta: "ஒவ்வொரு மிருகத்திற்கும் சமச்சீர் தீவனத் திட்டம் வேண்டுமா? Ration Advisory-ல் எளிய கேள்விகள் கேட்பேன்.",
    te: "మీ జంతువులకు balanced ration కావాలా? Ration Advisoryలో సులభ ప్రశ్నలు అడుగుతాను.",
    mr: "प्रत्येक जनावरासाठी संतुलित खुराक हवी आहे का? Ration Advisory मध्ये सोपे प्रश्न विचारेन.",
    gu: "દરેક પશુ માટે સંતુલિત ચારો જોઈએ? Ration Advisory માં સરળ પ્રશ્નો પૂછીશ.",
    kn: "ಪ್ರತಿ ಜಾನುವಾರಿಗೆ ಸಮತೋಲಿತ ಮೇವು ಬೇಕೇ? Ration Advisory ನಲ್ಲಿ ಸುಲಭ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳುತ್ತೇನೆ.",
    ml: "ഓരോ മൃഗത്തിനും സമതുല്യ തീറ്റ വേണോ? Ration Advisory-യിൽ എളുപ്പ ചോദ്യങ്ങൾ ചോദിക്കും.",
    pa: "ਕੀ ਹਰ ਪਸ਼ੂ ਲਈ ਸੰਤੁਲਿਤ ਖੁਰਾਕ ਚਾਹੀਦੀ ਹੈ? Ration Advisory ਵਿੱਚ ਸੌਖੇ ਸਵਾਲ ਪੁੱਛਾਂਗਾ।",
    or: "ପ୍ରତି ପଶୁ ପାଇଁ ସନ୍ତୁଲିତ ଖାଦ୍ୟ ଚାହୁଁଛନ୍ତି? Ration Advisory ରେ ସହଜ ପ୍ରଶ୍ନ ପଚାରିବି।",
    as: "প্ৰতিটো পশুৰ বাবে সন্তুলিত আহাৰ লাগেনে? Ration Advisory-ত সহজ প্ৰশ্ন সুধিম।",
    ur: "کیا ہر جانور کے لیے متوازن خوراک چاہیے؟ Ration Advisory میں آسان سوال پوچھوں گا۔",
    en: "Would you like a balanced ration plan for each animal? I can ask simple questions one by one in Ration Advisory.",
  };
  return prompts[lang] || prompts.en;
}

export function rationOfferYesLabel(lang: string): string {
  const labels: Record<string, string> = {
    hi: "हाँ — संतुलित खुराक (Ration Advisory)",
    bn: "হ্যাঁ — সন্তুলিত খাদ্য (Ration Advisory)",
    ta: "ஆம் — தீவனத் திட்டம் (Ration Advisory)",
    te: "అవును — balanced ration (Ration Advisory)",
    mr: "होय — संतुलित खुराक (Ration Advisory)",
    gu: "હા — સંતુલિત ચારો (Ration Advisory)",
    kn: "ಹೌದು — ಸಮತೋಲಿತ ಮೇವು (Ration Advisory)",
    ml: "അതെ — ration plan (Ration Advisory)",
    pa: "ਹਾਂ — ਸੰਤੁਲਿਤ ਖੁਰਾਕ (Ration Advisory)",
    or: "ହଁ — ସନ୍ତୁଲିତ ଖାଦ୍ୟ (Ration Advisory)",
    as: "হয় — ration plan (Ration Advisory)",
    ur: "ہاں — متوازن خوراک (Ration Advisory)",
    en: "Yes — balanced ration advisory",
  };
  return labels[lang] || labels.en;
}

export function rationOfferNoLabel(lang: string): string {
  const labels: Record<string, string> = {
    hi: "नहीं, धन्यवाद",
    bn: "না, ধন্যবাদ",
    ta: "இல்லை, நன்றி",
    te: "లేదు, ధన్యవాదాలు",
    mr: "नाही, धन्यवाद",
    gu: "ના, આભાર",
    kn: "ಇಲ್ಲ, ಧನ್ಯವಾದ",
    ml: "ഇല്ല, നന്ദി",
    pa: "ਨਹੀਂ, ਧੰਨਵਾਦ",
    or: "ନା, ଧନ୍ୟବାଦ",
    as: "নহয়, ধন্যবাদ",
    ur: "نہیں، شکریہ",
    en: "No thanks",
  };
  return labels[lang] || labels.en;
}
