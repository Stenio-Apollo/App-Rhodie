import { useEffect, useState } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface AnalogClockProps {
  size?: number;
  accent?: string;
  faceColor?: string;
  tickColor?: string;
  showSeconds?: boolean;
}

function getAngles(date: Date) {
  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  return { hourAngle, minuteAngle, secondAngle };
}

export function AnalogClock({
  size = 128,
  accent = "#B56941",
  faceColor = "#0d0d0d",
  tickColor = "#E4E0D4",
  showSeconds = true,
}: AnalogClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { hourAngle, minuteAngle, secondAngle } = getAngles(now);
  const center = size / 2;
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  const radius = size / 2 - 4; // account for border

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: accent,
        backgroundColor: faceColor,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
      }}
    >
      {ticks.map((i) => {
        const isHour = i % 5 === 0;
        const length = isHour ? size * 0.1 : size * 0.045;
        const thickness = isHour ? 3 : 1;
        const translate = -(radius - length / 2);
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              width: thickness,
              height: length,
              backgroundColor: isHour ? tickColor : "#555",
              top: center - length / 2,
              left: center - thickness / 2,
              transform: [{ rotate: `${i * 6}deg` }, { translateY: translate }],
              opacity: isHour ? 0.9 : 0.6,
            }}
          />
        );
      })}

      {/* hour hand */}
      <View
        style={{
          position: "absolute",
          width: 4,
          height: size * 0.24,
          left: center - 2,
          top: center - size * 0.24,
          backgroundColor: tickColor,
          borderRadius: 4,
          transform: [
            { translateY: (size * 0.24) / 2 },
            { rotate: `${hourAngle}deg` },
            { translateY: -(size * 0.24) / 2 },
          ],
        }}
      />
      {/* minute hand */}
      <View
        style={{
          position: "absolute",
          width: 3,
          height: size * 0.32,
          left: center - 1.5,
          top: center - size * 0.32,
          backgroundColor: tickColor,
          borderRadius: 3,
          transform: [
            { translateY: (size * 0.32) / 2 },
            { rotate: `${minuteAngle}deg` },
            { translateY: -(size * 0.32) / 2 },
          ],
        }}
      />
      {/* second hand */}
      {showSeconds && (
        <View
        style={{
          position: "absolute",
          width: 2,
          height: size * 0.34,
          left: center - 1,
          top: center - size * 0.34,
          backgroundColor: accent,
          borderRadius: 2,
          transform: [
            { translateY: (size * 0.34) / 2 },
            { rotate: `${secondAngle}deg` },
            { translateY: -(size * 0.34) / 2 },
          ],
        }}
      />
      )}
      <View
        style={{
          position: "absolute",
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: accent,
          borderWidth: 2,
          borderColor: tickColor,
        }}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.25)"]}
        start={{ x: 0.4, y: 0.3 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: size / 2,
          pointerEvents: "none",
        }}
      />
    </View>
  );
}
