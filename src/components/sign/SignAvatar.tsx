import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Info,
  Sparkles,
  Hand,
  User,
} from "lucide-react";
import {
  SIGN_DICTIONARY,
  type SignAvatarKeyframe,
  type HandPoseKeyframe,
  type TranslatedSignToken,
  translateTextToSignSequence,
} from "../../services/signDictionaryService";

interface SignAvatarProps {
  text?: string;
  signId?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Articulated Hand SVG Component
 * Renders anatomical palm and jointed fingers (proximal, intermediate, and distal phalanges)
 * with distinct knuckle bends, palm orientation, and finger curls.
 */
function ArticulatedHandSVG({
  hand,
  scale = 1,
  side = "right",
  showLabels = false,
}: {
  hand: HandPoseKeyframe;
  scale?: number;
  side?: "right" | "left";
  showLabels?: boolean;
}) {
  const shape = hand.shape || "open";
  const isLeft = side === "left";
  const mirrorMultiplier = isLeft ? -1 : 1;

  // Render individual finger based on curl ratio (0 = extended, 1 = curled)
  const renderFinger = (
    baseX: number,
    baseY: number,
    angleDeg: number,
    len: number,
    curl: number,
    label: string,
    width = 3.5
  ) => {
    const isCurled = curl >= 0.6;
    const rad = (angleDeg * Math.PI) / 180;

    if (isCurled) {
      // Knuckle folded back into palm: renders proximal rise + folded arch loop
      const foldLen = len * 0.42;
      const midX = baseX + Math.sin(rad) * foldLen;
      const midY = baseY - Math.cos(rad) * foldLen;
      const foldEndX = baseX + Math.sin(rad + 0.3) * (foldLen * 0.4);
      const foldEndY = baseY - Math.cos(rad + 0.3) * (foldLen * 0.4) + 3;

      return (
        <g key={label}>
          {/* Folded proximal segment */}
          <path
            d={`M ${baseX} ${baseY} Q ${midX} ${midY} ${foldEndX} ${foldEndY}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={width}
            strokeLinecap="round"
          />
          {/* Knuckle highlight */}
          <circle cx={midX} cy={midY} r={width * 0.45} fill="#fbbf24" />
          {/* Fold crease */}
          <line
            x1={midX - 1.5}
            y1={midY + 1}
            x2={midX + 1.5}
            y2={midY + 1}
            stroke="#b45309"
            strokeWidth="1"
          />
        </g>
      );
    }

    // Extended finger with proximal and distal phalange joints
    const effectiveLen = len * (1 - curl * 0.3);
    const joint1X = baseX + Math.sin(rad) * (effectiveLen * 0.55);
    const joint1Y = baseY - Math.cos(rad) * (effectiveLen * 0.55);

    const tipX = baseX + Math.sin(rad) * effectiveLen;
    const tipY = baseY - Math.cos(rad) * effectiveLen;

    return (
      <g key={label}>
        {/* Proximal segment (base to knuckle) */}
        <line
          x1={baseX}
          y1={baseY}
          x2={joint1X}
          y2={joint1Y}
          stroke="#fcd34d"
          strokeWidth={width}
          strokeLinecap="round"
        />
        {/* Distal segment (knuckle to fingertip) */}
        <line
          x1={joint1X}
          y1={joint1Y}
          x2={tipX}
          y2={tipY}
          stroke="#f59e0b"
          strokeWidth={width * 0.9}
          strokeLinecap="round"
        />
        {/* Knuckle joint ring */}
        <circle cx={joint1X} cy={joint1Y} r={width * 0.4} fill="#fcd34d" stroke="#f59e0b" strokeWidth="0.8" />
        {/* Fingertip pad / nail */}
        <circle cx={tipX} cy={tipY} r={width * 0.45} fill="#fbbf24" />
      </g>
    );
  };

  // Thumb rendering with opposition logic
  const renderThumb = (baseX: number, baseY: number) => {
    const isUpright = shape === "thumbs_up";
    const isDown = shape === "thumbs_down";
    const isFoldedAcross = shape === "fist" || hand.thumb >= 0.8;
    const isSpreadWide = shape === "ily" || shape === "open" || hand.thumb <= 0.2;

    if (isUpright) {
      // Thumb pointed straight up like a vertical mast
      const jointX = baseX - 4 * mirrorMultiplier;
      const jointY = baseY - 8;
      const tipX = jointX - 1 * mirrorMultiplier;
      const tipY = baseY - 17;

      return (
        <g>
          <line x1={baseX} y1={baseY} x2={jointX} y2={jointY} stroke="#fcd34d" strokeWidth="4" strokeLinecap="round" />
          <line x1={jointX} y1={jointY} x2={tipX} y2={tipY} stroke="#f59e0b" strokeWidth="3.6" strokeLinecap="round" />
          <circle cx={jointX} cy={jointY} r="2" fill="#fbbf24" />
          <circle cx={tipX} cy={tipY} r="2.2" fill="#fcd34d" stroke="#f59e0b" strokeWidth="0.8" />
        </g>
      );
    }

    if (isDown) {
      const jointX = baseX - 4 * mirrorMultiplier;
      const jointY = baseY + 8;
      const tipX = jointX - 1 * mirrorMultiplier;
      const tipY = baseY + 17;

      return (
        <g>
          <line x1={baseX} y1={baseY} x2={jointX} y2={jointY} stroke="#fcd34d" strokeWidth="4" strokeLinecap="round" />
          <line x1={jointX} y1={jointY} x2={tipX} y2={tipY} stroke="#f59e0b" strokeWidth="3.6" strokeLinecap="round" />
        </g>
      );
    }

    if (isFoldedAcross) {
      // Thumb folded across index/middle knuckles
      const tipX = baseX + 6 * mirrorMultiplier;
      const tipY = baseY - 2;

      return (
        <g>
          <path
            d={`M ${baseX} ${baseY} Q ${baseX + 2 * mirrorMultiplier} ${baseY - 4} ${tipX} ${tipY}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={tipX} cy={tipY} r="2" fill="#fbbf24" />
        </g>
      );
    }

    // Default: thumb splayed naturally outward
    const thumbAngle = isSpreadWide ? -40 * mirrorMultiplier : -20 * mirrorMultiplier;
    const thumbRad = (thumbAngle * Math.PI) / 180;
    const thumbLen = 14;
    const midX = baseX + Math.sin(thumbRad) * (thumbLen * 0.6);
    const midY = baseY - Math.cos(thumbRad) * (thumbLen * 0.6);
    const tipX = baseX + Math.sin(thumbRad) * thumbLen;
    const tipY = baseY - Math.cos(thumbRad) * thumbLen;

    return (
      <g>
        <line x1={baseX} y1={baseY} x2={midX} y2={midY} stroke="#fcd34d" strokeWidth="4" strokeLinecap="round" />
        <line x1={midX} y1={midY} x2={tipX} y2={tipY} stroke="#f59e0b" strokeWidth="3.6" strokeLinecap="round" />
        <circle cx={midX} cy={midY} r="2" fill="#fbbf24" />
        <circle cx={tipX} cy={tipY} r="2" fill="#fcd34d" />
      </g>
    );
  };

  // Base palm geometry
  const palmW = 20;
  const palmH = 22;

  return (
    <g transform={`scale(${scale})`}>
      {/* Palm Contour with 3D Shading */}
      <ellipse
        cx="0"
        cy="0"
        rx={palmW / 2}
        ry={palmH / 2}
        fill="#fcd34d"
        stroke="#f59e0b"
        strokeWidth="1.8"
      />
      {/* Palm Crease Lines */}
      <path
        d={`M ${-5 * mirrorMultiplier} -2 Q 0 4 ${6 * mirrorMultiplier} 2`}
        fill="none"
        stroke="#b45309"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d={`M ${-4 * mirrorMultiplier} -6 Q 1 -1 ${5 * mirrorMultiplier} -4`}
        fill="none"
        stroke="#b45309"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Thumb */}
      {renderThumb(-8 * mirrorMultiplier, 2)}

      {/* Index Finger */}
      {renderFinger(-5 * mirrorMultiplier, -8, -12 * mirrorMultiplier, 17, hand.index, "index", 3.4)}

      {/* Middle Finger */}
      {renderFinger(-1 * mirrorMultiplier, -9, 0, 19, hand.middle, "middle", 3.5)}

      {/* Ring Finger */}
      {renderFinger(4 * mirrorMultiplier, -8, 12 * mirrorMultiplier, 17, hand.ring, "ring", 3.3)}

      {/* Pinky Finger */}
      {renderFinger(8 * mirrorMultiplier, -6, 24 * mirrorMultiplier, 14, hand.pinky, "pinky", 2.8)}

      {/* Optional Finger Labels for Inspector Mode */}
      {showLabels && (
        <g fontSize="4" fill="#94a3b8" textAnchor="middle">
          <text x={-16 * mirrorMultiplier} y="2">T</text>
          <text x={-7 * mirrorMultiplier} y="-22">I</text>
          <text x="0" y="-24">M</text>
          <text x={7 * mirrorMultiplier} y="-22">R</text>
          <text x={16 * mirrorMultiplier} y="-17">P</text>
        </g>
      )}
    </g>
  );
}

export default function SignAvatar({
  text = "hello",
  signId,
  autoPlay = true,
  loop = false,
  className = "",
  size = "md",
}: SignAvatarProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<number>(1);
  const [animTick, setAnimTick] = useState(0);
  const [viewMode, setViewMode] = useState<"avatar" | "hand_closeup">("avatar");

  const animFrameIdRef = useRef<number | null>(null);

  // Derive sequence cleanly with greedy multi-word phrase matching
  const sequence: TranslatedSignToken[] = useMemo(() => {
    if (signId && SIGN_DICTIONARY[signId]) {
      return [{
        sign: SIGN_DICTIONARY[signId],
        word: SIGN_DICTIONARY[signId].name,
        isPhraseMatch: false,
      }];
    }
    if (text) {
      const translated = translateTextToSignSequence(text);
      if (translated.length > 0) return translated;
    }
    return [{
      sign: SIGN_DICTIONARY.hello,
      word: "Hello",
      isPhraseMatch: false,
    }];
  }, [text, signId]);

  // Main animation driver
  useEffect(() => {
    if (sequence.length === 0 || !isPlaying) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const currentItem = sequence[currentIndex];
    const keyframe = currentItem?.sign.keyframes[0];
    if (!keyframe) return;

    const startTimestamp = performance.now();
    const duration = (keyframe.durationMs || 1000) / speed;

    const tick = (now: number) => {
      const elapsed = now - startTimestamp;
      const progress = Math.min(1, elapsed / duration);
      setAnimTick((t) => (t + 1) % 10000);

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(tick);
      } else {
        // Move to next in sequence
        if (currentIndex < sequence.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else if (loop) {
          setCurrentIndex(0);
        } else {
          setIsPlaying(false);
        }
      }
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [currentIndex, sequence, isPlaying, speed, loop]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentIndex >= sequence.length - 1) {
        setCurrentIndex(0);
      }
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.5];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    setSpeed(speeds[nextIdx]);
  };

  const currentItem = sequence[currentIndex] || sequence[0];
  const activeSign = currentItem?.sign || SIGN_DICTIONARY.hello;
  const kf: SignAvatarKeyframe = activeSign.keyframes[0] || SIGN_DICTIONARY.hello.keyframes[0];

  // Dynamic kinematic math for avatar limbs
  const oscTime = animTick * 0.15 * speed;
  let waveOffset = 0;
  let nodOffset = 0;
  let chestRubOffset = { x: 0, y: 0 };

  if (isPlaying) {
    if (kf.motionType === "wave") {
      waveOffset = Math.sin(oscTime * 1.5) * 15;
    } else if (kf.motionType === "nod_fist" || kf.motionType === "tap_chin") {
      nodOffset = Math.sin(oscTime * 2) * 8;
    } else if (kf.motionType === "circle_chest") {
      chestRubOffset = {
        x: Math.cos(oscTime * 1.5) * 8,
        y: Math.sin(oscTime * 1.5) * 8,
      };
    }
  }

  // Right arm kinematics (SVG coordinates)
  const rShoulderX = 170;
  const rShoulderY = 130;
  const rArmLen1 = 48;
  const rArmLen2 = 45;

  const rElbowAngleRad = ((kf.rightArm.shoulderElevation + waveOffset) * Math.PI) / 180;
  const rElbowX = rShoulderX + Math.sin(rElbowAngleRad) * rArmLen1;
  const rElbowY = rShoulderY - Math.cos(rElbowAngleRad) * rArmLen1;

  const rHandAngleRad =
    ((kf.rightArm.shoulderElevation + kf.rightArm.elbowFlexion + waveOffset) * Math.PI) / 180;
  const rHandX = rElbowX - Math.sin(rHandAngleRad) * rArmLen2 + chestRubOffset.x;
  const rHandY = rElbowY - Math.cos(rHandAngleRad) * rArmLen2 + nodOffset + chestRubOffset.y;

  // Left arm kinematics
  const lShoulderX = 70;
  const lShoulderY = 130;
  const lArmLen1 = 45;
  const lArmLen2 = 42;

  const lElbowAngleRad = (kf.leftArm.shoulderElevation * Math.PI) / 180;
  const lElbowX = lShoulderX - Math.sin(lElbowAngleRad) * lArmLen1;
  const lElbowY = lShoulderY - Math.cos(lElbowAngleRad) * lArmLen1;

  const lHandAngleRad =
    ((kf.leftArm.shoulderElevation + kf.leftArm.elbowFlexion) * Math.PI) / 180;
  const lHandX = lElbowX + Math.sin(lHandAngleRad) * lArmLen2;
  const lHandY = lElbowY - Math.cos(lHandAngleRad) * lArmLen2;

  // Avatar sizing
  const dimensions = {
    sm: "w-48 h-56",
    md: "w-72 h-80",
    lg: "w-96 h-96",
  }[size];

  return (
    <div
      className={`relative flex flex-col items-center justify-between rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 p-4 shadow-2xl select-none backdrop-blur ${className}`}
    >
      {/* Top Banner: Active Sign Info & View Mode Toggle */}
      <div className="flex w-full items-center justify-between px-1 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl drop-shadow">{activeSign.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-emerald-400 text-sm md:text-base leading-none">
                {activeSign.name}
              </h4>
              {currentItem?.isPhraseMatch && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  <Sparkles size={10} />
                  Phrase Matched
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-slate-400">
                Word: <strong className="text-white">"{currentItem?.word || activeSign.name}"</strong>
              </span>
              <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-mono uppercase">
                {activeSign.category}
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher (Avatar vs Hand Close-up) */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("avatar")}
            title="Full Avatar View"
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === "avatar"
                ? "bg-emerald-500 text-black shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User size={13} />
            <span className="hidden sm:inline">Avatar</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("hand_closeup")}
            title="Magnified Hand Gesture View"
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === "hand_closeup"
                ? "bg-emerald-500 text-black shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Hand size={13} />
            <span className="hidden sm:inline">Hand Close-Up</span>
          </button>
        </div>
      </div>

      {/* Step Sequence Pills (if sequence has multiple words/letters) */}
      {sequence.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto w-full py-2 px-1 scrollbar-thin">
          {sequence.map((token, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setIsPlaying(false);
              }}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                idx === currentIndex
                  ? "bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20"
                  : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>{token.sign.emoji}</span>
              <span>{token.word}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Canvas Presentation Area */}
      {viewMode === "avatar" ? (
        /* Full 2D Kinematic Avatar Canvas */
        <div className={`relative flex items-center justify-center ${dimensions}`}>
          <svg
            viewBox="0 0 240 240"
            className="w-full h-full drop-shadow-[0_10px_25px_rgba(16,185,129,0.12)]"
          >
            <radialGradient id="avatarGlow" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
            <circle cx="120" cy="110" r="100" fill="url(#avatarGlow)" />

            {/* Torso & Shoulders */}
            <path
              d="M 65 240 L 70 145 Q 120 135 170 145 L 175 240 Z"
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Collar */}
            <path
              d="M 95 140 Q 120 160 145 140"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Neck */}
            <rect x="110" y="105" width="20" height="25" rx="5" fill="#fbcfe8" />

            {/* Head */}
            <g transform={`rotate(${kf.headTilt}, 120, 75)`}>
              <ellipse cx="120" cy="72" rx="36" ry="42" fill="#fcd34d" stroke="#f59e0b" strokeWidth="2.5" />
              {/* Hair */}
              <path
                d="M 84 65 Q 120 30 156 65 Q 150 45 120 40 Q 90 45 84 65 Z"
                fill="#334155"
              />

              {/* Eyes */}
              <ellipse cx="106" cy="68" rx="4" ry={kf.expression === "smile" ? "2" : "5"} fill="#0f172a" />
              <ellipse cx="134" cy="68" rx="4" ry={kf.expression === "smile" ? "2" : "5"} fill="#0f172a" />
              <circle cx="107" cy="66" r="1.5" fill="#ffffff" />
              <circle cx="135" cy="66" r="1.5" fill="#ffffff" />

              {/* Eyebrows */}
              {kf.expression === "question" ? (
                <>
                  <path d="M 100 58 Q 106 52 113 58" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M 127 54 Q 134 48 141 54" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M 100 56 Q 106 53 113 56" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M 127 56 Q 134 53 141 56" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </>
              )}

              {/* Nose */}
              <path d="M 120 72 L 118 78 L 122 78" stroke="#d97706" strokeWidth="2" fill="none" strokeLinecap="round" />

              {/* Mouth */}
              {kf.expression === "smile" ? (
                <path d="M 110 88 Q 120 98 130 88" stroke="#e11d48" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              ) : kf.expression === "question" ? (
                <ellipse cx="120" cy="88" rx="3.5" ry="4" fill="#e11d48" />
              ) : (
                <path d="M 112 88 Q 120 90 128 88" stroke="#e11d48" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              )}

              {/* Cheerful Blush */}
              <ellipse cx="98" cy="78" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />
              <ellipse cx="142" cy="78" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />
            </g>

            {/* Left Arm */}
            <g>
              <line x1={lShoulderX} y1={lShoulderY} x2={lElbowX} y2={lElbowY} stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
              <line x1={lElbowX} y1={lElbowY} x2={lHandX} y2={lHandY} stroke="#fcd34d" strokeWidth="11" strokeLinecap="round" />
              {/* Left Articulated Hand */}
              <g transform={`translate(${lHandX}, ${lHandY})`}>
                <ArticulatedHandSVG hand={kf.leftArm.hand} scale={0.7} side="left" />
              </g>
            </g>

            {/* Right Arm */}
            <g>
              <line x1={rShoulderX} y1={rShoulderY} x2={rElbowX} y2={rElbowY} stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
              <line x1={rElbowX} y1={rElbowY} x2={rHandX} y2={rHandY} stroke="#fcd34d" strokeWidth="11" strokeLinecap="round" />
              {/* Right Articulated Hand */}
              <g transform={`translate(${rHandX}, ${rHandY})`}>
                <ArticulatedHandSVG hand={kf.rightArm.hand} scale={0.75} side="right" />
              </g>
            </g>
          </svg>
        </div>
      ) : (
        /* Magnified Hand Gesture Close-Up Inspector */
        <div className={`relative flex flex-col items-center justify-center p-3 w-full max-w-sm`}>
          <div className="relative w-48 h-48 bg-slate-900/90 rounded-2xl border border-emerald-500/30 p-2 flex items-center justify-center shadow-inner">
            <svg viewBox="-50 -50 100 100" className="w-full h-full drop-shadow-md">
              <ArticulatedHandSVG
                hand={kf.rightArm.hand}
                scale={1.4}
                side="right"
                showLabels={true}
              />
            </svg>

            {/* Orientation Badge */}
            <div className="absolute bottom-2 inset-x-2 text-center bg-slate-950/80 rounded-md py-0.5 text-[10px] text-emerald-400 font-mono">
              Palm: {activeSign.handDetails.orientation.toUpperCase()}
            </div>
          </div>

          {/* Finger-by-Finger Anatomical Breakdown */}
          <div className="w-full mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="font-bold text-amber-400">Thumb: </span>
              <span className="text-slate-300">{activeSign.handDetails.thumb}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="font-bold text-emerald-400">Index: </span>
              <span className="text-slate-300">{activeSign.handDetails.index}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="font-bold text-cyan-400">Middle: </span>
              <span className="text-slate-300">{activeSign.handDetails.middle}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="font-bold text-indigo-400">Ring: </span>
              <span className="text-slate-300">{activeSign.handDetails.ring}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 col-span-2">
              <span className="font-bold text-pink-400">Pinky: </span>
              <span className="text-slate-300">{activeSign.handDetails.pinky}</span>
            </div>
          </div>
        </div>
      )}

      {/* Gesture Action Cue & Instruction */}
      <div className="w-full bg-slate-950/90 rounded-2xl p-3 border border-slate-800 text-left my-2 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
          <Info size={12} />
          <span>How to Perform:</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          {activeSign.handDetails.actionCue || activeSign.description}
        </p>
      </div>

      {/* Playback Controls & Speed */}
      <div className="flex w-full items-center justify-between border-t border-slate-800/80 pt-2.5 px-1">
        <button
          type="button"
          onClick={handleReset}
          title="Replay from start"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <RotateCcw size={16} />
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2 font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
        >
          {isPlaying ? (
            <>
              <Pause size={14} /> Pause
            </>
          ) : (
            <>
              <Play size={14} /> Play
            </>
          )}
        </button>

        <button
          type="button"
          onClick={cycleSpeed}
          title="Playback speed"
          className="flex items-center gap-1 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 transition"
        >
          <FastForward size={13} />
          {speed}x
        </button>
      </div>
    </div>
  );
}
