import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {createId} from "../lib/id";
import {ensureOwnProfile} from "../lib/profiles";

export type CommunityAuthor = {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
};

export type CommunityComment = {
    id: string;
    postId: string;
    parentCommentId: string | null;
    userId: string;
    body: string;
    createdAt: string;
    author: CommunityAuthor;
    replies: CommunityComment[];
    likesCount: number;
    likedByMe: boolean;
};

export type CommunityPost = {
    id: string;
    userId: string;
    body: string;
    createdAt: string;
    author: CommunityAuthor;
    comments: CommunityComment[];
    commentsCount: number;
    likesCount: number;
    sharesCount: number;
    likedByMe: boolean;
};

type CommunityPostRow = {
    id: string;
    user_id: string;
    body: string;
    created_at: string;
};

type CommunityCommentRow = {
    id: string;
    post_id: string;
    parent_comment_id: string | null;
    user_id: string;
    body: string;
    created_at: string;
};

type CommunityReactionRow = {
    post_id: string;
    user_id: string;
};

type CommunityCommentReactionRow = {
    comment_id: string;
    user_id: string;
};

type CommunityProfileRow = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
};

const UNKNOWN_AUTHOR: CommunityAuthor = {
    id: "unknown",
    fullName: null,
    avatarUrl: null,
};

function makeAuthor(row: CommunityProfileRow | undefined, id: string): CommunityAuthor {
    if (!row) return {...UNKNOWN_AUTHOR, id};
    return {
        id: row.id,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
    };
}

function incrementCount(map: Map<string, number>, key: string) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

