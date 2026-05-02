import React from "react";
import { Composition } from "remotion";
import { ParGameDemo } from "./ParGameDemo";
import { ParPlayedTurnDemo } from "./ParPlayedTurnDemo";
import { ParXHook } from "./ParXHook";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="ParXHook"
        component={ParXHook}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="ParGameDemo"
        component={ParGameDemo}
        durationInFrames={540}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ParPlayedTurnDemo"
        component={ParPlayedTurnDemo}
        durationInFrames={510}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
}
