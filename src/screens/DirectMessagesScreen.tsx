import {useEffect, useMemo, useState} from "react";
import {Alert, Image, Pressable, ScrollView, Text, TextInput, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import type {CommunityAuthor} from "../state/useCommunity";
import type {DirectMessageConversation, DirectMessagesState} from "../state/useDirectMessages";

type DmStartTarget = {
    key: number;
    author: CommunityAuthor;
};

interface DirectMessagesScreenProps {
    dm: DirectMessagesState;
    startTarget: DmStartTarget | null;
    onClose: () => void;
}

function displayName(author: CommunityAuthor): string {
    return author.fullName?.trim() || "Rhodie member";
}

function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {month: "short", day: "numeric"});
}

function Avatar({author, size = 38}: { author: CommunityAuthor; size?: number }) {
    const initial = displayName(author)[0]?.toUpperCase() ?? "R";
    if (author.avatarUrl) {
        return (
            <Image
                source={{uri: author.avatarUrl}}
                style={[tw`rounded-full bg-black/40`, {width: size, height: size}]}
            />
        );
    }

    return (
        <View style={[tw`items-center justify-center rounded-full bg-[#B55941]`, {width: size, height: size}]}>
            <Text style={[tw`text-sm text-[#FFF6E8]`, {fontFamily: fonts.heading}]}>{initial}</Text>
        </View>
    );
}

