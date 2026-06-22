/** Localized “please wait” / status strings for chat and voice call. */

import { detectLanguageCode } from "@/lib/languages";

type Lang = string;

const FALLBACK = "hi";

function pick(map: Record<string, string>, lang?: Lang | null): string {
  if (lang && map[lang]) return map[lang];
  return map[FALLBACK] || map.en;
}

/** Shown when chat or call reply is slow (high traffic / processing). */
export function waitTrafficMessage(lang?: Lang | null): string {
  return pick(
    {
      hi: "⏳ कृपया प्रतीक्षा करें — अभी अधिक किसान जुड़े हैं, जवाब तैयार हो रहा है…",
      bn: "⏳ অনুগ্রহ করে অপেক্ষা করুন — এখন বেশি কৃষক যুক্ত আছেন, উত্তর প্রস্তুত হচ্ছে…",
      ta: "⏳ தயவுசெய்து காத்திருங்கள் — இப்போது அதிக விவசாயிகள் இணைந்துள்ளனர், பதில் தயாராகிறது…",
      te: "⏳ దయచేసి వేచి ఉండండి — ఇప్పుడు ఎక్కువ రైతులు కలిసి ఉన్నారు, సమాధానం తయారవుతోంది…",
      mr: "⏳ कृपया थांबा — आत्ता अधिक शेतकरी जोडले आहेत, उत्तर तयार होत आहे…",
      gu: "⏳ કૃપા કરીને રાહ જુઓ — હમણાં વધુ ખેડૂતો જોડાયા છે, જવાબ તૈયાર થઈ રહ્યો છે…",
      kn: "⏳ ದಯವಿಟ್ಟು ಕಾಯಿರಿ — ಈಗ ಹೆಚ್ಚು ರೈತರು ಸೇರಿದ್ದಾರೆ, ಉತ್ತರ ಸಿದ್ಧವಾಗುತ್ತಿದೆ…",
      ml: "⏳ ദയവായി കാത്തിരിക്കൂ — ഇപ്പോൾ കൂടുതൽ കർഷകർ ബന്ധപ്പെട്ടിരിക്കുന്നു, ഉത്തരം തയ്യാറാകുന്നു…",
      pa: "⏳ ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ — ਹੁਣ ਵਧੇਰੇ ਕਿਸਾਨ ਜੁੜੇ ਹਨ, ਜਵਾਬ ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ…",
      or: "⏳ ଦୟାକରି ଅପେକ୍ଷା କରନ୍ତୁ — ଏବେ ଅଧିକ କୃଷକ ଯୋଗ ଦେଇଛନ୍ତି, ଉତ୍ତର ପ୍ରସ୍ତୁତ ହେଉଛି…",
      as: "⏳ অনুগ্ৰহ কৰি অপেক্ষা কৰক — এতিয়া অধিক কৃষক সংযুক্ত, উত্তৰ প্ৰস্তুত হৈ আছে…",
      ur: "⏳ براہ کرم انتظار کریں — اب زیادہ کسان جڑے ہیں، جواب تیار ہو رہا ہے…",
      en: "⏳ Please wait — many farmers are connected right now, preparing your answer…",
    },
    lang,
  );
}

/** Voice note being transcribed before chat reply. */
export function waitTranscribingMessage(lang?: Lang | null): string {
  return pick(
    {
      hi: "🎤 आपकी आवाज़ समझ रहा हूँ, कृपया प्रतीक्षा करें…",
      bn: "🎤 আপনার কথা বুঝছি, অনুগ্রহ করে অপেক্ষা করুন…",
      ta: "🎤 உங்கள் குரலைப் புரிந்து கொள்கிறேன், தயவுசெய்து காத்திருங்கள்…",
      te: "🎤 మీ మాట అర్థం చేసుకుంటున్నాను, దయచేసి వేచి ఉండండి…",
      mr: "🎤 तुमचा आवाज समजत आहे, कृपया थांबा…",
      gu: "🎤 તમારો અવાજ સમજી રહ્યો છું, કૃપા કરીને રાહ જુઓ…",
      kn: "🎤 ನಿಮ್ಮ ಧ್ವನಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ, ದಯವಿಟ್ಟು ಕಾಯಿರಿ…",
      ml: "🎤 നിങ്ങളുടെ ശബ്ദം മനസ്സിലാക്കുന്നു, ദയവായി കാത്തിരിക്കൂ…",
      pa: "🎤 ਤੁਹਾਡੀ ਆਵਾਜ਼ ਸਮਝ ਰਿਹਾ ਹਾਂ, ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ…",
      or: "🎤 ଆପଣଙ୍କ କଥା ବୁଝୁଛି, ଦୟାକରି ଅପେକ୍ଷା କରନ୍ତୁ…",
      as: "🎤 আপোনাৰ কথা বুজি আছো, অনুগ্ৰহ কৰি অপেক্ষা কৰক…",
      ur: "🎤 آپ کی آواز سمجھ رہا ہوں، براہ کرم انتظار کریں…",
      en: "🎤 Understanding your voice, please wait…",
    },
    lang,
  );
}

