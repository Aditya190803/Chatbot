// import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Temporarily disabled clerk middleware for testing
export default function middleware() {
    return NextResponse.next();
}

// export default clerkMiddleware(async (auth, req) => {
//     return NextResponse.next();
// });

export const config = {
    matcher: [
        '/api/:path*',
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
};
