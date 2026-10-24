import { createHmac } from "node:crypto";
import { getSql } from "../db";
import { audit } from "./audit.server";
import { notifyUser } from "./notify.server";

/**
 * The conference room (audio/video calls). The room lives only in memory: it exists while a conference
 * is running. The app runs as ONE process, so a plain object is enough. The browsers talk to each other
 * directly (WebRTC); this module only keeps the list of people, who the host is, and relays the small
 * "signalling" messages the browsers need to find each other.
 */
export type ChatMsg = { id: string; from: string; name: string; text: string; at: string };

type Participant = {
  username: string;
  displayName: string;
  joinedAt: number;
  lastSeen: number;
  audio: boolean;
  video: boolean;
  screen: boolean;
  hand: boolean;
  clientId: string;
};

type Room = { startedAt: number; host: string; title: string; participants: Map<string, Participant>; chat: ChatMsg[]; peak: number };

export type PublicParticipant = { username: string; displayName: string; joinedAt: number; audio: boolean; video: boolean; screen: boolean; hand: boolean };
export type PublicRoom = { startedAt: number; host: string; hostName: string; title: string; max: number; participants: PublicParticipant[] };

type Send = (event: string, data: unknown) => void;
type State = { room: Room | null; conns: Map<string, Set<Send>>; sweeper: ReturnType<typeof setInterval> | null };

const g = globalThis as typeof globalThis & { __rtc__?: State };
const state: State = (g.__rtc__ ??= { room: null, conns: new Map(), sweeper: null });

export const maxParticipants = (): number => {
  const n = Number(process.env.CONFERENCE_MAX);
  return Number.isInteger(n) && n >= 2 && n <= 16 ? n : 8;
};
const STALE_MS = 40_000;
const CHAT_KEEP = 200;

// ---------- connections (one live stream per open browser tab) ----------

export function addConnection(username: string, send: Send): () => void {
  const set = state.conns.get(username) ?? new Set<Send>();
  set.add(send);
  state.conns.set(username, set);
  return () => {
    set.delete(send);
    if (set.size === 0) state.conns.delete(username);
  };
}

export function connectionCount(): number {
  let n = 0;
  for (const s of state.conns.values()) n += s.size;
  return n;
}

function emit(username: string, event: string, data: unknown): void {
  for (const send of state.conns.get(username) ?? []) {
    try {
      send(event, data);
    } catch {
      /* a dead connection removes itself */
    }
  }
}

function emitAll(event: string, data: unknown): void {
  for (const username of state.conns.keys()) emit(username, event, data);
}

function emitToRoom(event: string, data: unknown, except?: string): void {
  for (const p of state.room?.participants.values() ?? []) if (p.username !== except) emit(p.username, event, data);
}

// ---------- reading ----------

