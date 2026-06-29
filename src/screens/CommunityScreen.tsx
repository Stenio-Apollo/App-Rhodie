import {type ComponentProps, useEffect, useMemo, useRef, useState} from "react";
import {
    Alert,
    Animated,
    Image,
    ImageBackground,
    Pressable,
    ScrollView,
    Share,
    Text,
    TextInput,
    View
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {Button} from "../components/ui/Button";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {toLocalISODate} from "../lib/date-utils";
import {getDailyJournalPrompt} from "../lib/prompts";
import type {CommunityAuthor, CommunityComment, CommunityPost, CommunityState} from "../state/useCommunity";
import {useKeyboardInset} from "../lib/useKeyboardInset";
import {OwnerActionSheet} from "../components/OwnerActionSheet";

interface CommunityScreenProps {
    community: CommunityState;
    unreadMessageCount?: number;
    onOpenMessages?: () => void;
    onOpenDirectMessage?: (author: CommunityAuthor) => void;
    onOpenInsights?: () => void;
}

type ComposerMode = "prompt" | "gratitude" | "message";

const COMPOSER_MODES: Array<{
    key: ComposerMode;
    label: string;
    placeholder: string;
}> = [
    {
        key: "prompt",
        label: "Prompt",
        placeholder: "Respond publicly to today's prompt...",
    },
    {
        key: "gratitude",
        label: "Gratitude",
        placeholder: "Share something you're grateful for...",
    },
    {
        key: "message",
        label: "Message",
        placeholder: "Write a positive note to your peers...",
    },
];

function formatCommunityPost(mode: ComposerMode, body: string, prompt: string): string {
    if (mode === "prompt") {
        return `Today's prompt\n${prompt}\n\n${body}`;
    }

    if (mode === "gratitude") {
        return `Gratitude\n\n${body}`;
    }

    return `Peer note\n\n${body}`;
}

function displayName(author: CommunityAuthor): string {
    return author.fullName?.trim() || "Rhodie member";
}

function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {month: "short", day: "numeric"});
}

function formatDateKey(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-CA");
}

function formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString(undefined, {hour: "numeric", minute: "2-digit"});
}

function Avatar({
                    author,
                    size = 38,
                    currentUserId,
                }: {
    author: CommunityAuthor;
    size?: number;
    currentUserId?: string | null;
}) {
    const initial = displayName(author)[0]?.toUpperCase() ?? "R";
    const isCurrentUser = author.id === currentUserId;
    if (author.avatarUrl) {
        return (
            <Image
                source={{uri: author.avatarUrl}}
                style={[tw`rounded-full bg-black/70`, {width: size, height: size}]}
            />
        );
    }

    return (
        <View
            style={[
                tw`items-center justify-center rounded-full`,
                isCurrentUser ? tw`bg-[#B55941]` : tw`bg-[#DFC4AA]`,
                {width: size, height: size},
            ]}
        >
            <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#111111"}]}>
                {initial}
            </Text>
        </View>
    );
}

function MetricButton({
                          icon,
                          label,
                          active,
                          onPress,
                      }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    active?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({pressed}) => [
                tw`flex-row items-center gap-1.5 rounded-full px-2 py-1.5`,
                pressed && tw`opacity-75`,
            ]}
        >
            <Ionicons name={icon} size={15} color={active ? "#FB7185" : "#ffffff"}/>
            <Text style={[tw`text-[11px]`, {fontFamily: fonts.button, color: active ? "#ffffff" : "#ffffff"}]}>
                {label}
            </Text>
        </Pressable>
    );
}