export function useCommunity(session: Session | null) {
    const userId = session?.user.id ?? null;
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const refresh = useCallback(async () => {
        if (!userId) {
            setPosts([]);
            setIsLoaded(true);
            return;
        }

        setError(null);
        const {data: postRows, error: postsError} = await supabase
            .from("community_posts")
            .select("id,user_id,body,created_at")
            .order("created_at", {ascending: false})
            .limit(40);

        if (postsError) {
            setError(postsError.message);
            setIsLoaded(true);
            return;
        }

        const rawPosts = (postRows ?? []) as CommunityPostRow[];
        const postIds = rawPosts.map((post) => post.id);
        const authorIds = new Set(rawPosts.map((post) => post.user_id));

        const [commentsResult, likesResult, sharesResult] = await Promise.all([
            postIds.length
                ? supabase
                    .from("community_comments")
                    .select("id,post_id,parent_comment_id,user_id,body,created_at")
                    .in("post_id", postIds)
                    .order("created_at", {ascending: true})
                : Promise.resolve({data: [], error: null}),
            postIds.length
                ? supabase
                    .from("community_likes")
                    .select("post_id,user_id")
                    .in("post_id", postIds)
                : Promise.resolve({data: [], error: null}),
            postIds.length
                ? supabase
                    .from("community_shares")
                    .select("post_id,user_id")
                    .in("post_id", postIds)
                : Promise.resolve({data: [], error: null}),
        ]);

        const firstError = commentsResult.error ?? likesResult.error ?? sharesResult.error;
        if (firstError) {
            setError(firstError.message);
            setIsLoaded(true);
            return;
        }

        const comments = (commentsResult.data ?? []) as CommunityCommentRow[];
        comments.forEach((comment) => authorIds.add(comment.user_id));
        const commentIds = comments.map((comment) => comment.id);

        const commentLikesResult = commentIds.length
            ? await supabase
                .from("community_comment_likes")
                .select("comment_id,user_id")
                .in("comment_id", commentIds)
            : {data: [], error: null};

        if (commentLikesResult.error) {
            setError(commentLikesResult.error.message);
            setIsLoaded(true);
            return;
        }

        const profileIds = Array.from(authorIds);
        const profilesResult = profileIds.length
            ? await supabase
                .from("profiles")
                .select("id,full_name,avatar_url")
                .in("id", profileIds)
            : {data: [], error: null};

        if (profilesResult.error) {
            setError(profilesResult.error.message);
            setIsLoaded(true);
            return;
        }

        const profiles = new Map(
            ((profilesResult.data ?? []) as CommunityProfileRow[]).map((profile) => [profile.id, profile]),
        );
        const likes = (likesResult.data ?? []) as CommunityReactionRow[];
        const shares = (sharesResult.data ?? []) as CommunityReactionRow[];
        const commentLikes = (commentLikesResult.data ?? []) as CommunityCommentReactionRow[];
        const commentsByPost = new Map<string, CommunityComment[]>();
        const commentsById = new Map<string, CommunityComment>();
        const commentCountByPost = new Map<string, number>();
        const likesByPost = new Map<string, number>();
        const likesByComment = new Map<string, number>();
        const sharesByPost = new Map<string, number>();
        const likedPostIds = new Set<string>();
        const likedCommentIds = new Set<string>();

        commentLikes.forEach((like) => {
            incrementCount(likesByComment, like.comment_id);
            if (like.user_id === userId) likedCommentIds.add(like.comment_id);
        });

        comments.forEach((comment) => {
            incrementCount(commentCountByPost, comment.post_id);
            const mapped: CommunityComment = {
                id: comment.id,
                postId: comment.post_id,
                parentCommentId: comment.parent_comment_id,
                userId: comment.user_id,
                body: comment.body,
                createdAt: comment.created_at,
                author: makeAuthor(profiles.get(comment.user_id), comment.user_id),
                replies: [],
                likesCount: likesByComment.get(comment.id) ?? 0,
                likedByMe: likedCommentIds.has(comment.id),
            };
            commentsById.set(comment.id, mapped);
        });

        comments.forEach((comment) => {
            const mapped = commentsById.get(comment.id);
            if (!mapped) return;
            if (comment.parent_comment_id) {
                const parent = commentsById.get(comment.parent_comment_id);
                if (parent) {
                    parent.replies.push(mapped);
                    return;
                }
            }

            commentsByPost.set(comment.post_id, [...(commentsByPost.get(comment.post_id) ?? []), mapped]);
        });

        likes.forEach((like) => {
            incrementCount(likesByPost, like.post_id);
            if (like.user_id === userId) likedPostIds.add(like.post_id);
        });

        shares.forEach((share) => {
            incrementCount(sharesByPost, share.post_id);
        });

        setPosts(rawPosts.map((post) => {
            const postComments = commentsByPost.get(post.id) ?? [];
            return {
                id: post.id,
                userId: post.user_id,
                body: post.body,
                createdAt: post.created_at,
                author: makeAuthor(profiles.get(post.user_id), post.user_id),
                comments: postComments,
                commentsCount: commentCountByPost.get(post.id) ?? 0,
                likesCount: likesByPost.get(post.id) ?? 0,
                sharesCount: sharesByPost.get(post.id) ?? 0,
                likedByMe: likedPostIds.has(post.id),
            };
        }));
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
            .channel(`community-feed-${userId}`)
            .on("postgres_changes", {event: "*", schema: "public", table: "community_posts"}, scheduleRealtimeRefresh)
            .on("postgres_changes", {event: "*", schema: "public", table: "community_comments"}, scheduleRealtimeRefresh)
            .on("postgres_changes", {event: "*", schema: "public", table: "community_likes"}, scheduleRealtimeRefresh)
            .on("postgres_changes", {event: "*", schema: "public", table: "community_comment_likes"}, scheduleRealtimeRefresh)
            .on("postgres_changes", {event: "*", schema: "public", table: "community_shares"}, scheduleRealtimeRefresh)
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

    const createPost = useCallback(async (body: string) => {
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
        const {error: insertError} = await supabase.from("community_posts").insert({
            id: createId(),
            user_id: userId,
            body: trimmed,
        });
        setBusy(false);
        if (insertError) {
            setError(insertError.message);
            throw insertError;
        }
        await refresh();
    }, [refresh, userId]);

    const addComment = useCallback(async (postId: string, body: string, parentCommentId?: string | null) => {
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
        const {error: insertError} = await supabase.from("community_comments").insert({
            id: createId(),
            post_id: postId,
            parent_comment_id: parentCommentId ?? null,
            user_id: userId,
            body: trimmed,
        });
        setBusy(false);
        if (insertError) {
            setError(insertError.message);
            throw insertError;
        }
        await refresh();
    }, [refresh, userId]);

    const editComment = useCallback(async (commentId: string, body: string) => {
        if (!userId) return;
        const trimmed = body.trim();
        if (!trimmed) return;
        setBusy(true);
        setError(null);
        const {error: updateError} = await supabase
            .from("community_comments")
            .update({body: trimmed})
            .eq("id", commentId)
            .eq("user_id", userId);
        setBusy(false);
        if (updateError) {
            setError(updateError.message);
            throw updateError;
        }
        await refresh();
    }, [refresh, userId]);

    const deleteComment = useCallback(async (commentId: string) => {
        if (!userId) return;
        setBusy(true);
        setError(null);
        const {error: deleteError} = await supabase
            .from("community_comments")
            .delete()
            .eq("id", commentId)
            .eq("user_id", userId);
        setBusy(false);
        if (deleteError) {
            setError(deleteError.message);
            throw deleteError;
        }
        await refresh();
    }, [refresh, userId]);

    const toggleCommentLike = useCallback(async (comment: CommunityComment) => {
        if (!userId) return;
        setError(null);
        if (comment.likedByMe) {
            const {error: deleteError} = await supabase
                .from("community_comment_likes")
                .delete()
                .eq("comment_id", comment.id)
                .eq("user_id", userId);
            if (deleteError) {
                setError(deleteError.message);
                throw deleteError;
            }
        } else {
            const {error: insertError} = await supabase.from("community_comment_likes").insert({
                comment_id: comment.id,
                user_id: userId,
            });
            if (insertError) {
                setError(insertError.message);
                throw insertError;
            }
        }
        await refresh();
    }, [refresh, userId]);

    const toggleLike = useCallback(async (post: CommunityPost) => {
        if (!userId) return;
        setError(null);
        if (post.likedByMe) {
            const {error: deleteError} = await supabase
                .from("community_likes")
                .delete()
                .eq("post_id", post.id)
                .eq("user_id", userId);
            if (deleteError) {
                setError(deleteError.message);
                throw deleteError;
            }
        } else {
            const {error: insertError} = await supabase.from("community_likes").insert({
                post_id: post.id,
                user_id: userId,
            });
            if (insertError) {
                setError(insertError.message);
                throw insertError;
            }
        }
        await refresh();
    }, [refresh, userId]);

    const recordShare = useCallback(async (postId: string) => {
        if (!userId) return;
        setError(null);
        const {error: upsertError} = await supabase
            .from("community_shares")
            .upsert({post_id: postId, user_id: userId}, {onConflict: "post_id,user_id"});
        if (upsertError) {
            setError(upsertError.message);
            throw upsertError;
        }
        await refresh();
    }, [refresh, userId]);

    return useMemo(() => ({
        userId,
        posts,
        isLoaded,
        busy,
        error,
        refresh,
        createPost,
        addComment,
        editComment,
        deleteComment,
        toggleLike,
        toggleCommentLike,
        recordShare,
    }), [addComment, busy, createPost, deleteComment, editComment, error, isLoaded, posts, recordShare, refresh, toggleCommentLike, toggleLike, userId]);
}

export type CommunityState = ReturnType<typeof useCommunity>;
