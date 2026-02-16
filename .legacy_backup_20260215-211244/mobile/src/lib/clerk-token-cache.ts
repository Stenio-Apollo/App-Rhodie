import * as SecureStore from "expo-secure-store";
import type {TokenCache} from "@clerk/clerk-expo";

const KEY = "clerk_session_jwt";

export const tokenCache: TokenCache = {
    getToken: async () => {
        try {
            return await SecureStore.getItemAsync(KEY);
        } catch {
            return null;
        }
    },
    saveToken: async (token) => {
        try {
            await SecureStore.setItemAsync(KEY, token);
        } catch {
            // noop
        }
    },
};
