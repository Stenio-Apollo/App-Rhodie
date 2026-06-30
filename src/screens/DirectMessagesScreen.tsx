import {Fragment, useEffect, useMemo, useRef, useState} from "react";
import {Alert, Animated, Easing, Image, Pressable, ScrollView, Text, TextInput, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import type {CommunityAuthor} from "../state/useCommunity";
import type {DirectMessage, DirectMessageConversation, DirectMessagesState} from "../state/useDirectMessages";
import {useKeyboardInset} from "../lib/useKeyboardInset";
import {OwnerActionSheet} from "../components/OwnerActionSheet";
import type {VisualMode} from "../state/useVisualMode";
import {ScreenBackground, useScreenVisualMode} from "../components/ScreenBackground";

type DmStartTarget = {
    key: number;
    author: CommunityAuthor;
};

interface DirectMessagesScreenProps {
    dm: DirectMessagesState;
    startTarget: DmStartTarget | null;
    onClose: () => void;
    visualMode: VisualMode;
}

const COAST_SURFACE_COLOR = "#708090";
const GEORGIA_SURFACE_COLOR = "#2F4F4F";

function displayName(author: CommunityAuthor): string {
    return author.fullName?.trim() || "Rhodie member";
}

function messageDate(value: string): Date | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function formatDateKey(value: string): string {
    const date = messageDate(value);
    if (!date) return value;
    return date.toLocaleDateString("en-CA");
}

function formatDateLabel(value: string): string {
    const date = messageDate(value);
    if (!date) return "";
    return date.toLocaleDateString(undefined, {month: "short", day: "numeric"});
}

function formatMessageTime(value: string): string {
    const date = messageDate(value);
    if (!date) return "";
    return date.toLocaleTimeString(undefined, {hour: "numeric", minute: "2-digit"});
}

function hasReadMessage(message: DirectMessage, conversation: DirectMessageConversation): boolean {
    const readDate = conversation.participantLastReadAt ? messageDate(conversation.participantLastReadAt) : null;
    const messageCreatedAt = messageDate(message.createdAt);
    if (!readDate || !messageCreatedAt) return false;
    return readDate.getTime() >= messageCreatedAt.getTime();
}

function messageReceipt(
    message: DirectMessage,
    conversation: DirectMessageConversation,
    currentUserId: string | null,
): "Read" | "Delivered" | null {
    if (!currentUserId || message.senderId !== currentUserId) return null;

    const ownMessages = conversation.messages.filter((item) => item.senderId === currentUserId);
    const latestOwnMessage = ownMessages[ownMessages.length - 1] ?? null;
    const readOwnMessages = ownMessages.filter((item) => hasReadMessage(item, conversation));
    const latestReadOwnMessage = readOwnMessages[readOwnMessages.length - 1] ?? null;

    if (latestReadOwnMessage?.id === message.id) return "Read";
    if (latestOwnMessage?.id === message.id && latestReadOwnMessage?.id !== latestOwnMessage.id) return "Delivered";
    return null;
}

function Avatar({author, size = 38}: { author: CommunityAuthor; size?: number }) {
    const initial = displayName(author)[0]?.toUpperCase() ?? "R";
    const visualMode = useScreenVisualMode();
    const coastMode = visualMode === "coast";
    const coastOrRiver = visualMode === "river" || coastMode;
    const accentColor = visualMode === "sonny" ? "#FF3800" : coastOrRiver ? "#FF3800" : "#B55941";
    if (author.avatarUrl) {
        return (
            <Image
                source={{uri: author.avatarUrl}}
                style={[tw`rounded-full bg-black/40`, {width: size, height: size}]}
            />
        );
    }

    return (
        <View style={[tw`items-center justify-center rounded-full`, {width: size, height: size, backgroundColor: accentColor}]}>
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
    const visualMode = useScreenVisualMode();
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const solidMode = coastMode || georgiaMode;
    const coastOrRiver = visualMode === "river" || coastMode;
    const accentColor = visualMode === "sonny" ? "#FF3800" : coastOrRiver ? "#FF3800" : "#B55941";
    const primaryTextColor = coastOrRiver ? "#111111" : "#ffffff";
    const secondaryTextColor = coastOrRiver ? "rgba(17,17,17,0.68)" : "rgba(228,224,212,0.7)";
    return (
        <Pressable
            onPress={onPress}
            style={({pressed}) => [
                tw`rounded-3xl border px-4 py-3`,
                coastOrRiver ? tw`border-black/10` : tw`border-slate-700`,
                selected ? (solidMode ? {backgroundColor: solidSurfaceColor} : tw`bg-white/24`) : coastOrRiver || georgiaMode ? (solidMode ? {backgroundColor: solidSurfaceColor} : tw`bg-white/18`) : tw`bg-black/70`,
                pressed && tw`opacity-80`,
            ]}
        >
            <View style={tw`flex-row items-center gap-3`}>
                <Avatar author={conversation.participant}/>
                <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center gap-2`}>
                        <Text style={[tw`flex-1 text-sm`, {fontFamily: fonts.heading, color: primaryTextColor}]}>
                            {displayName(conversation.participant)}
                        </Text>
                        {conversation.unreadCount > 0 ? (
                            <View style={[tw`min-w-5 items-center rounded-full px-1.5 py-0.5`, {backgroundColor: accentColor}]}>
                                <Text style={[tw`text-[10px] text-white`, {fontFamily: fonts.button}]}>
                                    {conversation.unreadCount}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <Text numberOfLines={1} style={[tw`mt-1 text-xs`, {fontFamily: fonts.body, color: secondaryTextColor}]}>
                        {conversation.lastMessage?.body ?? "Start a message"}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

export function DirectMessagesScreen({dm, startTarget, onClose, visualMode}: DirectMessagesScreenProps) {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingMessageText, setEditingMessageText] = useState("");
    const [actionMessage, setActionMessage] = useState<DirectMessage | null>(null);
    const {keyboardInset} = useKeyboardInset();
    const routeOpacity = useRef(new Animated.Value(0)).current;
    const routeTranslateY = useRef(new Animated.Value(-14)).current;
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const solidMode = coastMode || georgiaMode;
    const coastOrRiver = visualMode === "river" || coastMode;
    const sonnyMode = visualMode === "sonny";
    const accentColor = sonnyMode ? "#FF3800" : coastOrRiver ? "#FF3800" : "#B55941";
    const primaryTextColor = coastOrRiver ? "#111111" : "#ffffff";
    const secondaryTextColor = coastOrRiver ? "rgba(17,17,17,0.62)" : "rgba(255,255,255,0.55)";
    const emptyStateStyle = coastOrRiver || georgiaMode
        ? [
            tw`rounded-2xl px-4 py-3 text-center text-sm`,
            coastOrRiver ? tw`text-[#111111]` : tw`text-[#E4E0D4]`,
            {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
        ]
        : tw`rounded-2xl bg-black/70 px-4 py-3 text-center text-sm text-[#E4E0D4]`;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(routeOpacity, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(routeTranslateY, {
                toValue: 0,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [routeOpacity, routeTranslateY]);

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
    }, [dm.markRead, selectedConversation?.lastMessage?.id, selectedConversationId]);

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

    async function handleEditMessage(message: DirectMessage, body: string) {
        try {
            haptics.selection();
            await dm.editMessage(message.id, body);
        } catch (error) {
            Alert.alert("Edit failed", error instanceof Error ? error.message : "Your message could not be updated.");
            setEditingMessageId(message.id);
            setEditingMessageText(body);
        }
    }

    async function handleDeleteMessage(message: DirectMessage) {
        try {
            haptics.selection();
            await dm.deleteMessage(message.id);
            if (editingMessageId === message.id) {
                setEditingMessageId(null);
                setEditingMessageText("");
            }
        } catch (error) {
            Alert.alert("Delete failed", error instanceof Error ? error.message : "Your message could not be deleted.");
        }
    }

    function openMessageActions(message: DirectMessage) {
        if (dm.busy || message.senderId !== dm.userId) return;

        haptics.selection();
        setActionMessage(message);
    }

    return (
        <ScreenBackground
            visualMode={visualMode}
            style={[tw`absolute inset-0 z-20`, {paddingBottom: keyboardInset}]}
        >
            <Animated.View style={[tw`flex-1`, {opacity: routeOpacity, transform: [{translateY: routeTranslateY}]}]}>
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
                            <Ionicons name="chevron-back" size={20} color={primaryTextColor}/>
                        </Pressable>
                    ) : null}
                    <Text style={[tw`text-xl`, {fontFamily: fonts.heading, color: primaryTextColor}]}>
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
                    <Ionicons name="close" size={20} color={primaryTextColor}/>
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
                            <Text style={[emptyStateStyle, {fontFamily: fonts.body}]}>
                                No messages yet.
                            </Text>
                        ) : (
                            selectedConversation.messages.map((message, index) => {
                                const mine = message.senderId === dm.userId;
	                                const editing = editingMessageId === message.id;
	                                const dateKey = formatDateKey(message.createdAt);
	                                const previousMessage = selectedConversation.messages[index - 1];
	                                const showDate = !previousMessage || formatDateKey(previousMessage.createdAt) !== dateKey;
	                                const actionSelected = actionMessage?.id === message.id;
                                    const receipt = messageReceipt(message, selectedConversation, dm.userId);

                                return (
                                    <Fragment key={message.id}>
                                        {showDate ? (
                                            <View style={tw`my-1 items-center`}>
                                                <Text style={[tw`px-3 py-1 text-[10px]`, {fontFamily: fonts.body, color: coastOrRiver ? "rgba(17,17,17,0.58)" : "rgba(255,255,255,0.65)"}]}>
                                                    {formatDateLabel(message.createdAt)}
                                                </Text>
                                            </View>
                                        ) : null}
                                        <View
                                            style={[
                                                tw`max-w-[82%]`,
                                                mine ? tw`self-end items-end` : tw`self-start items-start`,
                                            ]}
                                        >
                                            <Pressable
                                                onLongPress={() => openMessageActions(message)}
                                                delayLongPress={320}
	                                                style={({pressed}) => [
	                                                    tw`rounded-3xl border border-slate-700 px-4 py-3`,
	                                                    mine ? {backgroundColor: accentColor} : coastOrRiver || georgiaMode ? (solidMode ? {backgroundColor: solidSurfaceColor} : tw`bg-white/24`) : tw`bg-black/70`,
	                                                    actionSelected ? {
	                                                        borderColor: accentColor,
	                                                        shadowColor: accentColor,
	                                                        shadowOffset: {width: 0, height: 0},
	                                                        shadowOpacity: 0.42,
	                                                        shadowRadius: 12,
	                                                        elevation: 8,
	                                                    } : null,
	                                                    pressed && mine && !editing ? tw`opacity-85` : null,
	                                                ]}
	                                            >
                                                {editing ? (
                                                    <View style={tw`gap-2`}>
                                                        <TextInput
                                                            value={editingMessageText}
                                                            onChangeText={setEditingMessageText}
                                                            placeholder="Edit message..."
                                                            placeholderTextColor="rgba(255,255,255,0.55)"
                                                            keyboardAppearance="dark"
                                                            multiline
                                                            style={[tw`max-h-24 rounded-2xl border border-white/25 px-3 py-2 text-sm text-white`, {fontFamily: fonts.body}]}
                                                        />
                                                        <View style={tw`flex-row items-center gap-3`}>
                                                            <Pressable
                                                                disabled={dm.busy || editingMessageText.trim().length === 0}
                                                                onPress={() => {
                                                                    const nextText = editingMessageText.trim();
                                                                    if (!nextText) return;
                                                                    setEditingMessageId(null);
                                                                    setEditingMessageText("");
                                                                    void handleEditMessage(message, nextText);
                                                                }}
                                                                style={({pressed}) => [
                                                                    tw`py-1`,
                                                                    (dm.busy || editingMessageText.trim().length === 0) && tw`opacity-50`,
                                                                    pressed && tw`opacity-70`,
                                                                ]}
                                                            >
                                                                <Text style={[tw`text-[10px] text-white`, {fontFamily: fonts.button}]}>Save</Text>
                                                            </Pressable>
                                                            <Pressable
                                                                onPress={() => {
                                                                    setEditingMessageId(null);
                                                                    setEditingMessageText("");
                                                                }}
                                                                style={({pressed}) => [
                                                                    tw`py-1`,
                                                                    pressed && tw`opacity-70`,
                                                                ]}
                                                            >
                                                                <Text style={[tw`text-[10px] text-white/70`, {fontFamily: fonts.button}]}>Cancel</Text>
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <Text style={[tw`text-sm leading-5`, {fontFamily: fonts.body, color: mine ? "#ffffff" : primaryTextColor}]}>
                                                        {message.body}
                                                    </Text>
                                                )}
                                            </Pressable>
                                            <Text style={[tw`mt-1 px-2 text-[10px]`, {fontFamily: fonts.body, color: secondaryTextColor}]}>
                                                {formatMessageTime(message.createdAt)}
                                            </Text>
                                            {receipt ? (
                                                <Text style={[tw`px-2 text-[10px]`, {fontFamily: fonts.body, color: secondaryTextColor}]}>
                                                    {receipt}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </Fragment>
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
                            style={[
                                coastOrRiver
                                    ? [tw`max-h-24 flex-1 rounded-2xl border border-black/10 px-3 py-2 text-sm text-[#111111]`, {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"}]
                                    : georgiaMode
                                        ? [tw`max-h-24 flex-1 rounded-2xl border border-slate-700 bg-black/45 px-3 py-2 text-sm text-[#E4E0D4]`, {backgroundColor: solidSurfaceColor}]
                                    : tw`max-h-24 flex-1 rounded-2xl border border-slate-700 bg-black/45 px-3 py-2 text-sm text-[#E4E0D4]`,
                                {fontFamily: fonts.body},
                            ]}
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
                            <Ionicons name="send" size={17} color={coastOrRiver ? "#111111" : "#E4E0D4"}/>
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
                        <Text style={[emptyStateStyle, {fontFamily: fonts.body}]}>
                            Loading messages...
                        </Text>
                    ) : dm.conversations.length === 0 ? (
                        <Text style={[emptyStateStyle, {fontFamily: fonts.body}]}>
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
            <OwnerActionSheet
                visible={Boolean(actionMessage)}
                onClose={() => setActionMessage(null)}
                onEdit={() => {
                    if (!actionMessage) return;
                    setEditingMessageId(actionMessage.id);
                    setEditingMessageText(actionMessage.body);
                }}
                onDelete={() => {
                    if (!actionMessage) return;
                    void handleDeleteMessage(actionMessage);
                }}
            />
            </Animated.View>
        </ScreenBackground>
    );
}

export type {DmStartTarget};
