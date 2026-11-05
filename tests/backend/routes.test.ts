import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanEndpoint,
  cleanIssue,
  deleteScript,
  installCertbotScript,
  issueScript,
  renewScript,
  revokeScript,
} from "../../src/backend/scripts.js";
import type { IssueBody } from "../../src/shared/types.js";
import { ACME, CERTBOT, CHAIN } from "./fixtures";
import { startServer, type TestServer } from "./helpers";

let s: TestServer | null = null;

afterEach(async () => {
  await s?.close();
  s = null;
});

const STATUS =
  "os=Debian\nroot=1\ncertbot=2.11.0\nacmesh=3.0.9\nopenssl=1\nmanager=apt-get\ntimer=active\n";

async function server(options: Parameters<typeof startServer>[0] = {}) {
  const srv = await startServer(options);
  srv.ssh.replies.push({ match: "manager=", stdout: STATUS });
  srv.ssh.replies.push({
    match: "certbot certificates",
    stdout: CERTBOT + ACME,
  });
  return srv;
}

const issue = (over: Partial<IssueBody> = {}) =>
  ({
    client: "certbot",
    domains: ["example.com"],
    challenge: "standalone",
    ...over,
  }) as IssueBody;

describe("reads", () => {
  it("reports status with the caller's alert state", async () => {
    s = await server({ settings: { expiryWarnDays: 30 } });
    const res = await s.request("GET", "/1/status");
    expect(res.body).toMatchObject({
      certbot: "2.11.0",
      watching: false,
      warnDays: 30,
      canEdit: true,
    });
  });

  it("lists certificates", async () => {
    s = await server();
    const res = await s.request("GET", "/1/certificates");
    expect(res.body).toHaveLength(3);
  });

  it("inspects a file and a server", async () => {
    s = await server();
    s.ssh.replies.unshift({ match: "s_client", stdout: CHAIN });
    s.ssh.replies.unshift({
      match: "split_certs '/etc/ssl/a.pem'",
      stdout: CHAIN,
    });
    const file = await s.request("GET", "/1/inspect?path=/etc/ssl/a.pem");
    expect(file.body.chain).toHaveLength(2);
    const remote = await s.request(
      "GET",
      "/1/inspect?address=example.com&port=8443",
    );
    expect(remote.body.source).toBe("example.com:8443");
    const script = s.ssh.calls.at(-1)!.stdin;
    expect(script).toContain("-connect 'example.com:8443'");
    expect(script).toContain("-servername 'example.com'");
  });

  it("refuses bad paths and addresses", async () => {
    s = await server();
    expect((await s.request("GET", "/1/inspect?path=/etc/$(id)")).status).toBe(
      400,
    );
    expect((await s.request("GET", "/1/inspect?path=/etc/../x")).status).toBe(
      400,
    );
    expect((await s.request("GET", "/1/inspect?address=a;b")).status).toBe(400);
    expect(
      (await s.request("GET", "/1/inspect?address=a.com&port=99999")).status,
    ).toBe(400);
  });
});

describe("changes", () => {
  it("issues as root and audits the domains", async () => {
    s = await server();
    s.ssh.replies.unshift({
      match: "certonly",
      stdout: "Successfully received\n",
    });
    const res = await s.request("POST", "/1/issue", issue());
    expect(res.body).toEqual({ ok: true, output: "Successfully received" });
    expect(s.ssh.calls.at(-1)!.command).toContain("sudo");
    expect(s.mock.audits.at(-1)).toMatchObject({
      action: "certificates.issue",
      resourceName: "example.com",
      success: true,
    });
  });

  it("sends output back when a client fails", async () => {
    s = await server();
    s.ssh.replies.unshift({
      match: "certonly",
      stdout: "Could not bind TCP port 80\n",
      code: 1,
    });
    const res = await s.request("POST", "/1/issue", issue());
    expect(res.status).toBe(400);
    expect(res.body.output).toContain("port 80");
  });

  it("renews one or all, and refuses a dry run on acme.sh", async () => {
    s = await server();
    await s.request("POST", "/1/renew", {
      key: "certbot:example.com",
      dryRun: true,
    });
    expect(s.ssh.calls.at(-1)!.stdin).toContain(
      "certbot renew --non-interactive --cert-name 'example.com' --dry-run",
    );
    await s.request("POST", "/1/renew", { client: "acme.sh" });
    expect(s.ssh.calls.at(-1)!.stdin).toContain("--renew-all");
    const dry = await s.request("POST", "/1/renew", {
      key: "acme.sh:example.com",
      dryRun: true,
    });
    expect(dry.status).toBe(400);
  });

  it("refuses bad keys", async () => {
    s = await server();
    expect(
      (await s.request("POST", "/1/revoke", { key: "certbot:a;rm" })).status,
    ).toBe(400);
    expect((await s.request("POST", "/1/revoke", { key: "x:y" })).status).toBe(
      400,
    );
  });

  it("needs edit access and a writable host", async () => {
    s = await server({ level: "connect" });
    expect((await s.request("POST", "/1/issue", issue())).body.code).toBe(
      "HOST_EDIT_REQUIRED",
    );
    await s.close();
    s = await server({ settings: { readOnly: true } });
    expect((await s.request("POST", "/1/issue", issue())).body.code).toBe(
      "readOnly",
    );
  });
});

