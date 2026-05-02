import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import desktopCapture from "./captures/par-home-desktop.png";
import mobileCapture from "./captures/par-home-mobile.png";

const colors = {
  green: "#0f2719",
  deep: "#07100b",
  fairway: "#5f8d51",
  lime: "#cbec85",
  cream: "#f7f1df",
  muted: "#c9d0bf",
  gold: "#e0b15e",
  coral: "#ee6f57",
};

function useFadeIn(start, duration = 18) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

function Background() {
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(155deg, #07100b 0%, #102b1c 54%, #07100b 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 18%, rgba(203,236,133,0.2), transparent 24%), radial-gradient(circle at 84% 74%, rgba(224,177,94,0.16), transparent 28%)",
        }}
      />
    </AbsoluteFill>
  );
}

function CaptureFrame({
  src,
  top = 420,
  left = 70,
  width = 940,
  height = 760,
  scale = 1,
  x = 0,
  y = 0,
  crop = "cover",
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width,
        height,
        borderRadius: 32,
        overflow: "hidden",
        border: "2px solid rgba(203, 236, 133, 0.34)",
        boxShadow: "0 38px 110px rgba(0,0,0,0.46)",
        background: "#0d1f15",
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: crop,
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}

function Label({ children, top, left = 70, tone = "lime" }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        padding: "14px 22px",
        borderRadius: 999,
        background:
          tone === "gold" ? "rgba(224,177,94,0.17)" : "rgba(203,236,133,0.16)",
        color: tone === "gold" ? colors.gold : colors.lime,
        border: `1px solid ${
          tone === "gold" ? "rgba(224,177,94,0.44)" : "rgba(203,236,133,0.42)"
        }`,
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: 2,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Headline({ children, top, size = 84, width = 930 }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        width,
        color: colors.cream,
        fontSize: size,
        lineHeight: 0.94,
        fontWeight: 950,
        letterSpacing: -3,
      }}
    >
      {children}
    </div>
  );
}

function Subhead({ children, top }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 72,
        width: 860,
        color: "rgba(247,241,223,0.76)",
        fontSize: 36,
        lineHeight: 1.24,
        fontWeight: 650,
      }}
    >
      {children}
    </div>
  );
}

function SceneWrap({ children, start = 0 }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [start, start + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [start, start + 22], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>
      {children}
    </AbsoluteFill>
  );
}

function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame: frame - 10, fps, config: { damping: 16 } });
  const captureOpacity = useFadeIn(24, 18);

  return (
    <SceneWrap>
      <Img
        src={desktopCapture}
        style={{
          position: "absolute",
          inset: -120,
          width: 1320,
          height: 1160,
          objectFit: "cover",
          filter: "blur(14px) brightness(0.42)",
          transform: "scale(1.2)",
        }}
      />
      <Label top={116}>Browser dice golf</Label>
      <div
        style={{
          position: "absolute",
          top: 190,
          left: 68,
          width: 930,
          color: colors.cream,
          fontSize: 118,
          lineHeight: 0.9,
          fontWeight: 950,
          letterSpacing: -5,
          transform: `scale(${0.92 + title * 0.08})`,
          transformOrigin: "left top",
        }}
      >
        PAR is golf,
        <br />
        played with dice.
      </div>
      <div style={{ opacity: captureOpacity }}>
        <CaptureFrame
          src={desktopCapture}
          top={650}
          height={720}
          scale={1.08}
          y={-40}
        />
      </div>
    </SceneWrap>
  );
}

function RollScene() {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 105], [1.08, 1.24], {
    extrapolateRight: "clamp",
  });

  return (
    <SceneWrap>
      <Label top={116} tone="gold">
        Start fast
      </Label>
      <Headline top={188}>Roll the hole.</Headline>
      <Subhead top={350}>
        Each hole gives you a par, a dice count, and a match to chase.
      </Subhead>
      <CaptureFrame
        src={desktopCapture}
        top={560}
        height={980}
        scale={zoom}
        x={-22}
        y={-10}
      />
      <div
        style={{
          position: "absolute",
          left: 112,
          bottom: 184,
          padding: "22px 30px",
          borderRadius: 24,
          background: "rgba(7,16,11,0.82)",
          color: colors.lime,
          fontSize: 34,
          fontWeight: 900,
          boxShadow: "0 18px 60px rgba(0,0,0,0.36)",
        }}
      >
        Roll Dice to start the hole
      </div>
    </SceneWrap>
  );
}

