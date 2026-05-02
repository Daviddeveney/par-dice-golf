import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import readyCapture from "./captures/played-turn/01-ready.png";
import rolledCapture from "./captures/played-turn/02-rolled.png";
import postedCapture from "./captures/played-turn/03-posted.png";
import rollAnimation from "./captures/played-turn/roll-animation.mp4";

const colors = {
  green: "#0f2719",
  deep: "#07100b",
  lime: "#cbec85",
  cream: "#f7f1df",
  muted: "#c9d0bf",
  gold: "#e0b15e",
  coral: "#ee6f57",
};

const roll = {
  dice: "2, 4, 1, 1",
  score: "5",
  par: "Par 4",
  total: "Total 5 (+1)",
};

function fade(frame, start, end) {
  return interpolate(frame, [start, end], [0, 1], {
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
          "radial-gradient(circle at 18% 20%, rgba(203,236,133,0.18), transparent 26%), linear-gradient(150deg, #07100b 0%, #102b1c 54%, #07100b 100%)",
      }}
    />
  );
}

function PhoneFrame({ src, top = 486, scale = 1, x = 0, y = 0 }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        width: 940,
        height: 1040,
        borderRadius: 36,
        overflow: "hidden",
        border: "2px solid rgba(203, 236, 133, 0.34)",
        background: colors.deep,
        boxShadow: "0 38px 120px rgba(0,0,0,0.55)",
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
          transformOrigin: "center top",
        }}
      />
    </div>
  );
}