describe("issue checks", () => {
  it("refuses bad input", () => {
    expect(() => cleanIssue(issue({ domains: [] }))).toThrow(/domain/i);
    expect(() => cleanIssue(issue({ domains: ["a b.com"] }))).toThrow(
      /valid domain/,
    );
    expect(() => cleanIssue(issue({ domains: ["*.example.com"] }))).toThrow(
      /Wildcard/,
    );
    expect(() =>
      cleanIssue(issue({ challenge: "webroot", webroot: "/etc" })),
    ).toThrow(/web root/);
    expect(() =>
      cleanIssue(issue({ challenge: "dns", dnsProvider: "a b" })),
    ).toThrow(/DNS provider/);
    expect(() => cleanIssue(issue({ email: "a'b@c.d" }))).toThrow(/email/);
  });

  it("builds certbot and acme.sh commands", () => {
    expect(
      issueScript(
        cleanIssue(
          issue({
            challenge: "dns",
            domains: ["*.example.com", "example.com"],
            dnsProvider: "cloudflare",
            credentials: "/root/cf.ini",
            email: "me@example.com",
            staging: true,
          }),
        ),
      ),
    ).toContain(
      "certbot certonly --non-interactive --agree-tos --email 'me@example.com' --staging --key-type ecdsa --dns-cloudflare --dns-cloudflare-credentials '/root/cf.ini' -d '*.example.com' -d 'example.com'",
    );
    expect(
      issueScript(
        cleanIssue(
          issue({
            client: "acme.sh",
            challenge: "webroot",
            webroot: "/var/www/html",
            keyType: "rsa",
          }),
        ),
      ),
    ).toContain(
      "--issue --server letsencrypt --keylength 2048 -w '/var/www/html' -d 'example.com'",
    );
  });

  it("brackets IPv6 and skips SNI for addresses", () => {
    expect(cleanEndpoint("2001:db8::1", 443)).toEqual({
      connect: "[2001:db8::1]:443",
      sni: "",
    });
    expect(cleanEndpoint("10.0.0.1", 443).sni).toBe("");
  });
});

describe("alerts", () => {
  it("stores a watch per user", async () => {
    s = await server();
    await s.request("POST", "/1/watch", { on: true });
    expect((await s.request("GET", "/1/status")).body.watching).toBe(true);
    await s.request("POST", "/1/watch", { on: false });
    expect((await s.request("GET", "/1/status")).body.watching).toBe(false);
  });
});

describe("summary", () => {
  it("lists days left per enabled host", async () => {
    s = await server();
    Object.assign(s.mock.ctx.hosts, {
      list: async () => [{ id: 1 }, { id: 2 }],
    });
    const res = await s.request("GET", "/summary");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].certs).toHaveLength(3);
  });
});

describe("scripts", () => {
  const bash = spawnSync("bash", ["-c", "true"]).status === 0;

  it.skipIf(!bash)("every script parses as bash", async () => {
    s = await server();
    for (const path of [
      "status",
      "certificates",
      "inspect?path=/etc/a.pem",
      "inspect?address=example.com",
      "inspect?address=2001:db8::1",
    ]) {
      await s.request("GET", `/1/${path}`);
    }
    const scripts = [
      ...s.ssh.calls.map((call) => call.stdin),
      issueScript(cleanIssue(issue())),
      issueScript(cleanIssue(issue({ client: "acme.sh" }))),
      renewScript("certbot", null),
      renewScript("certbot", "a.com", { force: true }),
      renewScript("acme.sh", null),
      renewScript("acme.sh", "a.com", { force: true }),
      revokeScript("certbot", "a.com"),
      revokeScript("acme.sh", "a.com"),
      deleteScript("certbot", "a.com"),
      deleteScript("acme.sh", "*.a.com"),
      ...["apt-get", "dnf", "yum", "zypper", "pacman", "apk"].map(
        installCertbotScript,
      ),
    ];
    for (const script of scripts) {
      const out = spawnSync("bash", ["-n"], { input: script });
      expect(out.status, `${script}\n${out.stderr}`).toBe(0);
    }
  });
});