function ConversationButton({
                                conversation,
                                selected,
                                onPress,
                            }: {
    conversation: DirectMessageConversation;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({pressed}) => [
                tw`rounded-3xl border border-slate-700 px-4 py-3`,
                selected ? tw`bg-white/10` : tw`bg-black/70`,
                pressed && tw`opacity-80`,
            ]}
        >
            <View style={tw`flex-row items-center gap-3`}>
                <Avatar author={conversation.participant}/>
                <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center gap-2`}>
                        <Text style={[tw`flex-1 text-sm text-white`, {fontFamily: fonts.heading}]}>
                            {displayName(conversation.participant)}
                        </Text>
                        {conversation.unreadCount > 0 ? (
                            <View style={tw`min-w-5 items-center rounded-full bg-[#B55941] px-1.5 py-0.5`}>
                                <Text style={[tw`text-[10px] text-white`, {fontFamily: fonts.button}]}>
                                    {conversation.unreadCount}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <Text numberOfLines={1} style={[tw`mt-1 text-xs text-[#E4E0D4]/70`, {fontFamily: fonts.body}]}>
                        {conversation.lastMessage?.body ?? "Start a message"}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

export function DirectMessagesScreen({dm, startTarget, onClose}: DirectMessagesScreenProps) {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState("");

    useEffect(() => {
        if (!startTarget) return;
        let cancelled = false;

        (async () => {
            try {
                const conversationId = await dm.openConversationWith(startTarget.author.id);
                if (!cancelled) setSelectedConversationId(conversationId);
            } catch (error) {
                Alert.alert("Message failed", error instanceof Error ? error.message : "This message could not be opened.");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [dm.openConversationWith, startTarget]);

    const selectedConversation = useMemo(
        () => dm.conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
        [dm.conversations, selectedConversationId],
    );

    useEffect(() => {
        if (!selectedConversationId) return;
        void dm.markRead(selectedConversationId);
    }, [dm.markRead, selectedConversationId]);

    async function handleSend() {
        if (!selectedConversation) return;
        const body = messageText.trim();
        if (!body) return;

        try {
            setMessageText("");
            haptics.selection();
            await dm.sendMessage(selectedConversation.id, body);
        } catch (error) {
            Alert.alert("Message failed", error instanceof Error ? error.message : "Your message could not be sent.");
            setMessageText(body);
        }
    }

    return (
        <View style={tw`absolute inset-0 z-20 bg-black`}>
            <View style={tw`flex-row items-center justify-between border-b border-slate-700 px-4 py-3`}>
                <View style={tw`flex-row items-center gap-2`}>
                    {selectedConversation ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Back to messages"
                            onPress={() => setSelectedConversationId(null)}
                            style={({pressed}) => [
                                tw`h-8 w-8 items-center justify-center rounded-full`,
                                pressed && tw`opacity-70`,
                            ]}
                        >
                            <Ionicons name="chevron-back" size={20} color="#ffffff"/>
                        </Pressable>
                    ) : null}
                    <Text style={[tw`text-xl text-white`, {fontFamily: fonts.heading}]}>
                        {selectedConversation ? displayName(selectedConversation.participant) : "Messages"}
                    </Text>
                </View>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close messages"
                    onPress={onClose}
                    style={({pressed}) => [
                        tw`h-9 w-9 items-center justify-center rounded-full`,
                        pressed && tw`opacity-70`,
                    ]}
                >
                    <Ionicons name="close" size={20} color="#ffffff"/>
                </Pressable>
            </View>

            {dm.error ? (
                <Text style={[tw`mx-4 mt-4 rounded-2xl bg-black/70 px-4 py-3 text-sm text-rose-200`, {fontFamily: fonts.body}]}>
                    {dm.error}
                </Text>
            ) : null}

            {selectedConversation ? (
                <View style={tw`flex-1`}>
                    <ScrollView
                        style={tw`flex-1`}
                        contentContainerStyle={tw`gap-3 px-4 pb-5 pt-4`}
                        showsVerticalScrollIndicator={false}
                    >
                        {selectedConversation.messages.length === 0 ? (
                            <Text style={[tw`rounded-2xl bg-black/70 px-4 py-3 text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.body}]}>
                                No messages yet.
                            </Text>
                        ) : (
                            selectedConversation.messages.map((message) => {
                                const mine = message.senderId !== selectedConversation.participant.id;
                                return (
                                    <View
                                        key={message.id}
                                        style={[
                                            tw`max-w-[82%] rounded-3xl border border-slate-700 px-4 py-3`,
                                            mine ? tw`self-end bg-[#B55941]` : tw`self-start bg-black/70`,
                                        ]}
                                    >
                                        <Text style={[tw`text-sm leading-5 text-white`, {fontFamily: fonts.body}]}>
                                            {message.body}
                                        </Text>
                                        <Text style={[tw`mt-1 text-[10px] text-white/60`, {fontFamily: fonts.body}]}>
                                            {formatTimestamp(message.createdAt)}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>

                    <View style={tw`flex-row items-center gap-2 border-t border-slate-700 px-4 py-3`}>
                        <TextInput
                            value={messageText}
                            onChangeText={setMessageText}
                            placeholder="Message..."
                            placeholderTextColor="rgba(228,224,212,0.45)"
                            keyboardAppearance="dark"
                            multiline
                            style={[tw`max-h-24 flex-1 rounded-2xl border border-slate-700 bg-black/45 px-3 py-2 text-sm text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                        />
                        <Pressable
                            disabled={dm.busy || messageText.trim().length === 0}
                            onPress={() => {
                                void handleSend();
                            }}
                            style={({pressed}) => [
                                tw`h-10 w-10 items-center justify-center rounded-full`,
                                (dm.busy || messageText.trim().length === 0) && tw`opacity-40`,
                                pressed && tw`opacity-75`,
                            ]}
                        >
                            <Ionicons name="send" size={17} color="#E4E0D4"/>
                        </Pressable>
                    </View>
                </View>
            ) : (
                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`gap-3 px-4 pb-28 pt-4`}
                    showsVerticalScrollIndicator={false}
                >
                    {!dm.isLoaded ? (
                        <Text style={[tw`rounded-2xl bg-black/70 px-4 py-3 text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.body}]}>
                            Loading messages...
                        </Text>
                    ) : dm.conversations.length === 0 ? (
                        <Text style={[tw`rounded-2xl bg-black/70 px-4 py-3 text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.body}]}>
                            No messages yet.
                        </Text>
                    ) : (
                        dm.conversations.map((conversation) => (
                            <ConversationButton
                                key={conversation.id}
                                conversation={conversation}
                                selected={conversation.id === selectedConversationId}
                                onPress={() => {
                                    haptics.navigation();
                                    setSelectedConversationId(conversation.id);
                                }}
                            />
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

export type {DmStartTarget};
