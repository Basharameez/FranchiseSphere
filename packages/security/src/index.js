import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "crypto";
const SECRET = process.env.JWT_SECRET || "threadline-super-secret-key-1234567890";
export function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash)
        return false;
    const computedHash = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computedHash, "hex"));
}
function base64url(str) {
    return Buffer.from(str).toString("base64url");
}
function fromBase64url(str) {
    return Buffer.from(str, "base64url").toString("utf8");
}
export function generateToken(payload, expirySeconds = 900) {
    const header = { alg: "HS256", typ: "JWT" };
    const exp = Math.floor(Date.now() / 1000) + expirySeconds;
    const fullPayload = { ...payload, exp };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(fullPayload));
    const signature = createHmac("sha256", SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64url");
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}
export function verifyToken(token) {
    const parts = token.split(".");
    if (parts.length !== 3)
        return null;
    const [header, payload, signature] = parts;
    if (!header || !payload || !signature)
        return null;
    const expectedSignature = createHmac("sha256", SECRET)
        .update(`${header}.${payload}`)
        .digest("base64url");
    if (signature !== expectedSignature)
        return null;
    try {
        const decoded = JSON.parse(fromBase64url(payload));
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            return null; // expired
        }
        return decoded;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=index.js.map