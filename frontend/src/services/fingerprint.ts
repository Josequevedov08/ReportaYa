import { get, set } from "idb-keyval";

export interface DeviceFingerprint {
  id: string;
  createdAt: number;
}

export const DEVICE_ID_KEY = "reportaya_device_id";

export function generateDeviceId(): string {
  return crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await get<string>(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    await set(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function storeFingerprint(fingerprint: string): Promise<void> {
  const data: DeviceFingerprint = { id: fingerprint, createdAt: Date.now() };
  await set("fingerprint", data);
}

export async function getStoredFingerprint(): Promise<DeviceFingerprint | null> {
  return await get<DeviceFingerprint>("fingerprint");
}