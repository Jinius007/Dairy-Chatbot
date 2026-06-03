import { LANG_NAMES } from "@/lib/languages";

const WELCOME_BY_LANG: Record<string, string> = {
  hi: `🌾 संतुलित चारा सलाह

कृपया अपने डेयरी पशुओं की जानकारी दीजिए:
• गाय या भैंस? कौन सी नस्ल?
• कितने पशु?
• अभी क्या हाल — दूध दे रही, सूखी, या गर्भ में?
• इस अवस्था में कितne दिन या महीने?
• कितनी बार बचcha हुआ / गाभिन? (पहली, दूसरी ब्यात?)
• उम्र कितनी?
• अभी क्या खिलाती हैं — हara chara, bhusa, dana?

अpnī भाषा में लिखिए या बोलिए — मैं उसी में आage sawāl pūchūngā।`,

  bn: `🌾 সন্তুলিত খাদ্য পরামর্শ

আপনার দুগ্ধ পশুদের তথ্য দিন:
• গরু না মহিষ? কোন জাত?
• কতগুলো পশu?
• এখন কী অবস্থা — দুধ দিচ্ছে / শুকনো / গর্ভবতী?
• এই অবস্থায় কত দিন / মাস?
• কতবার বাছুর হয়েছে / গর্ভ হয়েছে? (প্রথম, দ্বিতীয় বার?)
• বয়স কত?
• এখন কী খাওয়ান (সবুজ ঘাস, ভুসি, দান)?

আপনার ভাষায় লিখুন বা বলুন — আমি সেই ভাষায় পরের প্রশ্ন করব।`,

  ta: `🌾 சமச்சீர் தீவன ஆலோசனை

உங்கள் பால் பண்ணை மிருகங்கள் பற்றி தகவல் தாருங்கள்:
• பசு / எருமை? எந்த இனம்?
• எத்தனை பசு?
• இப்போது — பால் கொடுக்கிறதா, சுக்க \/ கர்ப்பமா?
• இந்த நிலையில் எத்தனை நாட்கள் / மாதம்?
• எத்தனை முறை கன்று ஈன்றது / கர்ப்பம்? (முதல், இரண்டாம் முறை?)
• வயது என்ன?
• இப்போது என்த தீவனம் (பச்சை புல், வைக்கோல், குக்கிவகை தீவனம்)?

உங்கள் மொழியில் எழுதுங்கள் அல்லது பேசுங்கள் — அதே மொழியில் தொடர்ந்து கேட்பேன்.`,

  te: `🌾 సమతుల్య మేత సలహా

మీ dairy పశuvula vivaralu ivvandi:
• ఆవu / గేదె? ఏ breed (Murrah, Gir)?
• ఎన్నi?
• ippudu — paalu istunda / dry / garbham?
• ee sthiti lo enni rojulu / nelalu?
• enni saarla dhenu / garbham? (modati, rendava saari?)
• vayassu enta?
• ippudu emi feed (pacha gaddi, pula, danam)?

me bhashalo rayandi leda matladandi — ade bhashalo adugutanu.`,

  mr: `🌾 संतुलित चारा सलाह

कृपया तumchya dairy pashuanchi mahiti dya:
• gaay ki mhais? konti breed (Murrah, Gir)?
• kiti pashu?
• aata — dudh dete / sukhi / garbha?
• ya sthiti madhe kiti divas / mahine?
• kiti vela vasa zala / garbha zali? (pahili, dusri vaat?)
• vay kiti?
• aata kay khataat (hira chara, bhusa, dana)?

tumchya bhashhet liha kinva bola — tych bhashhet pudhe prashna vicharel.`,

  gu: `🌾 સંતુલિત ચારો

કૃપા કરીને તમારા dairy પશuની માહિતી આપો:
• ગાય કે ભેંસ? કઈ breed (Murrah, Gir)?
• કેટલા પશu?
• હમણાં — દૂધ આપે / sukhi / garbh?
• આ sthiti માં કેટલા divas / mahina?
• ketli vaar bachhu thayu / garbh? (pahli, bijli vaat?)
• ઉંમર કેટલી?
• હમણાં શું feed (લીલો charo, bhusa, dana)?

તમારી ભાષામાં લખો અથવા બોલો — હું એ જ ભાષામાં પૂછis.`,

  kn: `🌾 ಸಮತೋಲಿತ ಆಹಾರ

ದಯವಿಟ್ಟು ನಿಮ್ಮ dairy pashugala mahiti kodiyri:
• hasu / eMme? yaav breed (Murrah, Gir)?
• eshtu pashu?
• iga — halu kodutade / dry / garbha?
• ee sthiti alli eshtu din / tingalu?
• eshtu sala huvudu / garbha? (modala, eradaneya saari?)
• vayassu eshtu?
• iga enu feed (hasiru ghasa, bhusa, dana)?

nimma bhasheyalli bariyiri athava helri — ade bhasheyalli kelutteeni.`,

  ml: `🌾 സമതുല്യ ആഹാരം

ദയവായി നിങ്ങളുടെ dairy pashukalude vivaram tharuka:
• pasu / eruma? ethu breed (Murrah, Gir)?
• ethra pashu?
• ippol — paal tharunnu / dry / garbham?
• ee avasthayil ethra divasam / maasam?
• etra thavana kuzhi / garbham? (adhyam, randam thavana?)
• vayassu ethra?
• ippol enthu feed (pacha grass, vallu, dana)?

ningalude bhashayil ezhuthuka atho parayuka — athu pole thudarnnu chodikkum.`,

  pa: `🌾 ਸੰਤੁਲਿਤ ਚਾਰਾ

ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ dairy pashuaan di jaankari dvo:
• gaay ja bhains? kis breed di (Murrah, Gir)?
• kinne pashu?
• hunn — doodh dindi / sukhi / garbhi?
• is haalat vich kinne din / mahine?
• kinni vaar bachha hoya / garbhi? (pehli, dooji vaar?)
• umar kinni?
• hunn ki khilaunde ho (hara chara, bhusa, dana)?

apni bhasha vich likho ja bolo — main usi vich agge puchunga.`,

  or: `🌾 ସନ୍ତୁଳିତ ଚାରା

ଦୟାକରି ଆପଣଙ୍କ dairy pashu ra jaankaari debi:
• gai na bhaains? kana breed (Murrah, Gir)?
• kete pashu?
• ebe — dudha deuchi / dry / garbha?
• ei sthiti re kete dina / masa?
• kete thara bachha hela / garbha? (prathama, dwitiya thara?)
• baya kete?
• ebe kana khuaanti (sabuj ghasa, bhusa, dana)?

apananka bhaashare likhantu ba kuhantu — sei bhaashare aage pacharibi.`,

  as: `🌾 সন্তুলিত খাদ্য

অনুগ্ৰহ কৰি আপোনাৰ dairy pashu bur tolot dibo:
• gai ne gahori? kond breed (Murrah, Gir)?
• kiman pashu?
• etiya — gakh dibe / dry / garbhini?
• ei obosthay kiman din / mah?
• kiman bar bachha hol / garbh? (prothom, ditiyo bar?)
• boyos kiman?
• etiya ki khua (sabuj ghas, bhusi, dana)?

apunar bhashat likhok ba kobo — hei bhashatei aage prashna korim.`,

  ur: `🌾 متوازن چارہ

براہِ کرم اپنے dairy pashu ki maloomat dein:
• gaay ya bhains? kis breed (Murrah, Gir)?
• kitne pashu?
• ab — doodh deti / dry / hamla?
• is haalat mein kitne din / mahine?
• kitni baar bachha hua / hamla hui? (pehli, doosri baar?)
• umar kitni?
• ab kya khilati hain (hara chara, bhusa, dana)?

apni zubaan mein likhein ya bolein — main usi mein agla sawaal poochunga.`,

  en: `🌾 Ration Advisory

Please share details about your dairy animals:
• Cow or buffalo? Which breed (Murrah, Gir, etc.)?
• How many animals?
• Now — giving milk / dry / pregnant?
• How many days or months in this condition?
• How many times calved / pregnant before? (1st, 2nd time?)
• Age?
• What do you feed now (green fodder, straw, concentrate)?

Type or speak in your language — I will continue in the same language.`,
};

export const LANG_ORDER = ["hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "as", "ur", "en"] as const;

export const RATION_ADVISORY_INTRO = `🌾 संतुलित चारा सलाह

नीचे अपनी भाषा चुनें:`;

/** Welcome for one language — shown after farmer picks a language. */
export function getWelcomeForLang(code: string): string {
  return WELCOME_BY_LANG[code] ?? WELCOME_BY_LANG.en;
}

/** @deprecated Use getWelcomeForLang — kept for compatibility */
export function buildRationAdvisoryWelcome(): string {
  return getWelcomeForLang("hi");
}

export const RATION_ADVISORY_WELCOME = RATION_ADVISORY_INTRO;

export const RATION_ADVISORY_LANG_KEY = "pashumitra_ration_advisory_lang";

export function loadRationAdvisoryLang(): string | null {
  try {
    return localStorage.getItem(RATION_ADVISORY_LANG_KEY);
  } catch {
    return null;
  }
}

export function saveRationAdvisoryLang(code: string | null) {
  try {
    if (code) localStorage.setItem(RATION_ADVISORY_LANG_KEY, code);
    else localStorage.removeItem(RATION_ADVISORY_LANG_KEY);
  } catch {}
}
