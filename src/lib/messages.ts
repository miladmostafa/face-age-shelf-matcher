import type { ScanProfile } from "./profile";

export const PARENT_SOURCE = "shelf-matcher-parent";
export const SANDBOX_SOURCE = "shelf-matcher-sandbox";

export type ParentToSandbox = {
  source: typeof PARENT_SOURCE;
  type: "config";
  clientId: string;
};

export type SandboxToParent =
  | { source: typeof SANDBOX_SOURCE; type: "ready" }
  | { source: typeof SANDBOX_SOURCE; type: "started" }
  | { source: typeof SANDBOX_SOURCE; type: "reset" }
  | { source: typeof SANDBOX_SOURCE; type: "profile"; profile: ScanProfile }
  | { source: typeof SANDBOX_SOURCE; type: "error"; message: string };

export function isParentConfig(value: unknown): value is ParentToSandbox {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ParentToSandbox>;
  return (
    message.source === PARENT_SOURCE &&
    message.type === "config" &&
    typeof message.clientId === "string"
  );
}

export function isSandboxMessage(value: unknown): value is SandboxToParent {
  if (!value || typeof value !== "object") return false;
  const message = value as { source?: unknown; type?: unknown };
  return message.source === SANDBOX_SOURCE && typeof message.type === "string";
}
