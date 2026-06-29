import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {createId} from "../lib/id";
import type {CommunityAuthor} from "./useCommunity";
import {ensureOwnProfile} from "../lib/profiles";
import type {EncryptionState} from "./useEncryption";
import {
    createDmKeyPair,
    decryptDmBody,
    encryptDmBody,
    type DmKeyPair,
    unlockDmKeyPair,
} from "../lib/dmEncryption";
import {encryptedPlaceholder} from "../lib/e2ee";

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
    participantLastReadAt: string | null;
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

type MessageRecipientRow = {
    message_id: string;
    user_id: string;
    body_encrypted: string;
};

type DmPublicKeyRow = {
    user_id: string;
    public_key: string;
};

type DmPrivateKeyRow = {
    user_id: string;
    private_key_encrypted: string;
};

type ProfileRow = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
};

const ENCRYPTED_DM_PLACEHOLDER = encryptedPlaceholder("encrypted message");

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

export function useDirectMessages(session: Session | null, encryption?: EncryptionState) {
    const userId = session?.user.id ?? null;
    const encryptionKey = encryption?.key ?? null;
    const [conversations, setConversations] = useState<DirectMessageConversation[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dmKeyPair, setDmKeyPair] = useState<DmKeyPair | null>(null);
    const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setDmKeyPair(null);
    }, [encryptionKey, userId]);

    const ensureDmKeyPair = useCallback(async () => {
        if (!userId || !encryptionKey) {
            throw new Error("Unlock your private data before using messages.");
        }
        if (dmKeyPair) return dmKeyPair;

        const [publicKeyResult, privateKeyResult] = await Promise.all([
            supabase
                .from("dm_encryption_public_keys")
                .select("user_id,public_key")
                .eq("user_id", userId)
                .maybeSingle(),
            supabase
                .from("dm_encryption_private_keys")
                .select("user_id,private_key_encrypted")
                .eq("user_id", userId)
                .maybeSingle(),
        ]);

        const firstError = publicKeyResult.error ?? privateKeyResult.error;
        if (firstError) throw firstError;

        const publicKeyRow = publicKeyResult.data as DmPublicKeyRow | null;
        const privateKeyRow = privateKeyResult.data as DmPrivateKeyRow | null;
        if (publicKeyRow?.public_key && privateKeyRow?.private_key_encrypted) {
            const unlocked = unlockDmKeyPair(encryptionKey, publicKeyRow.public_key, privateKeyRow.private_key_encrypted);
            setDmKeyPair(unlocked);
            return unlocked;
        }

        const next = createDmKeyPair(encryptionKey);
        const now = new Date().toISOString();
        const [publicUpsert, privateUpsert] = await Promise.all([
            supabase.from("dm_encryption_public_keys").upsert({
                user_id: userId,
                public_key: next.publicKey,
                updated_at: now,
            }, {onConflict: "user_id"}),
            supabase.from("dm_encryption_private_keys").upsert({
                user_id: userId,
                private_key_encrypted: next.privateKeyEncrypted,
                updated_at: now,
            }, {onConflict: "user_id"}),
        ]);

        const upsertError = publicUpsert.error ?? privateUpsert.error;
        if (upsertError) throw upsertError;

        setDmKeyPair(next.keyPair);
        return next.keyPair;
    }, [dmKeyPair, encryptionKey, userId]);

    const loadConversationParticipants = useCallback(async (conversationId: string) => {
        const {data, error: participantsError} = await supabase
            .from("dm_conversation_participants")
            .select("conversation_id,user_id,last_read_at")
            .eq("conversation_id", conversationId);
        if (participantsError) throw participantsError;
        return (data ?? []) as ParticipantRow[];
    }, []);

    const loadPublicKeys = useCallback(async (participantIds: string[]) => {
        if (participantIds.length === 0) return new Map<string, string>();
        const {data, error: publicKeyError} = await supabase
            .from("dm_encryption_public_keys")
            .select("user_id,public_key")
            .in("user_id", participantIds);
        if (publicKeyError) throw publicKeyError;
        return new Map(((data ?? []) as DmPublicKeyRow[]).map((row) => [row.user_id, row.public_key]));
    }, []);

    const buildRecipientCiphertexts = useCallback((
        senderKeyPair: DmKeyPair,
        participantIds: string[],
        publicKeys: Map<string, string>,
        body: string,
        messageId: string,
    ) => {
        const missingRecipient = participantIds.find((participantId) => !publicKeys.has(participantId));
        if (missingRecipient) {
            throw new Error("This person needs to open the updated app once before private messages can be sent.");
        }

        return participantIds.map((participantId) => ({
            message_id: messageId,
            user_id: participantId,
            body_encrypted: encryptDmBody(senderKeyPair, publicKeys.get(participantId)!, body),
        }));
    }, []);

    const refresh = useCallback(async () => {
        if (!userId) {
            setConversations([]);
            setIsLoaded(true);
            return;
        }

        setError(null);
        let ownDmKeyPair: DmKeyPair | null = null;
        try {
            ownDmKeyPair = await ensureDmKeyPair();
        } catch (keyError) {
            setError(keyError instanceof Error ? keyError.message : "Could not unlock private messages.");
            setConversations([]);
            setIsLoaded(true);
            return;
        }

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
        const messageIds = messages.map((message) => message.id);

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

        const [recipientResult, publicKeyResult] = await Promise.all([
            messageIds.length
                ? supabase
                    .from("dm_message_recipients")
                    .select("message_id,user_id,body_encrypted")
                    .eq("user_id", userId)
                    .in("message_id", messageIds)
                : {data: [], error: null},
            profileIds.size
                ? supabase
                    .from("dm_encryption_public_keys")
                    .select("user_id,public_key")
                    .in("user_id", Array.from(profileIds))
                : {data: [], error: null},
        ]);

        const encryptionLoadError = recipientResult.error ?? publicKeyResult.error;
        if (encryptionLoadError) {
            setError(encryptionLoadError.message);
            setIsLoaded(true);
            return;
        }

        const profiles = new Map(
            ((profileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
        );
        const recipientRows = new Map(
            ((recipientResult.data ?? []) as MessageRecipientRow[]).map((row) => [row.message_id, row]),
        );
        const publicKeys = new Map(
            ((publicKeyResult.data ?? []) as DmPublicKeyRow[]).map((row) => [row.user_id, row.public_key]),
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
            const recipientRow = recipientRows.get(message.id);
            const senderPublicKey = publicKeys.get(message.sender_id);
            let body = message.body;
            if (recipientRow?.body_encrypted && senderPublicKey && ownDmKeyPair) {
                try {
                    body = decryptDmBody(ownDmKeyPair, senderPublicKey, recipientRow.body_encrypted);
                } catch (decryptError) {
                    console.warn("[directMessages] decrypt error", decryptError);
                    body = ENCRYPTED_DM_PLACEHOLDER;
                }
            } else if (message.body === ENCRYPTED_DM_PLACEHOLDER) {
                body = ENCRYPTED_DM_PLACEHOLDER;
            }

            const mapped: DirectMessage = {
                id: message.id,
                conversationId: message.conversation_id,
                senderId: message.sender_id,
                body,
                createdAt: message.created_at,
                author: makeAuthor(profiles.get(message.sender_id), message.sender_id),
            };
            messagesByConversation.set(message.conversation_id, [
                ...(messagesByConversation.get(message.conversation_id) ?? []),
                mapped,
            ]);

            if (message.sender_id === userId && message.body !== ENCRYPTED_DM_PLACEHOLDER && ownDmKeyPair) {
                const conversationParticipantIds = (participantsByConversation.get(message.conversation_id) ?? [])
                    .map((participant) => participant.user_id);
                const canMigrate = conversationParticipantIds.length > 0 &&
                    conversationParticipantIds.every((participantId) => publicKeys.has(participantId));
                if (canMigrate) {
                    const recipientCiphertexts = buildRecipientCiphertexts(
                        ownDmKeyPair,
                        conversationParticipantIds,
                        publicKeys,
                        message.body,
                        message.id,
                    );
                    void (async () => {
                        try {
                            await supabase
                                .from("dm_message_recipients")
                                .upsert(recipientCiphertexts, {onConflict: "message_id,user_id"});
                            await supabase
                                .from("dm_messages")
                                .update({body: ENCRYPTED_DM_PLACEHOLDER, body_encrypted: null})
                                .eq("id", message.id)
                                .eq("sender_id", userId);
                        } catch (migrationError) {
                            console.warn("[directMessages] legacy message migration error", migrationError);
                        }
                    })();
                }
            }
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
                participantLastReadAt: otherParticipant?.last_read_at ?? null,
                messages: conversationMessages,
                lastMessage: conversationMessages[conversationMessages.length - 1] ?? null,
                unreadCount,
                updatedAt: conversation.updated_at ?? conversation.created_at,
            };
        });

        setConversations(nextConversations.sort(byMostRecent));
        setIsLoaded(true);
    }, [buildRecipientCiphertexts, ensureDmKeyPair, userId]);

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
            .on("postgres_changes", {event: "*", schema: "public", table: "dm_message_recipients"}, scheduleRealtimeRefresh)
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
        try {
            const profileResult = await ensureOwnProfile({expectedUserId: userId});
            if (profileResult.error || profileResult.skipped) {
                throw new Error(profileResult.error?.message ?? "Your profile is still loading. Try again in a moment.");
            }
            const ownDmKeyPair = await ensureDmKeyPair();
            const participants = await loadConversationParticipants(conversationId);
            const participantIds = participants.map((participant) => participant.user_id);
            const publicKeys = await loadPublicKeys(participantIds);
            const messageId = createId();
            const recipientCiphertexts = buildRecipientCiphertexts(
                ownDmKeyPair,
                participantIds,
                publicKeys,
                trimmed,
                messageId,
            );
            const now = new Date().toISOString();
            const {error: insertError} = await supabase.from("dm_messages").insert({
                id: messageId,
                conversation_id: conversationId,
                sender_id: userId,
                body: ENCRYPTED_DM_PLACEHOLDER,
                body_encrypted: null,
            });
            if (insertError) throw insertError;

            const {error: recipientError} = await supabase
                .from("dm_message_recipients")
                .insert(recipientCiphertexts);
            if (recipientError) {
                await supabase
                    .from("dm_messages")
                    .delete()
                    .eq("id", messageId)
                    .eq("sender_id", userId);
                throw recipientError;
            }
            await supabase
                .from("dm_conversations")
                .update({updated_at: now})
                .eq("id", conversationId);
            await supabase
                .from("dm_conversation_participants")
                .update({last_read_at: now})
                .eq("conversation_id", conversationId)
                .eq("user_id", userId);
            await refresh();
        } catch (sendError) {
            const message = sendError instanceof Error ? sendError.message : "Your message could not be sent.";
            setError(message);
            throw sendError;
        } finally {
            setBusy(false);
        }
    }, [buildRecipientCiphertexts, ensureDmKeyPair, loadConversationParticipants, loadPublicKeys, refresh, userId]);

    const editMessage = useCallback(async (messageId: string, body: string) => {
        if (!userId) return;
        const trimmed = body.trim();
        if (!trimmed) return;
        setBusy(true);
        setError(null);
        try {
            const ownDmKeyPair = await ensureDmKeyPair();
            const {data: messageData, error: messageLoadError} = await supabase
                .from("dm_messages")
                .select("id,conversation_id,sender_id")
                .eq("id", messageId)
                .eq("sender_id", userId)
                .maybeSingle();
            if (messageLoadError) throw messageLoadError;
            const messageRow = messageData as Pick<MessageRow, "id" | "conversation_id" | "sender_id"> | null;
            if (!messageRow) throw new Error("Message not found.");

            const participants = await loadConversationParticipants(messageRow.conversation_id);
            const participantIds = participants.map((participant) => participant.user_id);
            const publicKeys = await loadPublicKeys(participantIds);
            const recipientCiphertexts = buildRecipientCiphertexts(
                ownDmKeyPair,
                participantIds,
                publicKeys,
                trimmed,
                messageId,
            );

            const {error: updateError} = await supabase
                .from("dm_messages")
                .update({body: ENCRYPTED_DM_PLACEHOLDER, body_encrypted: null})
                .eq("id", messageId)
                .eq("sender_id", userId);
            if (updateError) throw updateError;
            const {error: recipientUpdateError} = await supabase
                .from("dm_message_recipients")
                .upsert(recipientCiphertexts, {onConflict: "message_id,user_id"});
            if (recipientUpdateError) throw recipientUpdateError;
            await refresh();
        } catch (editError) {
            const message = editError instanceof Error ? editError.message : "Your message could not be updated.";
            setError(message);
            throw editError;
        } finally {
            setBusy(false);
        }
    }, [buildRecipientCiphertexts, ensureDmKeyPair, loadConversationParticipants, loadPublicKeys, refresh, userId]);

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