function ScorecardScene() {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 105], [1.22, 1.38], {
    extrapolateRight: "clamp",
  });

  return (
    <SceneWrap>
      <Label top={116}>Live scorecard</Label>
      <Headline top={188}>Every hole stays visible.</Headline>
      <Subhead top={350}>
        PAR keeps the round readable: hole, par, player score, and total.
      </Subhead>
      <CaptureFrame
        src={desktopCapture}
        top={560}
        height={980}
        scale={zoom}
        x={-245}
        y={-8}
      />
      <div
        style={{
          position: "absolute",
          right: 96,
          bottom: 184,
          width: 360,
          padding: 28,
          borderRadius: 28,
          background: colors.lime,
          color: "#0c130e",
          fontSize: 34,
          lineHeight: 1.08,
          fontWeight: 950,
        }}
      >
        Low round wins.
      </div>
    </SceneWrap>
  );
}

function MobileScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phone = spring({ frame: frame - 12, fps, config: { damping: 18 } });

  return (
    <SceneWrap>
      <Label top={116} tone="gold">
        Link-first play
      </Label>
      <Headline top={188} size={78}>
        Built for quick rounds.
      </Headline>
      <Subhead top={340}>
        The same room, roll, and scorecard flow works in a mobile viewport.
      </Subhead>
      <div
        style={{
          position: "absolute",
          left: 248,
          top: 520,
          width: 584,
          height: 1034,
          borderRadius: 64,
          padding: 18,
          background: "#050806",
          boxShadow: "0 40px 110px rgba(0,0,0,0.58)",
          transform: `scale(${phone}) rotate(${interpolate(
            frame,
            [0, 42],
            [-4,
            0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )}deg)`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 48,
            overflow: "hidden",
            background: colors.deep,
          }}
        >
          <Img
            src={mobileCapture}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
            }}
          />
        </div>
      </div>
    </SceneWrap>
  );
}

function FinalScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badge = spring({ frame: frame - 28, fps, config: { damping: 12 } });
  const lineOpacity = useFadeIn(55, 18);

  return (
    <SceneWrap>
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 126,
          fontSize: 44,
          letterSpacing: 10,
          fontWeight: 950,
          color: colors.lime,
        }}
      >
        PAR
      </div>
      <Headline top={330} size={108}>
        Make the match.
        <br />
        Bank the score.
        <br />
        Beat the card.
      </Headline>
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 800,
          width: 920,
          opacity: lineOpacity,
          color: "rgba(247,241,223,0.78)",
          fontSize: 40,
          lineHeight: 1.2,
          fontWeight: 700,
        }}
      >
        A fast social dice golf game with live rooms, scorecards, and rounds you
        can start from a link.
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: 280,
          padding: "30px 42px",
          borderRadius: 999,
          background: colors.lime,
          color: "#09110c",
          fontSize: 44,
          fontWeight: 950,
          transform: `scale(${badge})`,
          transformOrigin: "left center",
        }}
      >
        par-dice-golf.vercel.app
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: 190,
          color: colors.gold,
          fontSize: 34,
          fontWeight: 900,
        }}
      >
        Play from the browser. No app store.
      </div>
    </SceneWrap>
  );
}

export function ParGameDemo() {
  return (
    <AbsoluteFill
      style={{
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        color: colors.cream,
      }}
    >
      <Background />
      <Sequence from={0} durationInFrames={112}>
        <IntroScene />
      </Sequence>
      <Sequence from={108} durationInFrames={112}>
        <RollScene />
      </Sequence>
      <Sequence from={216} durationInFrames={112}>
        <ScorecardScene />
      </Sequence>
      <Sequence from={324} durationInFrames={112}>
        <MobileScene />
      </Sequence>
      <Sequence from={432} durationInFrames={108}>
        <FinalScene />
      </Sequence>
    </AbsoluteFill>
  );
}
