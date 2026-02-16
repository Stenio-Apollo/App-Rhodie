import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

export function AuthScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit() {
    try {
      if (mode === "signIn") {
        if (!signInLoaded) return;
        const result = await signIn.create({ identifier: email, password });
        if (result.status === "complete") {
          await setSignInActive({ session: result.createdSessionId });
        }
      } else {
        if (!signUpLoaded) return;
        const result = await signUp.create({ emailAddress: email, password });
        if (result.status === "complete") {
          await setSignUpActive({ session: result.createdSessionId });
        } else {
          Alert.alert("Verification required", "Check your email to complete sign up.");
        }
      }
    } catch (error) {
      Alert.alert("Auth error", error instanceof Error ? error.message : "Failed to authenticate");
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#f1f5f9", padding: 20 }}>
      <View style={{ borderRadius: 20, backgroundColor: "white", padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#0f172a" }}>Task Editor</Text>
        <Text style={{ marginTop: 8, color: "#475569" }}>Kanban + calendar with Clerk auth</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          style={{
            marginTop: 20,
            borderWidth: 1,
            borderColor: "#cbd5e1",
            borderRadius: 12,
            padding: 12,
          }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#cbd5e1",
            borderRadius: 12,
            padding: 12,
          }}
        />

        <Pressable
          onPress={handleSubmit}
          style={{
            marginTop: 18,
            borderRadius: 12,
            backgroundColor: "#0ea5e9",
            alignItems: "center",
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>{mode === "signIn" ? "Sign In" : "Sign Up"}</Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")} style={{ marginTop: 16 }}>
          <Text style={{ color: "#334155", textAlign: "center" }}>
            {mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
