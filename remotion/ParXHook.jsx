import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const colors = {
  green: "#0f2719",
  fairway: "#5f8d51",
  lime: "#cbec85",
  cream: "#f7f1df",
  ink: "#111512",
  gold: "#e0b15e",
  coral: "#ee6f57",
};

function Die({ value, x, y, delay = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 12,
      stiffness: 110,
    },
  });
  const rotate = interpolate(frame - delay, [0, 36], [-18, 8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pips = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }[value];

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 168,
        height: 168,
        borderRadius: 28,
        background: colors.cream,
        border: `6px solid ${colors.ink}`,
        boxShadow: "0 24px 0 rgba(17, 21, 18, 0.28)",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        padding: 24,
        transform: `scale(${enter}) rotate(${rotate}deg)`,
      }}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          style={{
            width: 25,
            height: 25,
            borderRadius: 99,
            placeSelf: "center",
            background: pips.includes(index) ? colors.green : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function Flag() {
  const frame = useCurrentFrame();
  const wave = Math.sin(frame / 7) * 8;

  return (
    <div
      style={{
        position: "absolute",
        right: 128,
        top: 120,
        width: 190,
        height: 420,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 56,
          width: 12,
          height: 330,
          borderRadius: 8,
          background: colors.cream,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 52,
          top: 54,
          width: 124,
          height: 72,
          borderRadius: "0 20px 20px 0",
          background: colors.coral,
          transform: `skewY(${wave * 0.22}deg)`,
          transformOrigin: "left center",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 382,
          width: 96,
          height: 26,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
}

export function ParXHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 16 } });
  const subtitleOpacity = interpolate(frame, [42, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaY = interpolate(frame, [82, 104], [90, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fairwayShift = interpolate(frame, [0, 150], [0, -70]);

  return (
    <AbsoluteFill
      style={{
        background: colors.green,
        color: colors.cream,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 26% 26%, rgba(203,236,133,0.18), transparent 24%), linear-gradient(150deg, #0f2719 0%, #193e28 58%, #0c1d13 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -160,
          right: -160,
          bottom: -210 + fairwayShift,
          height: 520,
          borderRadius: "50% 50% 0 0",
          background: colors.fairway,
          borderTop: `10px solid ${colors.lime}`,
          transform: "rotate(-4deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 74,
          top: 72,
          fontSize: 36,
          letterSpacing: 8,
          fontWeight: 800,
          color: colors.lime,
        }}
      >
        PAR
      </div>
      <Flag />
      <Die value={6} x={112} y={510} delay={8} />
      <Die value={6} x={310} y={548} delay={16} />
      <Die value={6} x={508} y={498} delay={24} />
      <Die value={2} x={706} y={548} delay={32} />

      <div
        style={{
          position: "absolute",
          left: 74,
          top: 150,
          width: 830,
          transform: `translateY(${(1 - titleIn) * 60}px)`,
          opacity: titleIn,
        }}
      >
        <div
          style={{
            fontSize: 104,
            lineHeight: 0.9,
            fontWeight: 900,
            letterSpacing: -4,
          }}
        >
          Golf,
          <br />
          but with dice.
        </div>
        <div
          style={{
            marginTop: 34,
            maxWidth: 680,
            fontSize: 39,
            lineHeight: 1.18,
            color: "rgba(247, 241, 223, 0.88)",
            opacity: subtitleOpacity,
          }}
        >
          Make the match. Bank the leftover score. Lowest round wins.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 74,
          bottom: 72,
          display: "flex",
          alignItems: "center",
          gap: 24,
          transform: `translateY(${ctaY}px)`,
        }}
      >
        <div
          style={{
            padding: "22px 30px",
            borderRadius: 999,
            background: colors.lime,
            color: colors.ink,
            fontSize: 34,
            fontWeight: 900,
            boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
          }}
        >
          playpardice.com
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: colors.gold,
          }}
        >
          18 holes. One link.
        </div>
      </div>
    </AbsoluteFill>
  );
}