export function publicRoom(): PublicRoom | null {
  const r = state.room;
  if (!r) return null;
  const host = r.participants.get(r.host);
  return {
    startedAt: r.startedAt,
    host: r.host,
    hostName: host?.displayName ?? r.host,
    title: r.title,
    max: maxParticipants(),
    participants: [...r.participants.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map(({ username, displayName, joinedAt, audio, video, screen, hand }) => ({ username, displayName, joinedAt, audio, video, screen, hand })),
  };
}

const broadcastRoom = () => emitAll("room", publicRoom());

export function chatHistory(): ChatMsg[] {
  return state.room?.chat ?? [];
}

/** STUN/TURN servers for the browsers. TURN passwords are temporary (valid 6 hours) when TURN_SECRET is set. */
export function iceServersFor(username: string): { urls: string | string[]; username?: string; credential?: string }[] {
  const split = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const turnUrls = split(process.env.TURN_URLS);
  const stunUrls = split(process.env.STUN_URLS);
  const out: { urls: string | string[]; username?: string; credential?: string }[] = [];

  if (turnUrls.length > 0) {
    const secret = process.env.TURN_SECRET?.trim();
    const fixedUser = process.env.TURN_USERNAME?.trim();
    const fixedCred = process.env.TURN_CREDENTIAL?.trim();
    if (stunUrls.length === 0) {
      const m = /^turns?:([^:?/]+)/.exec(turnUrls[0]!);
      if (m) stunUrls.push(`stun:${m[1]}:3478`); // the TURN server also answers STUN
    }
    if (secret) {
      const user = `${Math.floor(Date.now() / 1000) + 6 * 3600}:${username}`;
      out.push({ urls: turnUrls, username: user, credential: createHmac("sha1", secret).update(user).digest("base64") });
    } else if (fixedUser && fixedCred) {
      out.push({ urls: turnUrls, username: fixedUser, credential: fixedCred });
    }
  }
  if (stunUrls.length > 0) out.push({ urls: stunUrls });
  if (out.length === 0) out.push({ urls: "stun:stun.l.google.com:19302" });
  return out;
}

export const hasTurn = (): boolean => (process.env.TURN_URLS ?? "").trim().length > 0;

// ---------- changing the room ----------

type Who = { username: string; displayName: string };

function ensureSweeper(): void {
  if (state.sweeper) return;
  state.sweeper = setInterval(() => {
    const r = state.room;
    if (!r) return;
    const cutoff = Date.now() - STALE_MS;
    for (const p of [...r.participants.values()]) if (p.lastSeen < cutoff) removeParticipant(p.username, "timeout");
  }, 10_000);
  state.sweeper.unref?.();
}

function endRoom(reason: "host" | "empty" | "admin", byName?: string): void {
  const r = state.room;
  if (!r) return;
  emitToRoom("ended", { reason, by: byName ?? null });
  state.room = null;
  const minutes = Math.max(1, Math.round((Date.now() - r.startedAt) / 60000));
  const host = r.participants.get(r.host);
  void audit({
    actor: r.host,
    actorName: host?.displayName ?? r.host,
    category: "system",
    action: "conference.end",
    summary: `کنفرانس «${r.title}» پایان یافت (${minutes} دقیقه، حداکثر ${r.peak} نفر)`,
  });
  broadcastRoom();
}

function transferHost(): void {
  const r = state.room;
  if (!r) return;
  const next = [...r.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
  if (next) r.host = next.username;
}

function removeParticipant(username: string, reason: "left" | "kicked" | "timeout"): void {
  const r = state.room;
  if (!r || !r.participants.delete(username)) return;
  if (reason !== "left") emit(username, "kicked", { reason });
  if (r.participants.size === 0) return endRoom("empty");
  if (r.host === username) transferHost();
  broadcastRoom();
}

/** The first person to start becomes the host and stays the host until the conference ends (or hands it over by leaving). */
export async function startConference(
  who: Who,
  opts: { title: string; notifyAll: boolean },
  clientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (state.room) return { ok: false, error: "یک کنفرانس همین حالا در جریان است؛ به آن بپیوندید." };
  const now = Date.now();
  const title = opts.title.trim() || "کنفرانس";
  state.room = {
    startedAt: now,
    host: who.username,
    title,
    participants: new Map([[who.username, { ...who, joinedAt: now, lastSeen: now, audio: true, video: false, screen: false, hand: false, clientId }]]),
    chat: [],
    peak: 1,
  };
  ensureSweeper();
  void audit({ actor: who.username, actorName: who.displayName, category: "system", action: "conference.start", summary: `کنفرانس «${title}» را شروع کرد` });
  broadcastRoom();

  if (opts.notifyAll) {
    void (async () => {
      const sql = await getSql();
      const users = await sql<{ username: string }>`select username from login_users where username <> ${who.username}`;
      for (const u of users) {
        await notifyUser({ username: u.username, kind: "conference", title: `کنفرانس شروع شد: ${title}`, body: `میزبان: ${who.displayName}`, href: "/messages?tab=conference" });
      }
    })();
  }
  return { ok: true };
}

export function joinConference(who: Who, clientId: string): { ok: true } | { ok: false; error: string } {
  const r = state.room;
  if (!r) return { ok: false, error: "کنفرانسی در جریان نیست." };
  const existing = r.participants.get(who.username);
  if (existing) {
    // the same person opened the room in another window: that window must let go
    emit(who.username, "replaced", { except: clientId });
    existing.clientId = clientId;
    existing.lastSeen = Date.now();
    broadcastRoom();
    return { ok: true };
  }
  if (r.participants.size >= maxParticipants()) return { ok: false, error: `ظرفیت اتاق (${maxParticipants()} نفر) پر است.` };
  const now = Date.now();
  r.participants.set(who.username, { ...who, joinedAt: now, lastSeen: now, audio: true, video: false, screen: false, hand: false, clientId });
  r.peak = Math.max(r.peak, r.participants.size);
  broadcastRoom();
  return { ok: true };
}

/** Leaving. The host may end the conference for everybody, or hand it to the person who has been here longest. */
export function leaveConference(who: Who, endForAll: boolean): void {
  const r = state.room;
  if (!r || !r.participants.has(who.username)) return;
  if (r.host === who.username && endForAll) return endRoom("host", who.displayName);
  removeParticipant(who.username, "left");
}

export function endConference(who: Who & { isAdmin: boolean }): boolean {
  const r = state.room;
  if (!r || (r.host !== who.username && !who.isAdmin)) return false;
  endRoom(r.host === who.username ? "host" : "admin", who.displayName);
  return true;
}

function hostOnly(who: { username: string; isAdmin: boolean }): Room | null {
  const r = state.room;
  return r && (r.host === who.username || who.isAdmin) ? r : null;
}

export function kickParticipant(who: { username: string; isAdmin: boolean }, target: string): boolean {
  const r = hostOnly(who);
  if (!r || target === r.host || !r.participants.has(target)) return false;
  removeParticipant(target, "kicked");
  return true;
}

export function muteParticipant(who: { username: string; isAdmin: boolean }, target: string | "all"): boolean {
  const r = hostOnly(who);
  if (!r) return false;
  for (const p of r.participants.values()) {
    if (p.username === r.host) continue;
    if (target === "all" || target === p.username) emit(p.username, "force-mute", {});
  }
  return true;
}

export function setMedia(username: string, media: { audio: boolean; video: boolean; screen: boolean }): void {
  const p = state.room?.participants.get(username);
  if (!p) return;
  p.audio = media.audio;
  p.video = media.video;
  p.screen = media.screen;
  broadcastRoom();
}

export function setHand(username: string, on: boolean): void {
  const p = state.room?.participants.get(username);
  if (!p) return;
  p.hand = on;
  broadcastRoom();
}

export function heartbeat(username: string): boolean {
  const p = state.room?.participants.get(username);
  if (!p) return false;
  p.lastSeen = Date.now();
  return true;
}

export function sendChat(who: Who, text: string): boolean {
  const r = state.room;
  if (!r || !r.participants.has(who.username)) return false;
  const msg: ChatMsg = { id: crypto.randomUUID(), from: who.username, name: who.displayName, text: text.slice(0, 500), at: new Date().toISOString() };
  r.chat.push(msg);
  if (r.chat.length > CHAT_KEEP) r.chat.splice(0, r.chat.length - CHAT_KEEP);
  emitToRoom("chat", msg);
  return true;
}

/** Hands a WebRTC negotiation message to the other person in the room. */
export function relaySignal(from: string, to: string, data: unknown): boolean {
  const r = state.room;
  if (!r || from === to || !r.participants.has(from) || !r.participants.has(to)) return false;
  emit(to, "signal", { from, data });
  return true;
}

export function isInRoom(username: string): boolean {
  return Boolean(state.room?.participants.has(username));
}
