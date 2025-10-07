export type AuthUser = {
    id: string;
    email: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
};

const toTitleCase = (value?: string | null) => {
    if (!value) return value ?? null;
    return value
        .split(' ')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
};

export const mapAccountToAuthUser = (account: {
    $id: string;
    email: string;
    name?: string | null;
    prefs?: Record<string, unknown> | null;
    firstName?: string | null;
    lastName?: string | null;
    [key: string]: unknown;
}): AuthUser => {
    const fullName = (account.firstName || account.lastName)
        ? [account.firstName, account.lastName].filter(Boolean).join(' ')
        : account.name ?? null;

    const normalizedName = toTitleCase(fullName ?? undefined);
    const normalizedFirstName = account.firstName ? toTitleCase(account.firstName) : normalizedName?.split(' ')?.[0] ?? null;
    const normalizedLastName = account.lastName
        ? toTitleCase(account.lastName)
        : normalizedName && normalizedName.includes(' ')
            ? normalizedName.split(' ').slice(1).join(' ')
            : null;

    let imageUrl: string | null = null;
    if (account.prefs && typeof account.prefs === 'object' && account.prefs !== null) {
        const prefs = account.prefs as Record<string, unknown>;
        if (typeof prefs.avatarUrl === 'string') {
            imageUrl = prefs.avatarUrl;
        }
    }

    return {
        id: account.$id,
        email: account.email,
        name: normalizedName,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        imageUrl,
    };
};

export const AUTH_COOKIE_NAME = 'appwrite_session';
export const AUTH_COOKIE_MAX_AGE = 60 * 15; // 15 minutes, matches Appwrite JWT expiry
