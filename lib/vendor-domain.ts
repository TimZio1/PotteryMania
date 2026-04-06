import dns from "node:dns/promises";
import crypto from "node:crypto";
import {
  expectedVendorDomainTxtValue,
  vendorDomainTxtHostname,
} from "./vendor-domain-core";

export {
  canonicalPublicOrigin,
  expectedVendorDomainTxtValue,
  isPlausiblePublicHostname,
  normalizeDomainName,
  primaryAppHostname,
  stripPortFromHost,
  vendorDomainResolveFetchBaseUrl,
  vendorDomainTxtHostname,
} from "./vendor-domain-core";

export function newVerificationToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Returns true if any TXT string on _potterymania.<domain> contains pm-verify=<token>.
 */
export async function dnsTxtContainsVerifyToken(domainName: string, token: string): Promise<boolean> {
  const name = vendorDomainTxtHostname(domainName);
  const needle = expectedVendorDomainTxtValue(token);
  try {
    const records = await dns.resolveTxt(name);
    const flat = records.flat().map((s) => s.trim());
    return flat.some((txt) => txt === needle || txt.includes(needle));
  } catch {
    return false;
  }
}
