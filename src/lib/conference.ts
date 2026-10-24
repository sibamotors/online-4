import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "./session-middleware";
import type { ChatMsg, PublicRoom } from "./server/rtc.server";
import { parse } from "./validate";

export type { ChatMsg, PublicRoom, PublicParticipant } from "./server/rtc.server";

export type IceServer = { urls: string | string[]; username?: string; credential?: string };

export type ConferenceState = {
  room: PublicRoom | null;
  /** chat of the running conference (only for people who are in it) */
  chat: ChatMsg[];
  iceServers: IceServer[];
  /** the server has a TURN relay; without it people behind strict networks may not connect */
  hasTurn: boolean;
};

const clientId = z.string().min(8).max(64);
const username = z.string().trim().toLowerCase().min(1).max(64);
type Result = { ok: true } | { ok: false; error: string };

const rtc = () => import("./server/rtc.server");
const who = (u: { username: string; displayName: string }) => ({ username: u.username, displayName: u.displayName });

export const getConferenceState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ConferenceState> => {
    const r = await rtc();
    const inRoom = r.isInRoom(context.user.username);
    return {
      room: r.publicRoom(),
      chat: inRoom ? r.chatHistory() : [],
      iceServers: r.iceServersFor(context.user.username),
      hasTurn: r.hasTurn(),
    };
  });

/** Starts the conference. Whoever gets here first when no conference is running becomes its host. */
export const startConference = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ title: z.string().trim().max(80), notifyAll: z.boolean(), clientId })))
  .handler(async ({ data, context }): Promise<Result> => (await rtc()).startConference(who(context.user), { title: data.title, notifyAll: data.notifyAll }, data.clientId));

export const joinConference = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ clientId })))
  .handler(async ({ data, context }): Promise<Result> => (await rtc()).joinConference(who(context.user), data.clientId));

export const leaveConference = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ endForAll: z.boolean() })))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    (await rtc()).leaveConference(who(context.user), data.endForAll);
    return { ok: true };
  });

export const endConference = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: boolean }> => ({ ok: (await rtc()).endConference({ ...who(context.user), isAdmin: context.user.isAdmin }) }));

export const kickParticipant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ username })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => ({ ok: (await rtc()).kickParticipant({ username: context.user.username, isAdmin: context.user.isAdmin }, data.username) }));

export const muteParticipant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ username: z.union([username, z.literal("all")]) })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => ({ ok: (await rtc()).muteParticipant({ username: context.user.username, isAdmin: context.user.isAdmin }, data.username) }));

export const setConferenceMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ audio: z.boolean(), video: z.boolean(), screen: z.boolean() })))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    (await rtc()).setMedia(context.user.username, data);
    return { ok: true };
  });

export const setConferenceHand = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ on: z.boolean() })))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    (await rtc()).setHand(context.user.username, data.on);
    return { ok: true };
  });

export const sendConferenceChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ text: z.string().trim().min(1).max(500) })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => ({ ok: (await rtc()).sendChat(who(context.user), data.text) }));

/** Relays a WebRTC negotiation message (offer, answer, ICE candidate) to the other person. */
export const sendConferenceSignal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ to: username, data: z.unknown() })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (JSON.stringify(data.data ?? null).length > 32_000) return { ok: false };
    return { ok: (await rtc()).relaySignal(context.user.username, data.to, data.data) };
  });

/** "I am still here" — every 10 seconds while in the conference. Returns false when the server no longer knows me. */
export const conferenceHeartbeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ inRoom: boolean }> => ({ inRoom: (await rtc()).heartbeat(context.user.username) }));
