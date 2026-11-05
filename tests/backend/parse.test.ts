import { describe, expect, it } from "vitest";
import {
  daysLeft,
  keyType,
  parseInspect,
  parseList,
  parseStatus,
} from "../../src/backend/parse.js";
import { levelOf } from "../../src/backend/watches.js";
import type { CertView } from "../../src/shared/types.js";
import { ACME, CERTBOT, CHAIN } from "./fixtures";

const NOW = Date.parse("2026-11-04T10:00:00Z");

describe("status", () => {
  it("reads tools and renewal", () => {
    expect(
      parseStatus(
        "os=Debian\nroot=1\ncertbot=2.11.0\nacmesh=v3.0.9\nopenssl=1\nmanager=apt-get\ntimer=active\ntimernext=Thu 2026-11-05 03:00:00 UTC\ncertbotcron=1\n",
      ),
    ).toMatchObject({
      certbot: "2.11.0",
      acmesh: "3.0.9",
      openssl: true,
      manager: "apt-get",
      timer: "active",
      certbotCron: true,
      acmeCron: false,
    });
  });
});

describe("list", () => {
  const certs = parseList(CERTBOT + ACME, NOW);

  it("sorts by days left across clients", () => {
    expect(certs.map((c) => c.key)).toEqual([
      "acme.sh:acme.example.org",
      "certbot:test.example.com",
      "certbot:example.com",
    ]);
  });

  it("reads certbot details", () => {
    expect(certs[2]).toMatchObject({
      domains: ["example.com", "www.example.com"],
      expiry: "2026-12-01T10:00:00.000Z",
      daysLeft: 27,
      path: "/etc/letsencrypt/live/example.com/fullchain.pem",
      keyType: "ECDSA",
      staging: false,
    });
    expect(certs[1]).toMatchObject({ staging: true, daysLeft: 6 });
  });

  it("reads acme.sh details", () => {
    expect(certs[0]).toMatchObject({
      client: "acme.sh",
      domains: ["acme.example.org", "www.acme.example.org"],
      keyType: "ECDSA 256",
      staging: false,
    });
    expect(certs[0].daysLeft).toBeLessThan(0);
  });

  it("is empty with nothing installed", () => {
    expect(parseList("", NOW)).toEqual([]);
  });
});

describe("inspect", () => {
  const result = parseInspect(CHAIN, "example.com:443", NOW);

  it("reads the chain and the verify result", () => {
    expect(result.verify).toBe("0 (ok)");
    expect(result.chain).toHaveLength(2);
    expect(result.chain[0]).toMatchObject({
      subject: "CN = example.com",
      sans: ["example.com", "www.example.com", "10.0.0.1"],
      serial: "04AB",
      fingerprint: "AA:BB:CC",
      keyType: "ECDSA 256",
      daysLeft: 27,
      selfSigned: false,
    });
    expect(result.chain[1]).toMatchObject({
      fingerprint: "DD:EE",
      keyType: "RSA 2048",
      sans: [],
    });
  });

  it("spots self signed certificates", () => {
    const out = parseInspect(
      "@@TERMIX@@CERT\nsubject=CN = box\nissuer=CN = box\n",
      "/x.pem",
      NOW,
    );
    expect(out.chain[0].selfSigned).toBe(true);
  });
});

describe("helpers", () => {
  it("counts days and names keys", () => {
    expect(daysLeft(null)).toBeNull();
    expect(daysLeft("nonsense")).toBeNull();
    expect(keyType("ED25519", "")).toBe("Ed25519");
  });

  it("levels certificates for alerts", () => {
    const cert = (days: number | null) =>
      ({ daysLeft: days }) as unknown as CertView;
    expect(levelOf(cert(-1), 14)).toBe("expired");
    expect(levelOf(cert(14), 14)).toBe("soon");
    expect(levelOf(cert(15), 14)).toBeNull();
    expect(levelOf(cert(null), 14)).toBeNull();
  });
});