function VideoFrame({ top = 486, scale = 1.16, y = -16 }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        width: 940,
        height: 1040,
        borderRadius: 36,
        overflow: "hidden",
        border: "2px solid rgba(203, 236, 133, 0.34)",
        background: colors.deep,
        boxShadow: "0 38px 120px rgba(0,0,0,0.55)",
      }}
    >
      <Video
        src={rollAnimation}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(0px, ${y}px) scale(${scale})`,
          transformOrigin: "center top",
        }}
      />
    </div>
  );
}

function Eyebrow({ children, top = 116, tone = "lime" }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        padding: "14px 22px",
        borderRadius: 999,
        background:
          tone === "gold" ? "rgba(224,177,94,0.17)" : "rgba(203,236,133,0.16)",
        border: `1px solid ${
          tone === "gold" ? "rgba(224,177,94,0.44)" : "rgba(203,236,133,0.42)"
        }`,
        color: tone === "gold" ? colors.gold : colors.lime,
        fontSize: 23,
        fontWeight: 950,
        letterSpacing: 2,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Title({ children, top = 190, size = 86 }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        width: 920,
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

function Copy({ children, top = 346 }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 72,
        width: 840,
        color: "rgba(247,241,223,0.78)",
        fontSize: 35,
        lineHeight: 1.24,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function Scene({ children }) {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 16);
  const y = interpolate(frame, [0, 20], [38, 0], {
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

function ReadyScene() {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 98], [1.04, 1.16], {
    extrapolateRight: "clamp",
  });

  return (
    <Scene>
      <Eyebrow>Actual local capture</Eyebrow>
      <Title>Hole 1 starts on a Par 5.</Title>
      <Copy>PAR sets the dice count, rolls available, and scorecard before the first roll.</Copy>
      <PhoneFrame src={readyCapture} scale={zoom} y={-22} />
    </Scene>
  );
}

function RolledScene() {
  const frame = useCurrentFrame();
  const statIn = spring({
    frame: frame - 28,
    fps: useVideoConfig().fps,
    config: { damping: 14, stiffness: 110 },
  });

  return (
    <Scene>
      <Eyebrow tone="gold">Roll 1 of 4</Eyebrow>
      <Title>Dice hit the green.</Title>
      <Copy>
        Watch the actual browser roll animation settle into {roll.dice}. No 3 of a
        kind yet, so recovery scoring applies.
      </Copy>
      <VideoFrame />
      <div
        style={{
          position: "absolute",
          left: 118,
          bottom: 236,
          display: "flex",
          gap: 18,
          transform: `scale(${statIn})`,
          transformOrigin: "left center",
        }}
      >
        <div
          style={{
            padding: "24px 30px",
            borderRadius: 26,
            background: colors.lime,
            color: colors.deep,
            fontSize: 42,
            fontWeight: 950,
          }}
        >
          Score {roll.score}
        </div>
        <div
          style={{
            padding: "24px 30px",
            borderRadius: 26,
            background: "rgba(7,16,11,0.86)",
            color: colors.cream,
            fontSize: 34,
            fontWeight: 900,
            border: "1px solid rgba(247,241,223,0.18)",
          }}
        >
          {roll.dice}
        </div>
      </div>
    </Scene>
  );
}

function PostedScene() {
  const frame = useCurrentFrame();
  const pulse = interpolate(frame, [20, 42, 64], [1, 1.05, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Scene>
      <Eyebrow>Score posted</Eyebrow>
      <Title>One click banks the hole.</Title>
      <Copy>
        The scorecard updates immediately, and the round advances to the next hole.
      </Copy>
      <PhoneFrame src={postedCapture} scale={1.18} y={-16} />
      <div
        style={{
          position: "absolute",
          right: 104,
          bottom: 226,
          width: 410,
          padding: 32,
          borderRadius: 32,
          background: colors.lime,
          color: colors.deep,
          fontSize: 42,
          lineHeight: 1.05,
          fontWeight: 950,
          transform: `scale(${pulse})`,
          boxShadow: "0 22px 70px rgba(0,0,0,0.38)",
        }}
      >
        Hole 1 posted:
        <br />
        {roll.score}
      </div>
    </Scene>
  );
}

function RecapScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badge = spring({ frame: frame - 38, fps, config: { damping: 12 } });
  const line = fade(frame, 24, 46);

  return (
    <Scene>
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 120,
          color: colors.lime,
          fontSize: 44,
          fontWeight: 950,
          letterSpacing: 10,
        }}
      >
        PAR
      </div>
      <Title top={330} size={102}>
        Roll.
        <br />
        Read the score.
        <br />
        Bank the hole.
      </Title>
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 770,
          width: 880,
          opacity: line,
          color: "rgba(247,241,223,0.78)",
          fontSize: 40,
          lineHeight: 1.22,
          fontWeight: 750,
        }}
      >
        Actual captured turn: {roll.par}, dice {roll.dice}, posted score {roll.score}.
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: 340,
          width: 880,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          transform: `scale(${badge})`,
          transformOrigin: "left center",
        }}
      >
        {[
          ["Dice", roll.dice],
          ["Posted", roll.score],
          ["Hole", roll.par],
          ["Round", roll.total],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: 28,
              minHeight: 154,
              borderRadius: 28,
              background: "rgba(247,241,223,0.08)",
              border: "1px solid rgba(247,241,223,0.16)",
            }}
          >
            <div
              style={{
                color: colors.gold,
                fontSize: 22,
                fontWeight: 950,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
            <div
              style={{
                marginTop: 14,
                color: colors.cream,
                fontSize: label === "Dice" ? 40 : 48,
                lineHeight: 1.02,
                fontWeight: 950,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: 180,
          padding: "28px 38px",
          borderRadius: 999,
          background: colors.lime,
          color: colors.deep,
          fontSize: 42,
          fontWeight: 950,
        }}
      >
        par-dice-golf.vercel.app
      </div>
    </Scene>
  );
}

export function ParPlayedTurnDemo() {
  return (
    <AbsoluteFill
      style={{
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <Background />
      <Sequence from={0} durationInFrames={126}>
        <ReadyScene />
      </Sequence>
      <Sequence from={122} durationInFrames={138}>
        <RolledScene />
      </Sequence>
      <Sequence from={256} durationInFrames={128}>
        <PostedScene />
      </Sequence>
      <Sequence from={380} durationInFrames={130}>
        <RecapScene />
      </Sequence>
    </AbsoluteFill>
  );
}
