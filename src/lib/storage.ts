import { DEFAULT_ALLOWLIST } from "./domains";
import { sanitizeProfile, type ScanProfile } from "./profile";

export const STORAGE_KEYS = {
  clientId: "clientId",
  allowlist: "allowlist",
  profile: "profile",
} as const;

export type ShelfSettings = {
  clientId: string;
  allowlist: string[];
  profile: ScanProfile | null;
};

function storageArea(): chrome.storage.LocalStorageArea {
  return chrome.storage.local;
}

export async function loadSettings(): Promise<ShelfSettings> {
  const data = await storageArea().get([
    STORAGE_KEYS.clientId,
    STORAGE_KEYS.allowlist,
    STORAGE_KEYS.profile,
  ]);
  const clientId = typeof data.clientId === "string" ? data.clientId : "";
  const allowlist = Array.isArray(data.allowlist)
    ? data.allowlist.filter((item): item is string => typeof item === "string")
    : [...DEFAULT_ALLOWLIST];
  return {
    clientId,
    allowlist,
    profile: sanitizeProfile(data.profile),
  };
}

export async function saveSettings(
  partial: Partial<Pick<ShelfSettings, "clientId" | "allowlist">>,
): Promise<void> {
  const next: Record<string, unknown> = {};
  if (partial.clientId != null) next[STORAGE_KEYS.clientId] = partial.clientId;
  if (partial.allowlist) next[STORAGE_KEYS.allowlist] = partial.allowlist;
  await storageArea().set(next);
}

export async function saveProfile(profile: ScanProfile): Promise<void> {
  const clean = sanitizeProfile(profile);
  if (!clean) throw new Error("Refusing to store a scan that is not a plain profile.");
  await storageArea().set({ [STORAGE_KEYS.profile]: clean });
}

export async function deleteScanData(): Promise<void> {
  await storageArea().remove(STORAGE_KEYS.profile);
}
