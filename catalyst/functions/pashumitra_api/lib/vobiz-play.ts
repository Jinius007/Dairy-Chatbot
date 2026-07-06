import fs from "fs";

import { cleanTtsText, synthesizeSpeech } from "./tts.ts";

import { putAudio } from "./vobiz-audio-cache.ts";

import { phrasePlayUrl } from "./vobiz-phrases.ts";

import { staticPhrasePath } from "./vobiz-assets.ts";



export function staticAssetPath(name: string): string {

  return staticPhrasePath(name);

}



export function hasStaticAsset(name: string): boolean {

  try {

    const p = staticAssetPath(name);

    return fs.existsSync(p) && fs.statSync(p).size > 500;

  } catch {

    return false;

  }

}



export function readStaticAsset(name: string): Buffer | null {

  if (!hasStaticAsset(name)) return null;

  return fs.readFileSync(staticAssetPath(name));

}



export function staticPlayUrl(base: string, name: string): string | null {

  if (!hasStaticAsset(name)) return null;

  return `${base}/vobiz/static/${name}.mp3`;

}



export function xmlAttrEscape(url: string): string {

  return url.replace(/&/g, "&amp;");

}



export function playBlock(url: string): string {

  return `<Play>${xmlAttrEscape(url)}</Play>`;

}



export function playPhraseBlock(base: string, phraseName: string, lang = "hi"): string {

  return playBlock(phrasePlayUrl(base, phraseName, lang));

}



export async function textToPlayBlock(base: string, text: string, lang = "hi"): Promise<string> {

  const { audio } = await synthesizeSpeech(cleanTtsText(text, lang), lang, { callMode: true });

  const id = putAudio(audio);

  return playBlock(`${base}/vobiz/audio/${id}.mp3`);

}



export function recordBlock(base: string): string {

  const action = xmlAttrEscape(`${base}/vobiz/recorded`);

  return `<Record action="${action}" method="POST" maxLength="45" playBeep="false" timeout="10" />`;

}



export function speechGatherBlock(base: string, lang: string): string {

  const action = xmlAttrEscape(`${base}/vobiz/speech`);

  return `<Gather action="${action}" method="POST" inputType="speech" language="hi-IN" speechModel="telephony" speechEndTimeout="auto" executionTimeout="45">

    ${playPhraseBlock(base, "prompt", lang)}

  </Gather>`;

}



export function listenLoopBlock(base: string, lang: string): string {

  return `${speechGatherBlock(base, lang)}

  ${recordBlock(base)}

  ${playPhraseBlock(base, "error", lang)}

  <Hangup />`;

}