/** Call overlay — connecting / starting. */
export function callConnectingMessage(lang?: Lang | null): string {
  return pick(
    {
      hi: "कॉल जोड़ रहे हैं…",
      bn: "কল সংযোগ হচ্ছে…",
      ta: "அழைப்பு இணைக்கப்படுகிறது…",
      te: "కాల్ కనెక్ట్ అవుతోంది…",
      mr: "कॉल जोडत आहे…",
      gu: "કૉલ જોડાઈ રહી છે…",
      kn: "ಕರೆ ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ…",
      ml: "കോൾ ബന്ധിപ്പിക്കുന്നു…",
      pa: "ਕਾਲ ਜੋੜ ਰਹੇ ਹਾਂ…",
      or: "କଲ୍ ଯୋଗ ହେଉଛି…",
      as: "কল সংযোগ হৈ আছে…",
      ur: "کال منسلک ہو رہی ہے…",
      en: "Connecting call…",
    },
    lang,
  );
}

/** Call — advisor preparing reply after farmer spoke. */
export function callProcessingMessage(lang?: Lang | null): string {
  return waitTrafficMessage(lang);
}

/** Call — farmer interrupted the advisor. */
export function callInterruptedMessage(lang?: Lang | null): string {
  return pick(
    {
      hi: "सुन रहा हूँ… आपकी नई बात समझ रहा हूँ",
      bn: "শুনছি… আপনার নতুন কথা বুঝছি",
      ta: "கேட்கிறேன்… உங்கள் புதிய கேள்வியைப் புரிந்து கொள்கிறேன்",
      te: "వింటున్నాను… మీ కొత్త ప్రశ్న అర్థం చేసుకుంటున్నాను",
      mr: "ऐकत आहे… तुमचा नवा प्रश्न समजत आहे",
      gu: "સાંભળી રહ્યો છું… તમારો નવો પ્રશ્ન સમજી રહ્યો છું",
      kn: "ಕೇಳುತ್ತಿದ್ದೇನೆ… ನಿಮ್ಮ ಹೊಸ ಪ್ರಶ್ನೆ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ",
      ml: "കേൾക്കുന്നു… നിങ്ങളുടെ പുതിയ ചോദ്യം മനസ്സിലാക്കുന്നു",
      pa: "ਸੁਣ ਰਿਹਾ ਹਾਂ… ਤੁਹਾਡਾ ਨਵਾਂ ਸਵਾਲ ਸਮਝ ਰਿਹਾ ਹਾਂ",
      or: "ଶୁଣୁଛି… ଆପଣଙ୍କ ନୂଆ ପ୍ରଶ୍ନ ବୁଝୁଛି",
      as: "শুনি আছো… আপোনাৰ নতুন কথা বুজি আছো",
      ur: "سن رہا ہوں… آپ کا نیا سوال سمجھ رہا ہوں",
      en: "Listening… understanding your new question",
    },
    lang,
  );
}

export function callListeningMessage(lang?: Lang | null): string {
  return pick(
    {
      hi: "आपकी बात सुन रहा हूँ…",
      bn: "আপনার কথা শুনছি…",
      ta: "உங்கள் பேச்சைக் கேட்கிறேன்…",
      te: "మీ మాట వింటున్నాను…",
      mr: "तुमचे बोलणे ऐकत आहे…",
      gu: "તમારી વાત સાંભળી રહ્યો છું…",
      kn: "ನಿಮ್ಮ ಮಾತು ಕೇಳುತ್ತಿದ್ದೇನೆ…",
      ml: "നിങ്ങളുടെ സംസാരം കേൾക്കുന്നു…",
      pa: "ਤੁਹਾਡੀ ਗੱਲ ਸੁਣ ਰਿਹਾ ਹਾਂ…",
      or: "ଆପଣଙ୍କ କଥା ଶୁଣୁଛି…",
      as: "আপোনাৰ কথা শুনি আছো…",
      ur: "آپ کی بات سن رہا ہوں…",
      en: "Listening to you…",
    },
    lang,
  );
}

export function callSpeakingMessage(lang?: Lang | null): string {
  return pick(
    {
      hi: "सलाहकार बोल रहा है…",
      bn: "পরামর্শদাতা বলছেন…",
      ta: "ஆலோசகர் பேசுகிறார்…",
      te: "సలహాదారు మాట్లాడుతున్నారు…",
      mr: "सल्लागार बोलत आहे…",
      gu: "સલાહકાર બોલી રહ્યા છે…",
      kn: "ಸಲಹೆಗಾರ ಮಾತನಾಡುತ್ತಿದ್ದಾರೆ…",
      ml: "ഉപദേഷ്ടാവ് സംസാരിക്കുന്നു…",
      pa: "ਸਲਾਹਕਾਰ ਬੋਲ ਰਿਹਾ ਹੈ…",
      or: "ପରାମର୍ଶଦାତା କହୁଛନ୍ତି…",
      as: "পৰামৰ্শদাতা কৈ আছে…",
      ur: "مشیر بات کر رہا ہے…",
      en: "Advisor is speaking…",
    },
    lang,
  );
}

export function resolveUserLang(text: string, fallback: Lang = FALLBACK): Lang {
  return detectLanguageCode(text) || fallback;
}

/** Delay before showing slow-response hint (ms). */
export const SLOW_RESPONSE_MS = 2500;
