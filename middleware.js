// Vercel Edge Middleware - Server-Side Route Guard & Role-Based Access Control
const JWT_SECRET = process.env.SESSION_SECRET || 'TapTapNFC_Super_Secret_Key_2026_JWT_Secure_Token_Production_V2';
const COOKIE_NAME = 'nfc_session';

/**
 * Verify HMAC-SHA256 JWT using Web Cryptography API (Edge Runtime native)
 */
async function verifyEdgeJwt(token, secret) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    try {
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        let binarySig = '';
        const b64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
        const pad = (4 - (b64.length % 4)) % 4;
        const paddedB64 = b64 + '='.repeat(pad);
        const decoded = atob(paddedB64);
        const signatureBytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            signatureBytes[i] = decoded.charCodeAt(i);
        }

        const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, data);
        if (!isValid) return null;

        const payloadB64Padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payloadB64.length % 4)) % 4);
        const payload = JSON.parse(atob(payloadB64Padded));

        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null; // Expired
        }
        return payload;
    } catch (e) {
        return null;
    }
}

/**
 * Helper to get cookie value from request
 */
function getCookieValue(cookieHeader, name) {
    if (!cookieHeader) return null;
    const matches = cookieHeader.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return matches ? decodeURIComponent(matches[1]) : null;
}

export default async function middleware(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const isProtectedAdmin = pathname === '/admin' || pathname === '/admin.html' || pathname.startsWith('/admin/');
    const isProtectedClient = pathname === '/client' || pathname === '/client.html' || pathname.startsWith('/client/');
    const isLoginPage = pathname === '/login' || pathname === '/login.html';

    // If route doesn't require authentication, proceed normally
    if (!isProtectedAdmin && !isProtectedClient && !isLoginPage) {
        return;
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const sessionToken = getCookieValue(cookieHeader, COOKIE_NAME);
    const session = sessionToken ? await verifyEdgeJwt(sessionToken, JWT_SECRET) : null;

    // 1. IF ON LOGIN PAGE AND ALREADY LOGGED IN -> AUTO-REDIRECT TO DASHBOARD
    if (isLoginPage && session) {
        let dest = '/admin.html';
        if (session.role === 'client') {
            dest = session.hasSubscription ? '/client.html' : '/suivi.html';
        }
        return Response.redirect(new URL(dest, request.url), 302);
    }

    // 2. ADMIN ROUTE PROTECTION
    if (isProtectedAdmin) {
        // Not authenticated -> Block and Redirect to login
        if (!session) {
            const loginUrl = new URL('/login.html', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            loginUrl.searchParams.set('auth', 'required');
            return Response.redirect(loginUrl, 302);
        }

        // Authenticated but wrong role -> Block with forbidden error
        if (session.role !== 'admin') {
            const forbiddenUrl = new URL('/login.html', request.url);
            forbiddenUrl.searchParams.set('error', 'forbidden');
            forbiddenUrl.searchParams.set('redirect', pathname);
            return Response.redirect(forbiddenUrl, 302);
        }

        // Rewrite clean /admin to /admin.html
        if (pathname === '/admin') {
            return Response.rewrite(new URL('/admin.html', request.url));
        }

        // Authenticated admin allowed
        return;
    }

    // 3. CLIENT ROUTE PROTECTION (CONDITIONNÉ STRICTEMENT À L'ABONNEMENT)
    if (isProtectedClient) {
        // Not authenticated -> Block and Redirect to login
        if (!session) {
            const loginUrl = new URL('/login.html', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            loginUrl.searchParams.set('auth', 'required');
            return Response.redirect(loginUrl, 302);
        }

        // Client without subscription -> Block and Redirect to lightweight tracking page
        if (session.role === 'client' && !session.hasSubscription) {
            const trackingUrl = new URL('/suivi.html', request.url);
            trackingUrl.searchParams.set('reason', 'no_subscription');
            return Response.redirect(trackingUrl, 302);
        }

        // Rewrite clean /client to /client.html
        if (pathname === '/client') {
            return Response.rewrite(new URL('/client.html', request.url));
        }

        // Authenticated subscriber or admin allowed
        return;
    }
}

export const config = {
    matcher: [
        '/admin',
        '/admin.html',
        '/admin/:path*',
        '/client',
        '/client.html',
        '/client/:path*',
        '/login',
        '/login.html'
    ]
};
