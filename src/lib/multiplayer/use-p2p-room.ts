/**
 * React binding for P2PRoom. Identity and room id are captured once on mount
 * (useState initializers) so re-renders never tear down the mesh.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { P2PRoom, type PeerInfo } from "./p2p";

export interface UseP2PRoomOptions {
  room?: string;
  name?: string;
}

export interface P2PRoomHandle {
  selfId: string;
  room: string;
  peers: PeerInfo[];
  joined: boolean;
  hostId: string;
  signalError: string | null;
  broadcast: (data: unknown) => void;
  send: (data: unknown, peerId?: string) => void;
  /** Drop from the roster (Leave room). Remounts must not call this. */
  leave: () => void;
  onMessage: (
    fn: (from: string, data: unknown, channel: "state" | "reliable") => void,
  ) => () => void;
}

function defaultRoom(): string {
  if (typeof window === "undefined") return "";
  return `room-${window.location.hostname.split(".")[0]}`.slice(0, 64);
}

function loadOrCreateSelfId(room: string): string {
  const fresh = () => `p-${Math.random().toString(36).slice(2, 10)}`;
  if (typeof window === "undefined") return "";
  const key = `zatacka-peer:${room}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing && /^p-[a-z0-9]{4,16}$/.test(existing)) return existing;
    const id = fresh();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return fresh();
  }
}

export function useP2PRoom(options: UseP2PRoomOptions = {}): P2PRoomHandle {
  const [room] = useState(() => options.room ?? defaultRoom());
  const [selfId, setSelfId] = useState("");
  const name = options.name ?? "";
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState(false);
  const [hostId, setHostId] = useState("");
  const [signalError, setSignalError] = useState<string | null>(null);
  const roomRef = useRef<P2PRoom | null>(null);
  const listeners = useRef(
    new Set<(from: string, data: unknown, channel: "state" | "reliable") => void>(),
  );

  useEffect(() => {
    setSelfId(loadOrCreateSelfId(room));
  }, [room]);

  useEffect(() => {
    if (!room || !selfId) return;
    const p2p = new P2PRoom({
      room,
      selfId,
      name,
      onPeersChanged: setPeers,
      onMessage: (from, data, channel) => {
        for (const fn of listeners.current) fn(from, data, channel);
      },
      onConnected: () => {
        setJoined(true);
        setSignalError(null);
      },
      onHostId: (id) => {
        setHostId(id);
        setSignalError(null);
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "signaling failed";
        setSignalError(msg);
      },
    });
    roomRef.current = p2p;
    void p2p.join();
    const onPageHide = () => p2p.close(true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      roomRef.current = null;
      // Remounts (StrictMode, lobby gate) must not DELETE this peer or the
      // next joiner is elected host.
      p2p.close(false);
    };
  }, [room, selfId, name]);

  const broadcast = useCallback((data: unknown) => roomRef.current?.broadcast(data), []);
  const send = useCallback(
    (data: unknown, peerId?: string) => roomRef.current?.send(data, peerId),
    [],
  );
  const leave = useCallback(() => roomRef.current?.close(true), []);
  const onMessage = useCallback(
    (fn: (from: string, data: unknown, channel: "state" | "reliable") => void) => {
      listeners.current.add(fn);
      return () => {
        listeners.current.delete(fn);
      };
    },
    [],
  );

  return { selfId, room, peers, joined, hostId, signalError, broadcast, send, leave, onMessage };
}
