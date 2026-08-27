import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PLAYER_COLORS, genRoomCode } from "@/game/constants";
import { loadSave, writeSave, DEFAULT_SAVE } from "@/game/save";
import { LocalSession, OnlineSession, type HudState, type LocalSlot } from "@/game/session";
import type { SimSettings } from "@/game/sim";
import { audio } from "@/game/audio";
import { useP2PRoom } from "@/lib/multiplayer";
import { MenuView, LocalSetupView } from "./menu";
import { LobbyView } from "./lobby";
import { Arena } from "./arena";
import { TitleMark } from "./title-mark";

type Screen = "menu" | "local-setup" | "local-play" | "online";

function defaultSlots(name: string): LocalSlot[] {
  return PLAYER_COLORS.map((c, i) => ({
    kind: i === 0 ? "human" : i < 4 ? "bot" : "off",
    name: i === 0 ? name : c.name,
  }));
}

function releaseFocus() {
  if (typeof document === "undefined") return;
  const el = document.activeElement;
  if (el instanceof HTMLElement) el.blur();
}

/** Navigate on a later turn so WebView keyboard/focus teardown isn't mid-commit. */
function afterFocusSettles(run: () => void) {
  releaseFocus();
  window.setTimeout(run, 0);
}

export function ZatackaApp({
  initialRoom,
  initialName,
}: {
  initialRoom?: string;
  initialName?: string;
}) {
  const saved = DEFAULT_SAVE;
  const [screen, setScreen] = useState<Screen>(initialRoom ? "online" : "menu");
  const [roomCode, setRoomCode] = useState(initialRoom ?? "");
  const [name, setName] = useState(initialName ?? saved.name);
  const [joinCode, setJoinCode] = useState("");
  const [slots, setSlots] = useState<LocalSlot[]>(() => defaultSlots(saved.name));
  const [speed, setSpeed] = useState(saved.speed);
  const [holes, setHoles] = useState(saved.holes);
  const [barriers, setBarriers] = useState(saved.barriers);
  const [target, setTarget] = useState(saved.targetScore);
  const [localSession, setLocalSession] = useState<LocalSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      sessionStorage.removeItem("zatacka-dom-race-reload");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const s = loadSave();
    setName(s.name);
    setSpeed(s.speed);
    setHoles(s.holes);
    setBarriers(s.barriers);
    setTarget(s.targetScore);
    setSlots(defaultSlots(s.name));
    audio.setVolume(s.volume);
    audio.setMuted(s.muted);
  }, []);

  useEffect(() => {
    if (!initialRoom) return;
    setRoomCode(initialRoom);
    setScreen("online");
  }, [initialRoom]);

  const settings = useMemo<SimSettings>(
    () => ({ speed, holes, barriers, targetScore: target }),
    [speed, holes, barriers, target],
  );

  const persistName = (n: string) => writeSave({ name: n });

  const goPlay = () => {
    audio.unlock();
    writeSave({ name, speed, holes, barriers, targetScore: target });
    const next = defaultSlots(name.trim() || "Pilot");
    setSlots(next);
    setLocalSession(new LocalSession(next, settings));
    setScreen("local-play");
  };

  const startLocal = () => {
    audio.unlock();
    writeSave({ name, speed, holes, barriers, targetScore: target });
    const named = slots.map((s, i) => ({
      ...s,
      name: i === 0 ? name.trim() || "Pilot" : s.name,
    }));
    setLocalSession(new LocalSession(named, settings));
    setScreen("local-play");
  };

  const createRoom = () => {
    const code = genRoomCode();
    persistName(name);
    try {
      audio.unlock();
    } catch {
      /* AudioContext can fail before a gesture settles */
    }
    afterFocusSettles(() => {
      void navigate({ to: "/r/$code", params: { code } });
    });
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 4) return;
    persistName(name);
    try {
      audio.unlock();
    } catch {
      /* ignore */
    }
    afterFocusSettles(() => {
      void navigate({ to: "/r/$code", params: { code } });
    });
  };

  const leaveOnline = () => {
    afterFocusSettles(() => {
      void navigate({ to: "/" });
    });
  };

  const leaveLocal = () => {
    localSession?.dispose();
    setLocalSession(null);
    setScreen("menu");
  };

  let body: ReactNode;
  if (screen === "local-play" && localSession) {
    body = <Arena session={localSession} onLeave={leaveLocal} />;
  } else if (screen === "online") {
    body = (
      <OnlineRoom
        key={roomCode || "online"}
        code={roomCode}
        name={name.trim() || "Pilot"}
        settings={settings}
        onLeave={leaveOnline}
      />
    );
  } else if (screen === "local-setup") {
    body = (
      <LocalSetupView
        slots={slots}
        setKind={(i, k) =>
          setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, kind: k } : s)))
        }
        speed={speed}
        setSpeed={setSpeed}
        holes={holes}
        setHoles={setHoles}
        barriers={barriers}
        setBarriers={setBarriers}
        target={target}
        setTarget={setTarget}
        onStart={startLocal}
        onBack={() => setScreen("menu")}
      />
    );
  } else {
    body = (
      <MenuView
        name={name}
        onName={setName}
        joinCode={joinCode}
        onJoinCode={setJoinCode}
        onPlay={goPlay}
        onLocal={() => setScreen("local-setup")}
        onCreate={createRoom}
        onJoin={joinRoom}
      />
    );
  }

  return <div className="min-h-dvh bg-bg text-fg">{body}</div>;
}

