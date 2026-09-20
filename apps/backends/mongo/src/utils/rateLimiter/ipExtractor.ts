import { TRUSTED_PROXY_CIDRS } from "../../constants/env";
import type { RateLimiterRequest } from "../../types/rateLimiter.types";

/**
 * Resolves the client IP that every IP-derived rate limit is keyed on.
 *
 * The rule is that a header is only evidence if it was written by infrastructure we control.
 * `cf-connecting-ip` and `true-client-ip` are set by Cloudflare and Akamai at their edge, but
 * nothing stops any client from sending them too — so they are read ONLY when the connection
 * itself arrives from a proxy listed in TRUSTED_PROXY_CIDRS. Without that check, an attacker sends
 * a different value on every request, lands in a different bucket each time, and no IP limit —
 * including the punitive login lockout — ever fires.
 *
 * With no trusted proxies configured (the default), the only source is Express's own `req.ip`,
 * which honours `app.set("trust proxy", …)` and is therefore as trustworthy as that setting.
 */

// Shared by every unattributable request, rather than being silently merged into localhost's
// bucket the way a 127.0.0.1 fallback would.
export const UNKNOWN_IP = "unknown";

const EDGE_HEADERS = ["cf-connecting-ip", "true-client-ip"] as const;

const trustedRanges = parseCidrList(TRUSTED_PROXY_CIDRS);

export function extractClientIp(req: RateLimiterRequest): string {
    // The peer that actually opened the socket — the only value a remote client cannot choose.
    const peer = req.socket?.remoteAddress;

    if (peer && isTrustedProxy(normalizeIp(peer))) {
        for (const header of EDGE_HEADERS) {
            const value = getHeaderValue(req, header);
            if (value && isValidIp(value)) {
                return normalizeIp(value);
            }
        }
    }

    /*
      `req.ip` already accounts for `x-forwarded-for` under Express's `trust proxy` setting, which
      counts hops from the RIGHT — the end a client can't forge past. Reading the header here by
      hand could only take the leftmost entry, which is the attacker-supplied one.
     */
    if (req.ip && isValidIp(req.ip)) {
        return normalizeIp(req.ip);
    }

    return UNKNOWN_IP;
}

function getHeaderValue(req: RateLimiterRequest, headerName: string): string | undefined {
    if (!req.headers) return undefined;

    if ("get" in req.headers && typeof req.headers.get === "function") {
        return req.headers.get(headerName) ?? undefined;
    }

    const headersObj = req.headers as Record<string, string | string[] | undefined>;
    const val = headersObj[headerName.toLowerCase()] ?? headersObj[headerName];
    if (Array.isArray(val)) {
        return val[0];
    }
    return val;
}

function normalizeIp(ip: string): string {
    const trimmed = ip.trim();
    // IPv4-mapped IPv6, as Node reports for an IPv4 client on a dual-stack socket.
    if (trimmed.startsWith("::ffff:")) {
        return trimmed.substring(7);
    }
    if (trimmed === "::1") {
        return "127.0.0.1";
    }
    return trimmed;
}

function isValidIp(ip: string): boolean {
    if (!ip || typeof ip !== "string") return false;
    return isIpv4(ip.trim()) || isIpv6(ip.trim());
}

function isIpv4(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every((part) => {
        if (!/^\d{1,3}$/.test(part)) return false;
        const octet = Number(part);
        return octet >= 0 && octet <= 255;
    });
}

/*
  Deliberately stricter than "hex digits and colons", which the previous version accepted — that
  let "::::" and "ffff" through as addresses, and a bogus value is still a usable bucket key.
*/
function isIpv6(ip: string): boolean {
    if (!ip.includes(":")) return false;
    if (ip.split("::").length > 2) return false;

    const groups = ip.split(":");
    if (groups.length > 8) return false;

    return groups.every((group) => group === "" || /^[0-9a-fA-F]{1,4}$/.test(group));
}

type CidrRange = { base: number; mask: number };

/**
 * IPv4 CIDR matching only. An IPv6 proxy address is not matched and so is not trusted, which fails
 * safe: the headers are ignored and `req.ip` is used instead.
 */
function parseCidrList(raw: string): CidrRange[] {
    return raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .flatMap((entry) => {
            const [address, bitsRaw] = entry.split("/");
            const bits = bitsRaw === undefined ? 32 : Number(bitsRaw);

            if (!isIpv4(address) || !Number.isInteger(bits) || bits < 0 || bits > 32) {
                console.warn(`Ignoring invalid TRUSTED_PROXY_CIDRS entry: "${entry}"`);
                return [];
            }

            // A /0 would trust everything, so the shift is written to stay correct at the edges.
            const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
            return [{ base: (ipv4ToInt(address) & mask) >>> 0, mask }];
        });
}

function ipv4ToInt(ip: string): number {
    return ip
        .split(".")
        .reduce((acc, octet) => ((acc << 8) + Number(octet)) >>> 0, 0);
}

function isTrustedProxy(ip: string): boolean {
    if (trustedRanges.length === 0 || !isIpv4(ip)) return false;
    const value = ipv4ToInt(ip);
    return trustedRanges.some((range) => ((value & range.mask) >>> 0) === range.base);
}
