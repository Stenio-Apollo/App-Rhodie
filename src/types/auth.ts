export type AppSession = {
    user: {
        id: string;
        email: string | null;
        created_at: string | null;
        user_metadata: {
            full_name?: string | null;
            birthday?: string | null;
        };
    };
};
