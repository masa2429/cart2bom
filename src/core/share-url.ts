import { CURRENT_SCHEMA_VERSION, type CartItem, type SavedList } from "./models";
import { validateSavedList } from "./validation";

export const SHARED_LIST_FRAGMENT_PREFIX = "#cart2bom=";
export const CART2BOM_SHARE_VIEWER_URL = "https://masa2429.github.io/cart2bom/share/";
const MAX_ENCODED_LENGTH = 100_000;
const MAX_DECODED_LENGTH = 1_000_000;
const SHARE_PAYLOAD_VERSION = 1;

type SharedItemTuple = [
  storeId: string,
  storeName: string,
  orderCode: string,
  manufacturerName: string | null,
  manufacturerPartNumber: string | null,
  name: string,
  salesUnit: string | null,
  quantity: number,
  unitPrice: number | null,
  subtotal: number | null,
  productUrl: string,
  imageUrl: string | null,
  stockStatus: string | null,
  leadTime: string | null,
  note: string,
];

interface SharedListPayload {
  v: number;
  n: string;
  d: string;
  t: string[];
  i: SharedItemTuple[];
}

export interface ReadSharedListOptions {
  now?: () => Date;
  createId?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compactList(list: SavedList): SharedListPayload {
  return {
    v: SHARE_PAYLOAD_VERSION,
    n: list.name,
    d: list.description,
    t: list.tags,
    i: list.items.map((item) => [
      item.storeId,
      item.storeName,
      item.orderCode,
      item.manufacturerName,
      item.manufacturerPartNumber,
      item.name,
      item.salesUnit,
      item.quantity,
      item.unitPrice,
      item.subtotal,
      item.productUrl,
      item.imageUrl,
      item.stockStatus,
      item.leadTime,
      item.note,
    ]),
  };
}

function expandCompactList(
  value: Record<string, unknown>,
  now: () => Date,
  createId: () => string,
): SavedList {
  if (value.v !== SHARE_PAYLOAD_VERSION || !Array.isArray(value.i)) {
    throw new Error("未対応の共有リスト形式です。");
  }
  const timestamp = now().toISOString();
  const items = value.i.map((entry, index): CartItem | unknown => {
    if (!Array.isArray(entry)) return entry;
    return {
      id: `shared:${index}:${String(entry[0] ?? "item")}:${String(entry[2] ?? "code")}`,
      storeId: entry[0],
      storeName: entry[1],
      orderCode: entry[2],
      manufacturerName: entry[3],
      manufacturerPartNumber: entry[4],
      name: entry[5],
      salesUnit: entry[6],
      quantity: entry[7],
      unitPrice: entry[8],
      subtotal: entry[9],
      currency: "JPY",
      productUrl: entry[10],
      imageUrl: entry[11],
      stockStatus: entry[12],
      leadTime: entry[13],
      note: entry[14],
      capturedAt: timestamp,
    };
  });
  const result = validateSavedList({
    id: createId(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name: value.n,
    description: value.d,
    tags: value.t,
    items,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  if (!result.ok) {
    throw new Error(`共有リストが不正です。${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" / ")}`);
  }
  return result.value;
}

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
  const source = new TextEncoder().encode(JSON.stringify(compactList(list)));
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
export async function readSharedListUrl(
  url: URL,
  options: ReadSharedListOptions = {},
): Promise<SavedList | null> {
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
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error("共有URLのJSONが不正です。");
  }
  const legacy = validateSavedList(value);
  if (legacy.ok) return legacy.value;
  if (!isRecord(value)) throw new Error("共有リストが不正です。");
  return expandCompactList(
    value,
    options.now ?? (() => new Date()),
    options.createId ?? (() => crypto.randomUUID()),
  );
}
