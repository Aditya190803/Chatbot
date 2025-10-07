import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME } from '@repo/common/auth';
import { auth, getUserFromJWT } from '@repo/common/auth/server';

const secure = process.env.NODE_ENV === 'production';

export async function GET() {
    const session = await auth();
    if (!session.user) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: session.user });
}

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const jwt = body?.jwt;

    if (!jwt || typeof jwt !== 'string') {
        return NextResponse.json({ error: 'Missing session token' }, { status: 400 });
    }

    const user = await getUserFromJWT(jwt);
    if (!user) {
        return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
    }

    const response = NextResponse.json({ user });
    response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: jwt,
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: AUTH_COOKIE_MAX_AGE,
    });
    return response;
}

export async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: '',
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    return response;
}
