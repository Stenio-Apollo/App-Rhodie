import { useState } from "react";
import { SafeAreaView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button } from "./src/components/ui/Button";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { KanbanScreen } from "./src/screens/KanbanScreen";
import tw from "./src/lib/tw";
import { useTasks } from "./src/state/useTasks";

type Tab = "board" | "calendar";

export default function App() {
  const [tab, setTab] = useState<Tab>("board");
  const tasksState = useTasks();

  return (
    <SafeAreaView style={tw`flex-1 bg-orange-100`}>
      <StatusBar style="dark" />

      <View style={tw`flex-row items-center justify-between border-b border-orange-100 px-4 py-3`}>
        <Text style={tw`text-xl font-black text-black`}>Rhodie</Text>
        <View style={tw`flex-row gap-2`}>
          <Button label="Board" variant={tab === "board" ? "primary" : "secondary"} onPress={() => setTab("board")} />
          <Button label="Calendar" variant={tab === "calendar" ? "primary" : "secondary"} onPress={() => setTab("calendar")} />
        </View>
      </View>

      {tab === "board" ? <KanbanScreen tasksState={tasksState} /> : <CalendarScreen tasks={tasksState.tasks} />}
    </SafeAreaView>
  );
}
