import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {createId} from "../lib/id";
import type {CommunityAuthor} from "./useCommunity";
import {ensureOwnProfile} from "../lib/profiles";

export type DirectMessage = {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
    author: CommunityAuthor;
};

export type DirectMessageConversation = {
    id: string;
    participant: CommunityAuthor;
    messages: DirectMessage[];
    lastMessage: DirectMessage | null;
    unreadCount: number;
    updatedAt: string;
};

type ParticipantRow = {
    conversation_id: string;
    user_id: string;
    last_read_at: string | null;
};

type ConversationRow = {
    id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
};

type MessageRow = {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    body_encrypted: string | null;
    created_at: string;
};

type ProfileRow = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
};

const UNKNOWN_AUTHOR: CommunityAuthor = {
    id: "unknown",
    fullName: null,
    avatarUrl: null,
};

function makeAuthor(row: ProfileRow | undefined, id: string): CommunityAuthor {
    if (!row) return {...UNKNOWN_AUTHOR, id};
    return {
        id: row.id,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
    };
}

function byMostRecent(a: DirectMessageConversation, b: DirectMessageConversation): number {
    const aTime = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
    const bTime = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
    return bTime - aTime;
}

export function useDirectMessages(session: Session | null) {
    const userId = session?.user.id ?? null;
    const [conversations, setConversations] = useState<DirectMessageConversation[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const refresh = useCallback(async () => {
        if (!userId) {
            setConversations([]);
            setIsLoaded(true);
            return;
        }

        setError(null);
        const {data: ownParticipantRows, error: participantError} = await supabase
            .from("dm_conversation_participants")
            .select("conversation_id,user_id,last_read_at")
            .eq("user_id", userId);

        if (participantError) {
            setError(participantError.message);
            setIsLoaded(true);
            return;
        }

        const ownParticipants = (ownParticipantRows ?? []) as ParticipantRow[];
        const conversationIds = ownParticipants.map((participant) => participant.conversation_id);
        if (conversationIds.length === 0) {
            setConversations([]);
            setIsLoaded(true);
            return;
        }

        const [conversationResult, participantsResult, messagesResult] = await Promise.all([
            supabase
                .from("dm_conversations")
                .select("id,created_by,created_at,updated_at")
                .in("id", conversationIds),
            supabase
                .from("dm_conversation_participants")
                .select("conversation_id,user_id,last_read_at")
                .in("conversation_id", conversationIds),
            supabase
                .from("dm_messages")
                .select("id,conversation_id,sender_id,body,body_encrypted,created_at")
                .in("conversation_id", conversationIds)
                .order("created_at", {ascending: true}),
        ]);

        const firstError = conversationResult.error ?? participantsResult.error ?? messagesResult.error;
        if (firstError) {
            setError(firstError.message);
            setIsLoaded(true);
            return;
        }

        const rawConversations = (conversationResult.data ?? []) as ConversationRow[];
        const participants = (participantsResult.data ?? []) as ParticipantRow[];
        const messages = (messagesResult.data ?? []) as MessageRow[];
        const profileIds = new Set<string>();

        participants.forEach((participant) => profileIds.add(participant.user_id));
        messages.forEach((message) => profileIds.add(message.sender_id));

        const profileResult = profileIds.size
            ? await supabase
                .from("profiles")
                .select("id,full_name,avatar_url")
                .in("id", Array.from(profileIds))
            : {data: [], error: null};

        if (profileResult.error) {
            setError(profileResult.error.message);
            setIsLoaded(true);
            return;
        }

        const profiles = new Map(
            ((profileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
        );
        const ownReadByConversation = new Map(
            ownParticipants.map((participant) => [participant.conversation_id, participant.last_read_at]),
        );
        const participantsByConversation = new Map<string, ParticipantRow[]>();
        const messagesByConversation = new Map<string, DirectMessage[]>();

        participants.forEach((participant) => {
            participantsByConversation.set(participant.conversation_id, [
                ...(participantsByConversation.get(participant.conversation_id) ?? []),
                participant,
            ]);
        });

        messages.forEach((message) => {
            const mapped: DirectMessage = {
                id: message.id,
                conversationId: message.conversation_id,
                senderId: message.sender_id,
                body: message.body,
                createdAt: message.created_at,
                author: makeAuthor(profiles.get(message.sender_id), message.sender_id),
            };
            messagesByConversation.set(message.conversation_id, [
                ...(messagesByConversation.get(message.conversation_id) ?? []),
                mapped,
            ]);
        });

        const nextConversations = rawConversations.map((conversation) => {
            const conversationParticipants = participantsByConversation.get(conversation.id) ?? [];
            const otherParticipant = conversationParticipants.find((participant) => participant.user_id !== userId) ??
                conversationParticipants[0];
            const conversationMessages = messagesByConversation.get(conversation.id) ?? [];
            const lastReadAt = ownReadByConversation.get(conversation.id);
            const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;
            const unreadCount = conversationMessages.filter((message) =>
                message.senderId !== userId && new Date(message.createdAt).getTime() > lastReadTime,
            ).length;

            return {
                id: conversation.id,
                participant: makeAuthor(profiles.get(otherParticipant?.user_id), otherParticipant?.user_id ?? "unknown"),
                messages: conversationMessages,
                lastMessage: conversationMessages[conversationMessages.length - 1] ?? null,
                unreadCount,
                updatedAt: conversation.updated_at ?? conversation.created_at,
            };
        });

        setConversations(nextConversations.sort(byMostRecent));
        setIsLoaded(true);
    }, [userId]);

    useEffect(() => {
        let mounted = true;
        setIsLoaded(false);
        refresh().finally(() => {
            if (mounted) setIsLoaded(true);
        });
        return () => {
            mounted = false;
        };
    }, [refresh]);

    const scheduleRealtimeRefresh = useCallback(() => {
        if (realtimeRefreshTimeoutRef.current) {
            clearTimeout(realtimeRefreshTimeoutRef.current);
        }

        realtimeRefreshTimeoutRef.current = setTimeout(() => {
            realtimeRefreshTimeoutRef.current = null;
            void refresh();
        }, 250);
    }, [refresh]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`direct-messages-${userId}`)
            .on("postgres_changes", {event: "*", schema: "public", table: "dm_conversations"}, scheduleRealtimeRefresh)
            .on("postgres_changes", {event: "*", schema: "public", table: "dm_conversation_participants"}, scheduleRealtimeRefresh)
            .on("postgres_changes", {event: "*", schema: "public", table: "dm_messages"}, scheduleRealtimeRefresh)
            .on("postgres_changes", {event: "UPDATE", schema: "public", table: "profiles"}, scheduleRealtimeRefresh)
            .subscribe();

        return () => {
            if (realtimeRefreshTimeoutRef.current) {
                clearTimeout(realtimeRefreshTimeoutRef.current);
                realtimeRefreshTimeoutRef.current = null;
            }
            void supabase.removeChannel(channel);
        };
    }, [scheduleRealtimeRefresh, userId]);

    const openConversationWith = useCallback(async (participantId: string) => {
        if (!userId) throw new Error("You need to be signed in to message.");
        if (participantId === userId) throw new Error("You cannot message yourself.");

        setBusy(true);
        setError(null);
        const ownProfileResult = await ensureOwnProfile({expectedUserId: userId});
        if (ownProfileResult.error || ownProfileResult.skipped) {
            setBusy(false);
            const message = ownProfileResult.error?.message ?? "Your profile is still loading. Try again in a moment.";
            setError(message);
            throw new Error(message);
        }

        const ownParticipantRows = await supabase
            .from("dm_conversation_participants")
            .select("conversation_id")
            .eq("user_id", userId);

        if (ownParticipantRows.error) {
            setBusy(false);
            setError(ownParticipantRows.error.message);
            throw ownParticipantRows.error;
        }

        const conversationIds = ((ownParticipantRows.data ?? []) as Pick<ParticipantRow, "conversation_id">[])
            .map((participant) => participant.conversation_id);

        if (conversationIds.length > 0) {
            const existingParticipant = await supabase
                .from("dm_conversation_participants")
                .select("conversation_id")
                .in("conversation_id", conversationIds)
                .eq("user_id", participantId)
                .limit(1);

            if (existingParticipant.error) {
                setBusy(false);
                setError(existingParticipant.error.message);
                throw existingParticipant.error;
            }

            const existingConversationId = (existingParticipant.data?.[0] as Pick<ParticipantRow, "conversation_id"> | undefined)
                ?.conversation_id;
            if (existingConversationId) {
                setBusy(false);
                await refresh();
                return existingConversationId;
            }
        }

        const conversationId = createId();
        const {error: conversationError} = await supabase.from("dm_conversations").insert({
            id: conversationId,
            created_by: userId,
        });

        if (conversationError) {
            setBusy(false);
            setError(conversationError.message);
            throw conversationError;
        }

        const {error: participantsError} = await supabase.from("dm_conversation_participants").insert([
            {conversation_id: conversationId, user_id: userId, last_read_at: new Date().toISOString()},
            {conversation_id: conversationId, user_id: participantId},
        ]);

        setBusy(false);
        if (participantsError) {
            setError(participantsError.message);
            throw participantsError;
        }

        await refresh();
        return conversationId;
    }, [refresh, userId]);

    const sendMessage = useCallback(async (conversationId: string, body: string) => {
        if (!userId) return;
        const trimmed = body.trim();
        if (!trimmed) return;

        setBusy(true);
        setError(null);
        const profileResult = await ensureOwnProfile({expectedUserId: userId});
        if (profileResult.error || profileResult.skipped) {
            setBusy(false);
            const message = profileResult.error?.message ?? "Your profile is still loading. Try again in a moment.";
            setError(message);
            throw new Error(message);
        }
        const now = new Date().toISOString();
        const {error: insertError} = await supabase.from("dm_messages").insert({
            id: createId(),
            conversation_id: conversationId,
            sender_id: userId,
            body: trimmed,
        });

        if (!insertError) {
            await supabase
                .from("dm_conversations")
                .update({updated_at: now})
                .eq("id", conversationId);
            await supabase
                .from("dm_conversation_participants")
                .update({last_read_at: now})
                .eq("conversation_id", conversationId)
                .eq("user_id", userId);
        }

        setBusy(false);
        if (insertError) {
            setError(insertError.message);
            throw insertError;
        }
        await refresh();
    }, [refresh, userId]);

    const editMessage = useCallback(async (messageId: string, body: string) => {
        if (!userId) return;
        const trimmed = body.trim();
        if (!trimmed) return;
        setBusy(true);
        setError(null);
        const {error: updateError} = await supabase
            .from("dm_messages")
            .update({body: trimmed})
            .eq("id", messageId)
            .eq("sender_id", userId);
        setBusy(false);
        if (updateError) {
            setError(updateError.message);
            throw updateError;
        }
        await refresh();
    }, [refresh, userId]);

    const deleteMessage = useCallback(async (messageId: string) => {
        if (!userId) return;
        setBusy(true);
        setError(null);
        const {error: deleteError} = await supabase
            .from("dm_messages")
            .delete()
            .eq("id", messageId)
            .eq("sender_id", userId);
        setBusy(false);
        if (deleteError) {
            setError(deleteError.message);
            throw deleteError;
        }
        await refresh();
    }, [refresh, userId]);

    const markRead = useCallback(async (conversationId: string) => {
        if (!userId) return;
        const {error: updateError} = await supabase
            .from("dm_conversation_participants")
            .update({last_read_at: new Date().toISOString()})
            .eq("conversation_id", conversationId)
            .eq("user_id", userId);
        if (updateError) {
            setError(updateError.message);
            return;
        }
        await refresh();
    }, [refresh, userId]);

    const unreadCount = useMemo(
        () => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
        [conversations],
    );

    return useMemo(() => ({
        userId,
        conversations,
        unreadCount,
        isLoaded,
        busy,
        error,
        refresh,
        openConversationWith,
        sendMessage,
        editMessage,
        deleteMessage,
        markRead,
    }), [busy, conversations, deleteMessage, editMessage, error, isLoaded, markRead, openConversationWith, refresh, sendMessage, unreadCount, userId]);
}

export type DirectMessagesState = ReturnType<typeof useDirectMessages>;