function AuthorMessageButton({
                                 author,
                                 currentUserId,
                                 onOpenDirectMessage,
                             }: {
    author: CommunityAuthor;
    currentUserId: string | null;
    onOpenDirectMessage?: (author: CommunityAuthor) => void;
}) {
    if (!onOpenDirectMessage || author.id === currentUserId) return null;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Message ${displayName(author)}`}
            onPress={() => onOpenDirectMessage(author)}
            style={({pressed}) => [
                tw`h-7 w-7 items-center justify-center rounded-full`,
                pressed && tw`opacity-70`,
            ]}
        >
            <Ionicons name="mail-outline" size={15} color="#ffffff"/>
        </Pressable>
    );
}

function OwnerMenuButton({onPress}: { onPress: () => void }) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open content options"
            onPress={() => {
                haptics.selection();
                onPress();
            }}
            style={({pressed}) => [
                tw`h-7 w-7 items-center justify-center`,
                pressed && tw`opacity-70`,
            ]}
        >
            <Ionicons name="ellipsis-horizontal" size={18} color="#ffffff"/>
        </Pressable>
    );
}

function CommunityRouteEntry({
                                 label,
                                 icon,
                                 onPress,
                                 badgeCount = 0,
                             }: {
    label: string;
    icon: ComponentProps<typeof Ionicons>["name"];
    onPress: () => void;
    badgeCount?: number;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
                haptics.navigation();
                onPress();
            }}
            style={({pressed}) => [
                tw`items-center justify-center px-1 py-0.5`,
                pressed && {transform: [{scale: 0.94}], opacity: 0.85},
            ]}
        >
            <Text
                numberOfLines={1}
                style={[
                    tw`mb-1 text-[10px] font-bold text-[#E4E0D4]`,
                    {fontFamily: fonts.heading},
                ]}
            >
                {label}
            </Text>
            <View>
                <Ionicons name={icon} size={22} color="#E4E0D4"/>
                {badgeCount > 0 ? (
                    <View style={tw`absolute -right-2 -top-2 min-w-4 items-center rounded-full bg-[#B55941] px-1`}>
                        <Text style={[tw`text-[9px] text-white`, {fontFamily: fonts.button}]}>
                            {badgeCount > 9 ? "9+" : badgeCount}
                        </Text>
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
}

function CommentItem({
                         comment,
                         depth = 0,
                         showDate = false,
                         busy,
                         currentUserId,
                         onReply,
                         onToggleLike,
                         onEdit,
                         onDelete,
                         onOpenDirectMessage,
                     }: {
    comment: CommunityComment;
    depth?: number;
    showDate?: boolean;
    busy: boolean;
    currentUserId: string | null;
    onReply: (comment: CommunityComment) => void;
    onToggleLike: (comment: CommunityComment) => void;
    onEdit: (comment: CommunityComment, body: string) => void;
    onDelete: (comment: CommunityComment) => void;
    onOpenDirectMessage?: (author: CommunityAuthor) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(comment.body);
    const [actionsOpen, setActionsOpen] = useState(false);
    const isOwnComment = comment.userId === currentUserId;

    useEffect(() => {
        if (!editing) setEditText(comment.body);
    }, [comment.body, editing]);

    function openCommentActions() {
        if (busy || !isOwnComment) return;
        setActionsOpen(true);
    }

    return (
        <View style={[tw`gap-2`, depth > 0 ? {marginLeft: Math.min(depth, 2) * 18} : null]}>
            {showDate ? (
                <View style={tw`my-1 items-center`}>
                    <Text style={[tw`px-3 py-1 text-[10px] text-white/65`, {fontFamily: fonts.body}]}>
                        {formatTimestamp(comment.createdAt)}
                    </Text>
                </View>
            ) : null}
            <View style={tw`rounded-2xl border border-[#B55941]/33 bg-black/45 px-3 py-2.5`}>
                <View style={tw`flex-row items-start gap-2`}>
                    <Avatar author={comment.author} size={26} currentUserId={currentUserId}/>
                    <View style={tw`flex-1`}>
                        <Text style={[tw`text-[11px] text-white`, {fontFamily: fonts.heading}]}>
                            {displayName(comment.author)}
                        </Text>
                    </View>
                    {isOwnComment ? (
                        <OwnerMenuButton onPress={openCommentActions}/>
                    ) : (
                        <AuthorMessageButton
                            author={comment.author}
                            currentUserId={currentUserId}
                            onOpenDirectMessage={onOpenDirectMessage}
                        />
                    )}
                </View>

                {editing ? (
                    <View style={tw`mt-2 gap-2`}>
                        <TextInput
                            value={editText}
                            onChangeText={setEditText}
                            placeholder="Edit comment..."
                            placeholderTextColor="rgba(228,224,212,0.45)"
                            keyboardAppearance="dark"
                            multiline
                            style={[tw`max-h-24 rounded-2xl border border-slate-700 bg-black/45 px-3 py-2 text-xs text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                        />
                        <View style={tw`flex-row items-center gap-3`}>
                            <Pressable
                                disabled={busy || editText.trim().length === 0}
                                onPress={() => {
                                    const nextText = editText.trim();
                                    if (!nextText) return;
                                    setEditing(false);
                                    onEdit(comment, nextText);
                                }}
                                style={({pressed}) => [
                                    tw`py-1`,
                                    (busy || editText.trim().length === 0) && tw`opacity-50`,
                                    pressed && tw`opacity-70`,
                                ]}
                            >
                                <Text style={[tw`text-[10px] text-white`, {fontFamily: fonts.button}]}>Save</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    setEditText(comment.body);
                                    setEditing(false);
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
                    <Text style={[tw`mt-2 text-xs leading-4 text-[#ffffff]/90`, {fontFamily: fonts.body}]}>
                        {comment.body}
                    </Text>
                )}

                <View style={tw`mt-2 flex-row items-center gap-3`}>
                    <Pressable
                        disabled={busy}
                        onPress={() => onToggleLike(comment)}
                        style={({pressed}) => [
                            tw`flex-row items-center gap-1`,
                            busy && tw`opacity-50`,
                            pressed && tw`opacity-70`,
                        ]}
                    >
                        <Ionicons
                            name={comment.likedByMe ? "heart" : "heart-outline"}
                            size={13}
                            color={comment.likedByMe ? "#FB7185" : "#ffffff"}
                        />
                        <Text style={[tw`text-[10px] text-white`, {fontFamily: fonts.button}]}>
                            {comment.likesCount}
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => onReply(comment)}
                        style={({pressed}) => [
                            tw`py-0.5`,
                            pressed && tw`opacity-70`,
                        ]}
                    >
                        <Text style={[tw`text-[10px] text-white`, {fontFamily: fonts.button}]}>Reply</Text>
                    </Pressable>
                    <View style={tw`ml-auto flex-row items-center gap-1.5`}>
                        <Text style={[tw`text-[10px] text-white/45`, {fontFamily: fonts.body}]}>
                            {formatTime(comment.createdAt)}
                        </Text>
                    </View>
                </View>
            </View>

            {comment.replies.map((reply, index) => {
                const previousReply = comment.replies[index - 1];
                const replyDateKey = formatDateKey(reply.createdAt);
                const previousDateValue = previousReply?.createdAt ?? comment.createdAt;
                const showReplyDate = formatDateKey(previousDateValue) !== replyDateKey;

                return (
                    <CommentItem
                        key={reply.id}
                        comment={reply}
                        depth={depth + 1}
                        showDate={showReplyDate}
                        busy={busy}
                        currentUserId={currentUserId}
                        onReply={onReply}
                        onToggleLike={onToggleLike}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onOpenDirectMessage={onOpenDirectMessage}
                    />
                );
            })}
            <OwnerActionSheet
                visible={actionsOpen}
                onClose={() => setActionsOpen(false)}
                onEdit={() => setEditing(true)}
                onDelete={() => onDelete(comment)}
            />
        </View>
    );
}

function PostCard({
                      post,
                      busy,
                      currentUserId,
                      onLike,
                      onEditPost,
                      onDeletePost,
                      onComment,
                      onToggleCommentLike,
                      onEditComment,
                      onDeleteComment,
                      onShare,
                      onOpenDirectMessage,
                  }: {
    post: CommunityPost;
    busy: boolean;
    currentUserId: string | null;
    onLike: (post: CommunityPost) => void;
    onEditPost: (post: CommunityPost, body: string) => void;
    onDeletePost: (post: CommunityPost) => void;
    onComment: (postId: string, body: string, parentCommentId?: string | null) => void;
    onToggleCommentLike: (comment: CommunityComment) => void;
    onEditComment: (comment: CommunityComment, body: string) => void;
    onDeleteComment: (comment: CommunityComment) => void;
    onShare: (post: CommunityPost) => void;
    onOpenDirectMessage?: (author: CommunityAuthor) => void;
}) {
    const [postEditing, setPostEditing] = useState(false);
    const [postEditText, setPostEditText] = useState(post.body);
    const [postActionsOpen, setPostActionsOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [replyTarget, setReplyTarget] = useState<CommunityComment | null>(null);
    const commentsOpacity = useRef(new Animated.Value(0)).current;
    const isOwnPost = post.userId === currentUserId;

    useEffect(() => {
        if (!postEditing) setPostEditText(post.body);
    }, [post.body, postEditing]);

    useEffect(() => {
        if (commentsOpen) {
            setCommentsVisible(true);
            Animated.timing(commentsOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }).start();
            return;
        }

        Animated.timing(commentsOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(({finished}) => {
            if (finished) {
                setCommentsVisible(false);
            }
        });
    }, [commentsOpen, commentsOpacity]);

    return (
        <View style={tw`gap-1`}>
            <View style={tw`rounded-3xl border border-slate-700 bg-black/77 p-4`}>
                <View style={tw`flex-row gap-3`}>
                    <Avatar author={post.author} currentUserId={currentUserId}/>
                    <View style={tw`flex-1`}>
                        <View style={tw`flex-row items-start gap-3`}>
                            <Text style={[tw`flex-1 text-sm text-white`, {fontFamily: fonts.heading}]}>
                                {displayName(post.author)}
                            </Text>
                            {isOwnPost ? (
                                <OwnerMenuButton onPress={() => setPostActionsOpen(true)}/>
                            ) : (
                                <AuthorMessageButton
                                    author={post.author}
                                    currentUserId={currentUserId}
                                    onOpenDirectMessage={onOpenDirectMessage}
                                />
                            )}
                        </View>
                        {postEditing ? (
                            <View style={tw`mt-2 gap-2`}>
                                <TextInput
                                    value={postEditText}
                                    onChangeText={setPostEditText}
                                    placeholder="Edit post..."
                                    placeholderTextColor="rgba(228,224,212,0.45)"
                                    keyboardAppearance="dark"
                                    multiline
                                    style={[tw`max-h-32 rounded-2xl border border-slate-700 bg-black/45 px-3 py-2 text-sm text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                                />
                                <View style={tw`flex-row items-center gap-3`}>
                                    <Pressable
                                        disabled={busy || postEditText.trim().length === 0}
                                        onPress={() => {
                                            const nextText = postEditText.trim();
                                            if (!nextText) return;
                                            setPostEditing(false);
                                            onEditPost(post, nextText);
                                        }}
                                        style={({pressed}) => [
                                            tw`py-1`,
                                            (busy || postEditText.trim().length === 0) && tw`opacity-50`,
                                            pressed && tw`opacity-70`,
                                        ]}
                                    >
                                        <Text
                                            style={[tw`text-[10px] text-white`, {fontFamily: fonts.button}]}>Save</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => {
                                            setPostEditText(post.body);
                                            setPostEditing(false);
                                        }}
                                        style={({pressed}) => [
                                            tw`py-1`,
                                            pressed && tw`opacity-70`,
                                        ]}
                                    >
                                        <Text
                                            style={[tw`text-[10px] text-white/70`, {fontFamily: fonts.button}]}>Cancel</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <Text style={[tw`mt-2 text-sm leading-5 text-[#E4E0D4]`, {fontFamily: fonts.body}]}>
                                {post.body}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={tw`mt-4 flex-row flex-wrap items-center gap-2`}>
                    <MetricButton
                        icon={post.likedByMe ? "heart" : "heart-outline"}
                        label={`${post.likesCount}`}
                        active={post.likedByMe}
                        onPress={() => onLike(post)}
                    />
                    <MetricButton
                        icon="chatbubble-outline"
                        label={`${post.commentsCount}`}
                        onPress={() => {
                            setCommentsOpen((current) => !current);
                        }}
                    />
                    <MetricButton
                        icon="share-outline"
                        label={`${post.sharesCount}`}
                        onPress={() => onShare(post)}
                    />
                    <View style={tw`ml-auto flex-row items-center gap-1.5`}>
                        <Text style={[tw`text-[11px] text-slate-700`, {fontFamily: fonts.body}]}>
                            {formatTimestamp(post.createdAt)}
                        </Text>
                    </View>
                </View>

                {commentsVisible ? (
                    <Animated.View style={{opacity: commentsOpacity}}>
                        {post.comments.length > 0 ? (
                            <View style={tw`mt-4 gap-3 border-t border-slate-700 pt-4`}>
                                {post.comments.map((comment, index) => {
                                    const previousComment = post.comments[index - 1];
                                    const commentDateKey = formatDateKey(comment.createdAt);
                                    const showCommentDate = !previousComment || formatDateKey(previousComment.createdAt) !== commentDateKey;

                                    return (
                                        <CommentItem
                                            key={comment.id}
                                            comment={comment}
                                            showDate={showCommentDate}
                                            busy={busy}
                                            currentUserId={currentUserId}
                                            onReply={(target) => {
                                                setReplyTarget(target);
                                                setCommentsOpen(true);
                                            }}
                                            onToggleLike={onToggleCommentLike}
                                            onEdit={onEditComment}
                                            onDelete={onDeleteComment}
                                            onOpenDirectMessage={onOpenDirectMessage}
                                        />
                                    );
                                })}
                            </View>
                        ) : null}

                        {replyTarget ? (
                            <View
                                style={tw`mt-4 flex-row items-center justify-between rounded-2xl border border-slate-700 px-3 py-2`}
                            >
                                <Text style={[tw`flex-1 text-xs text-white`, {fontFamily: fonts.body}]}>
                                    Replying to {displayName(replyTarget.author)}
                                </Text>
                                <Pressable
                                    onPress={() => setReplyTarget(null)}
                                    style={({pressed}) => [
                                        tw`h-6 w-6 items-center justify-center rounded-full`,
                                        pressed && tw`opacity-70`,
                                    ]}
                                >
                                    <Ionicons name="close" size={14} color="#ffffff"/>
                                </Pressable>
                            </View>
                        ) : null}

                        <View style={tw`mt-4 flex-row items-center gap-2`}>
                            <TextInput
                                value={commentText}
                                onChangeText={setCommentText}
                                placeholder={replyTarget ? "Reply..." : "Comment..."}
                                placeholderTextColor="rgba(228,224,212,0.45)"
                                keyboardAppearance="dark"
                                multiline
                                style={[tw`max-h-24 flex-1 rounded-2xl border border-slate-700 bg-black/45 px-3 py-2 text-sm text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                            />
                            <Pressable
                                disabled={busy || commentText.trim().length === 0}
                                onPress={() => {
                                    const text = commentText;
                                    const parentCommentId = replyTarget?.id ?? null;
                                    setCommentText("");
                                    setReplyTarget(null);
                                    onComment(post.id, text, parentCommentId);
                                }}
                                style={({pressed}) => [
                                    tw`h-10 w-10 items-center justify-center rounded-full`,
                                    (busy || commentText.trim().length === 0) && tw`opacity-40`,
                                    pressed && tw`opacity-75`,
                                ]}
                            >
                                <Ionicons name="send" size={17} color="#E4E0D4"/>
                            </Pressable>
                        </View>
                    </Animated.View>
                ) : null}
                <OwnerActionSheet
                    visible={postActionsOpen}
                    onClose={() => setPostActionsOpen(false)}
                    onEdit={() => setPostEditing(true)}
                    onDelete={() => onDeletePost(post)}
                />
            </View>
            <Text style={[tw`self-end pr-2 text-[11px] text-slate-700`, {fontFamily: fonts.body}]}>
                {formatTime(post.createdAt)}
            </Text>
        </View>
    );
}

export function CommunityScreen({
                                    community,
                                    unreadMessageCount = 0,
                                    onOpenMessages,
                                    onOpenDirectMessage,
                                    onOpenInsights,
                                }: CommunityScreenProps) {
    const [postText, setPostText] = useState("");
    const [composerMode, setComposerMode] = useState<ComposerMode>("prompt");
    const today = useMemo(() => toLocalISODate(), []);
    const todaysPrompt = useMemo(() => getDailyJournalPrompt(today), [today]);
    const selectedComposerMode = COMPOSER_MODES.find((mode) => mode.key === composerMode) ?? COMPOSER_MODES[0];

    async function handleCreatePost() {
        const body = postText.trim();
        if (!body) return;
        try {
            setPostText("");
            haptics.selection();
            await community.createPost(formatCommunityPost(composerMode, body, todaysPrompt));
        } catch (error) {
            Alert.alert("Post failed", error instanceof Error ? error.message : "Your post could not be shared.");
            setPostText(body);
        }
    }

    async function handleComment(postId: string, body: string, parentCommentId?: string | null) {
        try {
            haptics.selection();
            await community.addComment(postId, body, parentCommentId);
        } catch (error) {
            Alert.alert("Comment failed", error instanceof Error ? error.message : "Your comment could not be shared.");
        }
    }

    async function handleEditPost(post: CommunityPost, body: string) {
        try {
            haptics.selection();
            await community.editPost(post.id, body);
        } catch (error) {
            Alert.alert("Edit failed", error instanceof Error ? error.message : "Your post could not be updated.");
        }
    }

    async function handleDeletePost(post: CommunityPost) {
        try {
            haptics.selection();
            await community.deletePost(post.id);
        } catch (error) {
            Alert.alert("Delete failed", error instanceof Error ? error.message : "Your post could not be deleted.");
        }
    }

    async function handleToggleCommentLike(comment: CommunityComment) {
        try {
            haptics.selection();
            await community.toggleCommentLike(comment);
        } catch (error) {
            Alert.alert("Like failed", error instanceof Error ? error.message : "Your like could not be saved.");
        }
    }

    async function handleEditComment(comment: CommunityComment, body: string) {
        try {
            haptics.selection();
            await community.editComment(comment.id, body);
        } catch (error) {
            Alert.alert("Edit failed", error instanceof Error ? error.message : "Your comment could not be updated.");
        }
    }

    async function handleDeleteComment(comment: CommunityComment) {
        try {
            haptics.selection();
            await community.deleteComment(comment.id);
        } catch (error) {
            Alert.alert("Delete failed", error instanceof Error ? error.message : "Your comment could not be deleted.");
        }
    }

    async function handleLike(post: CommunityPost) {
        try {
            haptics.selection();
            await community.toggleLike(post);
        } catch (error) {
            Alert.alert("Like failed", error instanceof Error ? error.message : "Your like could not be saved.");
        }
    }

    async function handleShare(post: CommunityPost) {
        try {
            haptics.selection();
            await Share.share({message: `${displayName(post.author)} on Rhodie:\n\n${post.body}`});
            await community.recordShare(post.id);
        } catch (error) {
            Alert.alert("Share failed", error instanceof Error ? error.message : "This post could not be shared.");
        }
    }

    const backgroundImage = require("../../public/images/newspaper 1.jpg");
    const {keyboardInset} = useKeyboardInset();

    return (
        <ImageBackground source={backgroundImage} style={tw`flex-1 bg-black`} imageStyle={tw`opacity-11`}>
            <Animated.View style={[tw`flex-1`, {paddingBottom: keyboardInset}]}>
                <View style={tw`absolute right-3 top-16 z-20 items-center gap-5`}>
                    {onOpenMessages ? (
                        <CommunityRouteEntry
                            label="DMs"
                            icon="mail-outline"
                            onPress={onOpenMessages}
                            badgeCount={unreadMessageCount}
                        />
                    ) : null}
                    {onOpenInsights ? (
                        <CommunityRouteEntry
                            label="Insights"
                            icon="bar-chart-outline"
                            onPress={onOpenInsights}
                        />
                    ) : null}
                </View>
                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`pl-4 pr-20 pb-32 pt-16 gap-4`}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={tw`rounded-3xl border border-slate-700 bg-black/70 p-4`}>
                        <Text style={[tw`text-2xl text-white`, {fontFamily: fonts.heading}]}>Connect</Text>
                        <Text style={[tw`mt-1 text-sm leading-5 text-[#E4E0D4]/70`, {fontFamily: fonts.body}]}>
                            Post a prompt response, gratitude, or a positive note with your peers.
                        </Text>
                        <View style={tw`mt-4 flex-row rounded-2xl border border-slate-700 bg-black/45 p-1`}>
                            {COMPOSER_MODES.map((mode) => {
                                const active = mode.key === composerMode;
                                return (
                                    <Pressable
                                        key={mode.key}
                                        onPress={() => {
                                            haptics.selection();
                                            setComposerMode(mode.key);
                                        }}
                                        style={({pressed}) => [
                                            tw`flex-1 items-center rounded-xl px-2 py-2`,
                                            active && {
                                                backgroundColor: "#DFC4AA",
                                                borderWidth: 1,
                                                borderColor: "rgba(43,43,43,0.22)",
                                                shadowColor: "#000000",
                                                shadowOffset: {width: 0, height: 5},
                                                shadowOpacity: 0.24,
                                                shadowRadius: 8,
                                                elevation: 6,
                                            },
                                            pressed && tw`opacity-80`,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                tw`text-[11px]`,
                                                {
                                                    fontFamily: fonts.button,
                                                    color: active ? "#111111" : "rgba(228,224,212,0.68)"
                                                },
                                            ]}
                                        >
                                            {mode.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        {composerMode === "prompt" ? (
                            <View style={tw`mt-3 rounded-2xl border border-slate-700 bg-black/45 px-3 py-2.5`}>
                                <Text style={[tw`text-[11px] text-white`, {fontFamily: fonts.heading}]}>
                                    Today's prompt
                                </Text>
                                <Text style={[tw`mt-1 text-xs leading-4 text-[#E4E0D4]/75`, {fontFamily: fonts.body}]}>
                                    {todaysPrompt}
                                </Text>
                            </View>
                        ) : null}
                        <TextInput
                            value={postText}
                            onChangeText={setPostText}
                            placeholder={selectedComposerMode.placeholder}
                            placeholderTextColor="rgba(228,224,212,0.45)"
                            keyboardAppearance="dark"
                            multiline
                            style={[tw`mt-4 min-h-[88px] rounded-2xl border border-slate-700 bg-black/45 px-4 py-3 text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                        />
                        <View style={tw`mt-3 flex-row justify-end`}>
                            <Button
                                label={community.busy ? "Sharing..." : "Share"}
                                onPress={() => {
                                    void handleCreatePost();
                                }}
                                disabled={community.busy || postText.trim().length === 0}
                                shine
                                style={tw`rounded-full bg-black px-4 py-2`}
                                textStyle={{color: "#FFF6E8"}}
                            />
                        </View>
                    </View>

                    {community.error ? (
                        <Text
                            style={[tw`rounded-2xl bg-black/70 px-4 py-3 text-sm text-rose-200`, {fontFamily: fonts.body}]}>
                            {community.error}
                        </Text>
                    ) : null}

                    {!community.isLoaded ? (
                        <Text
                            style={[tw`rounded-2xl bg-black/70 px-4 py-3 text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.body}]}>
                            Loading peers...
                        </Text>
                    ) : community.posts.length === 0 ? (
                        <Text
                            style={[tw`rounded-2xl bg-black/70 px-4 py-3 text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.body}]}>
                            No posts yet.
                        </Text>
                    ) : (
                        community.posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                busy={community.busy}
                                currentUserId={community.userId}
                                onLike={(item) => {
                                    void handleLike(item);
                                }}
                                onEditPost={(item, body) => {
                                    void handleEditPost(item, body);
                                }}
                                onDeletePost={(item) => {
                                    void handleDeletePost(item);
                                }}
                                onComment={(postId, body, parentCommentId) => {
                                    void handleComment(postId, body, parentCommentId);
                                }}
                                onToggleCommentLike={(comment) => {
                                    void handleToggleCommentLike(comment);
                                }}
                                onEditComment={(comment, body) => {
                                    void handleEditComment(comment, body);
                                }}
                                onDeleteComment={(comment) => {
                                    void handleDeleteComment(comment);
                                }}
                                onShare={(item) => {
                                    void handleShare(item);
                                }}
                                onOpenDirectMessage={onOpenDirectMessage}
                            />
                        ))
                    )}
                </ScrollView>
            </Animated.View>
        </ImageBackground>
    );
}
