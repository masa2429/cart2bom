import type { SavedList } from "./models";
import { parseSavedListJson } from "./validation";

export const SHARED_LIST_FRAGMENT_PREFIX = "#cart2bom=";
const MAX_ENCODED_LENGTH = 100_000;
const MAX_DECODED_LENGTH = 1_000_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("共有URLの文字列が不正です。");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function transformBytes(
  bytes: Uint8Array,
  transformer: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const writer = transformer.writable.getWriter();
  const input = new Uint8Array(bytes.length);
  input.set(bytes);
  const write = writer.write(input).then(() => writer.close());
  const reader = transformer.readable.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    chunks.push(result.value);
    length += result.value.length;
    if (length > MAX_DECODED_LENGTH) throw new Error("共有リストのデータが大きすぎます。");
  }
  await write;
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

/** Creates a serverless URL whose fragment contains a validated SavedList payload. */
export async function createSharedListUrl(list: SavedList, baseUrl: string): Promise<string> {
  const source = new TextEncoder().encode(JSON.stringify(list));
  if (source.length > MAX_DECODED_LENGTH) throw new Error("共有リストのデータが大きすぎます。");
  const canCompress = typeof CompressionStream !== "undefined";
  const encoded = canCompress
    ? `g.${bytesToBase64Url(await transformBytes(source, new CompressionStream("gzip")))}`
    : `j.${bytesToBase64Url(source)}`;
  const url = new URL(baseUrl);
  url.hash = `cart2bom=${encoded}`;
  return url.href;
}

export function hasSharedListFragment(url: URL): boolean {
  return url.hash.startsWith(SHARED_LIST_FRAGMENT_PREFIX);
}

/** Decodes and validates a shared list. Returns null when the URL is not a Cart2BOM share URL. */
export async function readSharedListUrl(url: URL): Promise<SavedList | null> {
  if (!hasSharedListFragment(url)) return null;
  const encoded = url.hash.slice(SHARED_LIST_FRAGMENT_PREFIX.length);
  if (encoded.length === 0 || encoded.length > MAX_ENCODED_LENGTH) {
    throw new Error("共有URLのデータ量が不正です。");
  }
  const separator = encoded.indexOf(".");
  const format = encoded.slice(0, separator);
  const payload = encoded.slice(separator + 1);
  let bytes = base64UrlToBytes(payload);
  if (format === "g") {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("このブラウザは圧縮された共有URLに対応していません。");
    }
    bytes = await transformBytes(bytes, new DecompressionStream("gzip"));
  } else if (format !== "j") {
    throw new Error("未対応の共有URL形式です。");
  }
  if (bytes.length > MAX_DECODED_LENGTH) throw new Error("共有リストのデータが大きすぎます。");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("共有URLの文字コードが不正です。");
  }
  const result = parseSavedListJson(text);
  if (!result.ok) {
    throw new Error(`共有リストが不正です。${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" / ")}`);
  }
  return result.value;
}