function OnlineRoom({
  code,
  name,
  settings,
  onLeave,
}: {
  code: string;
  name: string;
  settings: SimSettings;
  onLeave: () => void;
}) {
  const p2p = useP2PRoom({ room: code, name });
  const sessRef = useRef<OnlineSession | null>(null);
  if (!sessRef.current && p2p.selfId) {
    sessRef.current = new OnlineSession(p2p, name, settings);
  }
  const sess = sessRef.current;
  if (sess) {
    sess.p2p = p2p;
    sess.selfId = p2p.selfId;
    sess.name = name;
  }

  const [playing, setPlaying] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [hud, setHud] = useState<HudState>(
    () =>
      sess?.hud ?? {
        phase: "lobby",
        round: 1,
        target: settings.targetScore,
        paused: false,
        worms: [],
        banner: null,
        countdown: null,
        host: false,
        hostId: "",
        connected: false,
        peers: 0,
      },
  );

  useEffect(() => {
    if (!sess) return;
    sess.onHud = (h) => {
      setHud(h);
      if (h.phase !== "lobby") setPlaying(true);
    };
    sess.bind();
    return () => sess.unbind();
  }, [sess]);

  useEffect(() => {
    if (!sess) return;
    sess.name = name;
    sess.syncLobby();
  }, [sess, name]);

  useEffect(() => {
    sess?.onPeersChanged();
  }, [sess, p2p.peers, p2p.joined, p2p.hostId]);

  const leaveRoom = () => {
    p2p.leave();
    onLeave();
  };

  if (playing && sess) {
    return <Arena session={sess} onLeave={leaveRoom} />;
  }

  // Server host id is the only authority. Never fall back to "I am host"
  // just because we haven't heard the server — that made the second player
  // steal the room.
  const hostId = p2p.hostId;
  const isHost = Boolean(hostId) && hostId === p2p.selfId;
  const seated = Boolean(hostId);

  return (
    <LobbyView
      code={code}
      hud={{
        ...hud,
        connected: p2p.joined,
        peers: p2p.peers.length,
        host: isHost,
        hostId,
      }}
      settings={sess?.settings ?? settings}
      peers={p2p.peers}
      botCount={botCount}
      joined={seated}
      selfId={p2p.selfId}
      signalError={p2p.signalError && !p2p.joined ? p2p.signalError : null}
      onBots={(n) => {
        if (!sess) return;
        const v = Math.max(0, Math.min(5, n));
        setBotCount(v);
        sess.setBots(v);
      }}
      onSettings={(s) => {
        if (!sess) return;
        sess.setSettings(s);
        setHud({ ...sess.hud });
      }}
      onStart={() => {
        if (!sess || !isHost) return;
        audio.unlock();
        sess.startMatch();
        setPlaying(true);
      }}
      onLeave={leaveRoom}
    />
  );
}

export function BootSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-fg">
      <TitleMark />
      <p className="mt-4 text-sm text-muted">Achtung, die Kurve</p>
    </div>
  );
}
