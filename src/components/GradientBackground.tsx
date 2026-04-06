import { LinearGradient } from "expo-linear-gradient";
import { PropsWithChildren } from "react";
import { GrainOverlay } from "./GrainOverlay";

export function GradientBackground({ children }: PropsWithChildren) {
  return (
    <LinearGradient
      colors={["#0b0b0b", "#151515", "#0b0b0b"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <GrainOverlay>{children}</GrainOverlay>
    </LinearGradient>
  );
}
