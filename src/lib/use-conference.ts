import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  conferenceHeartbeat,
  endConference,
  getConferenceState,
  joinConference,
  kickParticipant,
  leaveConference,
  muteParticipant,
  sendConferenceChat,
  sendConferenceSignal,
  setConferenceHand,
  setConferenceMedia,
  startConference,
  type ChatMsg,
  type IceServer,
  type PublicRoom,
} from "./conference";

export type LobbyChoice = { audio: boolean; video: boolean; audioDeviceId?: string; videoDeviceId?: string };
export type PeerView = { username: string; stream: MediaStream; state: RTCPeerConnectionState };

type PeerRec = {
  pc: RTCPeerConnection;
  stream: MediaStream;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pending: RTCIceCandidateInit[];
  bitrateSet: boolean;
};

type Me = { username: string; displayName: string };

const VIDEO_BITRATE = 600_000; // keeps the upload of a mesh call (one copy per person) reasonable

/**
 * Everything about being in the conference: the live stream with the server, the direct WebRTC links to the
 * other people (one per person, "mesh"), my microphone, camera and screen. Browser only.
 */
export function useConference(me: Me | null) {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [hasTurn, setHasTurn] = useState(true);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState({ audio: false, video: false, screen: false });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hand, setHandState] = useState(false);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const clientId = useRef("");
  if (!clientId.current) clientId.current = crypto.randomUUID();
  const meRef = useRef(me);
  meRef.current = me;
  const roomRef = useRef<PublicRoom | null>(null);
  const joinedRef = useRef(false);
  const iceRef = useRef<IceServer[]>([]);
  const pcs = useRef(new Map<string, PeerRec>());
  const audioTrack = useRef<MediaStreamTrack | null>(null);
  const cameraTrack = useRef<MediaStreamTrack | null>(null);
  const screenTrack = useRef<MediaStreamTrack | null>(null);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------- local media ----------

  const liveVideo = () => {
    const t = screenTrack.current ?? cameraTrack.current;
    return t && t.readyState === "live" ? t : null;
  };

  const publishMedia = useCallback(() => {
    const audioOn = Boolean(audioTrack.current && audioTrack.current.readyState === "live" && audioTrack.current.enabled);
    const next = { audio: audioOn, video: Boolean(liveVideo()), screen: Boolean(screenTrack.current) };
    setMedia(next);
    const v = liveVideo();
    setLocalStream(v ? new MediaStream([v]) : null);
    if (joinedRef.current) void setConferenceMedia({ data: next }).catch(() => undefined);
  }, []);

  /** Puts my current microphone / camera (or screen) on the link to one person. */
  const attachLocal = useCallback(async (pc: RTCPeerConnection) => {
    for (const t of pc.getTransceivers()) {
      const kind = t.receiver.track.kind;
      await t.sender.replaceTrack(kind === "audio" ? audioTrack.current : liveVideo()).catch(() => undefined);
    }
  }, []);

  const attachAll = useCallback(async () => {
    await Promise.all([...pcs.current.values()].map((r) => attachLocal(r.pc)));
  }, [attachLocal]);

  async function acquire(choice: LobbyChoice): Promise<void> {
    if (!choice.audio && !choice.video) return;
    const audio: MediaTrackConstraints | false = choice.audio
      ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true, ...(choice.audioDeviceId ? { deviceId: { exact: choice.audioDeviceId } } : {}) }
      : false;
    const video: MediaTrackConstraints | false = choice.video
      ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 }, ...(choice.videoDeviceId ? { deviceId: { exact: choice.videoDeviceId } } : {}) }
      : false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio, video });
    } catch (err) {
      if (!audio || !video) throw err;
      stream = await navigator.mediaDevices.getUserMedia({ audio, video: false }); // no camera: continue with the microphone
      toast.error("دوربین در دسترس نبود؛ فقط با میکروفون وارد می‌شوید.");
    }
    const a = stream.getAudioTracks()[0];
    const v = stream.getVideoTracks()[0];
    if (a) audioTrack.current = a;
    if (v) {
      cameraTrack.current = v;
      v.onended = () => {
        if (cameraTrack.current === v) cameraTrack.current = null;
        void attachAll().then(publishMedia);
      };
    }
  }

  function releaseMedia() {
    for (const r of [audioTrack, cameraTrack, screenTrack]) {
      r.current?.stop();
      r.current = null;
    }
    setMedia({ audio: false, video: false, screen: false });
    setLocalStream(null);
    setHandState(false);
  }

  // ---------- links to the other people ----------

  const signal = useCallback(async (to: string, data: unknown) => {
    await sendConferenceSignal({ data: { to, data } }).catch(() => undefined);
  }, []);

  const newPeer = useCallback(
    (remote: string): PeerRec => {
      const pc = new RTCPeerConnection({ iceServers: iceRef.current });
      const rec: PeerRec = {
        pc,
        stream: new MediaStream(),
        polite: (meRef.current?.username ?? "") > remote,
        makingOffer: false,
        ignoreOffer: false,
        pending: [],
        bitrateSet: false,
      };
      pc.ontrack = (e) => {
        if (!rec.stream.getTracks().includes(e.track)) rec.stream.addTrack(e.track);
        bump();
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) void signal(remote, { candidate: e.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        bump();
        if (pc.connectionState === "failed") pc.restartIce?.();
        if (pc.connectionState === "connected" && !rec.bitrateSet) {
          rec.bitrateSet = true;
          for (const t of pc.getTransceivers()) {
            if (t.receiver.track.kind !== "video") continue;
            try {
              const p = t.sender.getParameters();
              if (!p.encodings || p.encodings.length === 0) p.encodings = [{}];
              p.encodings[0]!.maxBitrate = VIDEO_BITRATE;
              void t.sender.setParameters(p).catch(() => undefined);
            } catch {
              /* not supported: the browser picks the bitrate */
            }
          }
        }
      };
      pc.onnegotiationneeded = async () => {
        try {
          rec.makingOffer = true;
          await pc.setLocalDescription();
          const d = pc.localDescription;
          if (d) await signal(remote, { description: { type: d.type, sdp: d.sdp } });
        } catch {
          /* a failed offer is retried by the next negotiation */
        } finally {
          rec.makingOffer = false;
        }
      };
      pcs.current.set(remote, rec);
      bump();
      return rec;
    },
    [bump, signal],
  );

  /** I am the newer one: I call the person who was here before me. */
  const callPeer = useCallback(
    (remote: string) => {
      if (pcs.current.has(remote)) return;
      const rec = newPeer(remote);
      rec.pc.addTransceiver("audio", { direction: "sendrecv" });
      rec.pc.addTransceiver("video", { direction: "sendrecv" });
      void attachLocal(rec.pc);
    },
    [attachLocal, newPeer],
  );

  const closePeer = useCallback(
    (remote: string) => {
      const rec = pcs.current.get(remote);
      if (!rec) return;
      rec.pc.onicecandidate = null;
      rec.pc.ontrack = null;
      rec.pc.onnegotiationneeded = null;
      rec.pc.onconnectionstatechange = null;
      rec.pc.close();
      pcs.current.delete(remote);
      bump();
    },
    [bump],
  );

  const handleSignal = useCallback(
    async (from: string, data: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      if (!joinedRef.current || !roomRef.current?.participants.some((p) => p.username === from)) return;
      const rec = pcs.current.get(from) ?? newPeer(from);
      const pc = rec.pc;
      try {
        if (data.description) {
          const offer = data.description.type === "offer";
          const collision = offer && (rec.makingOffer || pc.signalingState !== "stable");
          rec.ignoreOffer = !rec.polite && collision;
          if (rec.ignoreOffer) return;
          await pc.setRemoteDescription(data.description);
          for (const c of rec.pending.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
          if (offer) {
            for (const t of pc.getTransceivers()) t.direction = "sendrecv"; // I send and receive too
            await attachLocal(pc);
            await pc.setLocalDescription();
            const d = pc.localDescription;
            if (d) await signal(from, { description: { type: d.type, sdp: d.sdp } });
          }
        } else if (data.candidate) {
          if (!pc.remoteDescription) rec.pending.push(data.candidate);
          else await pc.addIceCandidate(data.candidate).catch((e) => {
            if (!rec.ignoreOffer) throw e;
          });
        }
      } catch {
        /* a broken negotiation with one person must not affect the others */
      }
    },
    [attachLocal, newPeer, signal],
  );

  /** Makes the links match the list of people: call the ones who were here first, drop the ones who left. */
  const reconcile = useCallback(
    (r: PublicRoom | null) => {
      const meName = meRef.current?.username;
      const mine = r?.participants.find((p) => p.username === meName);
      if (!r || !mine) return;
      const others = r.participants.filter((p) => p.username !== meName);
      for (const p of others) {
        const older = p.joinedAt < mine.joinedAt || (p.joinedAt === mine.joinedAt && p.username < (meName ?? ""));
        if (older && !pcs.current.has(p.username)) callPeer(p.username);
      }
      for (const name of [...pcs.current.keys()]) if (!others.some((p) => p.username === name)) closePeer(name);
    },
    [callPeer, closePeer],
  );

  // ---------- joining and leaving ----------

  const teardown = useCallback(() => {
    joinedRef.current = false;
    if (heartbeat.current) clearInterval(heartbeat.current);
    heartbeat.current = null;
    for (const name of [...pcs.current.keys()]) closePeer(name);
    releaseMedia();
    setJoined(false);
    setChat([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePeer]);

  const finishJoin = useCallback(
    (st: { room: PublicRoom | null; chat: ChatMsg[]; iceServers: IceServer[]; hasTurn: boolean }) => {
      iceRef.current = st.iceServers;
      setHasTurn(st.hasTurn);
      roomRef.current = st.room;
      setRoom(st.room);
      setChat(st.chat);
      joinedRef.current = true;
      setJoined(true);
      publishMedia();
      reconcile(st.room);
      if (heartbeat.current) clearInterval(heartbeat.current);
      heartbeat.current = setInterval(() => {
        void conferenceHeartbeat()
          .then((r) => {
            if (!r.inRoom && joinedRef.current) {
              teardown();
              toast.error("ارتباط شما با اتاق قطع شد.");
            }
          })
          .catch(() => undefined);
      }, 10_000);
    },
    [publishMedia, reconcile, teardown],
  );

  const enter = useCallback(
    async (choice: LobbyChoice, call: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
      setBusy(true);
      setError(null);
      try {
        try {
          await acquire(choice);
        } catch (err) {
          const name = (err as { name?: string }).name;
          setError(
            name === "NotAllowedError"
              ? "اجازه‌ی میکروفون یا دوربین داده نشد. از تنظیمات مرورگر (آیکن قفل کنار آدرس) فعالش کنید."
              : "میکروفون یا دوربین پیدا نشد.",
          );
          releaseMedia();
          return;
        }
        const res = await call();
        if (!res.ok) {
          releaseMedia();
          setError(res.error);
          return;
        }
        finishJoin(await getConferenceState());
      } catch {
        releaseMedia();
        setError("اتصال به سرور برقرار نشد.");
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finishJoin],
  );

  const start = useCallback(
    (title: string, notifyAll: boolean, choice: LobbyChoice) => enter(choice, () => startConference({ data: { title, notifyAll, clientId: clientId.current } })),
    [enter],
  );
  const join = useCallback((choice: LobbyChoice) => enter(choice, () => joinConference({ data: { clientId: clientId.current } })), [enter]);

  const leave = useCallback(
    async (endForAll = false) => {
      await leaveConference({ data: { endForAll } }).catch(() => undefined);
      teardown();
    },
    [teardown],
  );

  // ---------- controls ----------

  const toggleAudio = useCallback(async () => {
    const t = audioTrack.current;
    if (t && t.readyState === "live") {
      t.enabled = !t.enabled;
    } else {
      try {
        await acquire({ audio: true, video: false });
        await attachAll();
      } catch {
        toast.error("میکروفون در دسترس نیست.");
        return;
      }
    }
    publishMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachAll, publishMedia]);

  const toggleVideo = useCallback(async () => {
    if (cameraTrack.current && cameraTrack.current.readyState === "live") {
      cameraTrack.current.stop(); // switches the camera light off
      cameraTrack.current = null;
    } else {
      try {
        await acquire({ audio: false, video: true });
      } catch {
        toast.error("دوربین در دسترس نیست.");
        return;
      }
    }
    await attachAll();
    publishMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachAll, publishMedia]);

  const toggleScreen = useCallback(async () => {
    if (screenTrack.current) {
      screenTrack.current.stop();
      screenTrack.current = null;
    } else {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const t = s.getVideoTracks()[0]!;
        screenTrack.current = t;
        t.onended = () => {
          if (screenTrack.current === t) screenTrack.current = null;
          void attachAll().then(publishMedia);
        };
      } catch {
        return; // the person cancelled the picker
      }
    }
    await attachAll();
    publishMedia();
  }, [attachAll, publishMedia]);

  const toggleHand = useCallback(() => {
    const next = !hand;
    setHandState(next);
    void setConferenceHand({ data: { on: next } }).catch(() => undefined);
  }, [hand]);

  const send = useCallback((text: string) => void sendConferenceChat({ data: { text } }).catch(() => toast.error("پیام ارسال نشد.")), []);
  const kick = useCallback((username: string) => void kickParticipant({ data: { username } }), []);
  const mute = useCallback((username: string | "all") => void muteParticipant({ data: { username } }), []);
  const end = useCallback(() => void endConference().then(() => teardown()), [teardown]);

  // ---------- the live stream with the server ----------

  useEffect(() => {
    if (!me || typeof EventSource === "undefined") return;
    const es = new EventSource("/api/rtc");
    const parse = (e: MessageEvent) => JSON.parse(e.data as string);

    es.addEventListener("room", (e) => {
      const r = parse(e as MessageEvent) as PublicRoom | null;
      roomRef.current = r;
      setRoom(r);
      if (joinedRef.current) {
        if (!r || !r.participants.some((p) => p.username === meRef.current?.username)) return; // "ended"/"kicked" handle this
        reconcile(r);
      }
    });
    es.addEventListener("signal", (e) => {
      const d = parse(e as MessageEvent) as { from: string; data: Parameters<typeof handleSignal>[1] };
      void handleSignal(d.from, d.data);
    });
    es.addEventListener("chat", (e) => setChat((c) => [...c, parse(e as MessageEvent) as ChatMsg].slice(-200)));
    es.addEventListener("ended", (e) => {
      if (!joinedRef.current) return;
      const d = parse(e as MessageEvent) as { reason: string; by: string | null };
      teardown();
      toast(d.reason === "empty" ? "کنفرانس پایان یافت." : `کنفرانس توسط ${d.by ?? "میزبان"} پایان یافت.`);
    });
    es.addEventListener("kicked", (e) => {
      if (!joinedRef.current) return;
      const d = parse(e as MessageEvent) as { reason: string };
      teardown();
      toast.error(d.reason === "timeout" ? "ارتباط شما با اتاق قطع شد." : "میزبان شما را از کنفرانس خارج کرد.");
    });
    es.addEventListener("force-mute", () => {
      const t = audioTrack.current;
      if (t && t.enabled) {
        t.enabled = false;
        publishMedia();
        toast("میزبان میکروفون شما را بی‌صدا کرد.");
      }
    });
    es.addEventListener("replaced", (e) => {
      const d = parse(e as MessageEvent) as { except?: string };
      if (joinedRef.current && d.except !== clientId.current) {
        teardown();
        toast("شما از پنجره‌ی دیگری وارد اتاق شدید.");
      }
    });
    // after a reconnect, catch up with what was missed
    es.onopen = () => {
      void getConferenceState()
        .then((st) => {
          roomRef.current = st.room;
          setRoom(st.room);
          setHasTurn(st.hasTurn);
          iceRef.current = st.iceServers;
          if (joinedRef.current && !st.room?.participants.some((p) => p.username === meRef.current?.username)) teardown();
        })
        .catch(() => undefined);
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.username]);

  // closing the tab: let go of the camera, and tell the server (best effort)
  useEffect(() => {
    const onHide = () => {
      if (joinedRef.current) void leaveConference({ data: { endForAll: false } }).catch(() => undefined);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  const peers: PeerView[] = [...pcs.current.entries()].map(([username, r]) => ({ username, stream: r.stream, state: r.pc.connectionState }));

  return { room, chat, hasTurn, joined, busy, error, setError, media, localStream, hand, peers, start, join, leave, toggleAudio, toggleVideo, toggleScreen, toggleHand, send, kick, mute, end };
}
