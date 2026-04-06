import { Image, StyleSheet, View } from "react-native";
import { PropsWithChildren } from "react";

// tiny base64 noise texture (opaque black specks)
const noiseUri =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADhJREFUeNpiYGBg+M9ABGAEYgFiQAJxBiBGIMYhDsQG4nwBiDdAcQYQAAAwD5ZwA9X3N3FwAAAABJRU5ErkJggg==";

export function GrainOverlay({ children }: PropsWithChildren) {
  return (
    <View style={styles.container}>
      {children}
      <Image source={{ uri: noiseUri }} style={styles.noise} resizeMode="repeat" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  noise: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
    pointerEvents: "none" as const,
  },
});
