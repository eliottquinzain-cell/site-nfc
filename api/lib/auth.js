const crypto = require('crypto');
let bcrypt;
try {
    bcrypt = require('bcryptjs');
} catch (e) {
    bcrypt = require('./bcrypt.js');
}

const JWT_SECRET = process.env.SESSION_SECRET || 'TapTapNFC_Super_Secret_Key_2026_JWT_Secure_Token_Production_V2';
const COOKIE_NAME = 'nfc_session';
const SESSION_DURATION = 7 * 24 * 3600; // 7 days in seconds

// Helper to base64url encode/decode
function base64urlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64urlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Sign a secure JWT session token
 */
function signJwt(payload, secret = JWT_SECRET, expiresIn = SESSION_DURATION) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + expiresIn;
    const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

    const headerB64 = base64urlEncode(JSON.stringify(header));
    const payloadB64 = base64urlEncode(JSON.stringify(fullPayload));

    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verify and decode a JWT session token with timing-safe signature comparison
 */
function verifyJwt(token, secret = JWT_SECRET) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
    }

    try {
        const payload = JSON.parse(base64urlDecode(payloadB64));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null; // Expired
        }
        return payload;
    } catch (err) {
        return null;
    }
}

/**
 * Parse incoming HTTP Cookie header
 */
function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;

    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name?.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        list[name] = decodeURIComponent(value);
    });

    return list;
}

/**
 * Serialize a secure Set-Cookie header
 */
function createSessionCookie(token, maxAge = SESSION_DURATION) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    let cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
    if (isProduction) {
        cookie += '; Secure';
    }
    return cookie;
}

function createClearSessionCookie() {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Bcrypt password hashing
 */
async function hashPassword(plainPassword) {
    return await bcrypt.hash(plainPassword, 10);
}

/**
 * Bcrypt password verification (with backward-compatibility support)
 */
async function verifyPassword(plainPassword, storedHash) {
    if (!plainPassword || !storedHash) return false;
    
    // Standard bcrypt check ($2a$, $2b$, $2y$)
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
        return await bcrypt.compare(plainPassword, storedHash);
    }

    // Legacy SHA-256 fallback (to allow immediate migration of existing passwords)
    const SALT = 'TapTapNFC_AdminSecurity_Salt_2026_SecureHashKey';
    const legacyHash = crypto.createHash('sha256').update(plainPassword + SALT).digest('hex');
    if (legacyHash === storedHash) {
        return true;
    }

    // Direct match fallback for legacy plain text passwords in transition
    return plainPassword === storedHash;
}

module.exports = {
    signJwt,
    verifyJwt,
    parseCookies,
    createSessionCookie,
    createClearSessionCookie,
    hashPassword,
    verifyPassword,
    COOKIE_NAME,
    JWT_SECRET
};
