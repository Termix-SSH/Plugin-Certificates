import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import {
  renderWithApp,
  type RenderedPluginApp,
} from "@termix-ssh/plugin-sdk/testing";
import type { PluginManifest } from "@termix-ssh/plugin-sdk/manifest";
import * as plugin from "../../src/frontend/index";
import { expiryTone } from "../../src/frontend/expiry";
import manifestJson from "../../manifest.json";
import locales from "../../locales/en.json";

const manifest = manifestJson as unknown as PluginManifest;

let rendered: RenderedPluginApp | null = null;

afterEach(async () => {
  await rendered?.deactivate();
  rendered = null;
});

const status = {
  os: "Debian GNU/Linux 13",
  root: true,
  certbot: "2.11.0",
  acmesh: "",
  openssl: true,
  manager: "apt-get",
  timer: "active",
  timerNext: "",
  certbotCron: false,
  acmeCron: false,
  watching: false,
  warnDays: 14,
  canEdit: true,
  readOnly: false,
};

const certs = [
  {
    key: "certbot:example.com",
    client: "certbot",
    name: "example.com",
    domains: ["example.com", "www.example.com"],
    expiry: "2026-12-01T10:00:00.000Z",
    daysLeft: 3,
    path: "/etc/letsencrypt/live/example.com/fullchain.pem",
    keyType: "ECDSA",
    staging: false,
  },
];

const chain = {
  source: "/x.pem",
  verify: "",
  chain: [
    {
      subject: "CN = example.com",
      issuer: "CN = E5",
      notBefore: "2026-09-01T10:00:00.000Z",
      notAfter: "2026-12-01T10:00:00.000Z",
      daysLeft: 3,
      sans: ["example.com"],
      serial: "04AB",
      fingerprint: "AA:BB",
      keyType: "ECDSA 256",
      selfSigned: false,
    },
  ],
};

function api(current: unknown) {
  return {
    get: vi.fn(async (url: string) => ({
      data: url.endsWith("/status")
        ? current
        : url.endsWith("/certificates")
          ? certs
          : chain,
    })),
    post: vi.fn(async () => ({ data: { ok: true, output: "" } })),
  } as never;
}

const host = { id: 1, name: "web", enableSsh: true };

describe(`${manifest.id} activate`, () => {
  it("registers the host tab", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    expect(rendered.registered.tabs()).toEqual(["certificates"]);
  });

  it("adds a homepage widget and a panel switch", async () => {
    rendered = await renderWithApp(plugin, {
      manifest,
      locales,
      permissions: ["certificates.use"],
      hosts: [{ id: "7", name: "apps", ip: "10.0.0.7", port: 22 }],
      api: {
        get: vi.fn(async () => ({
          data: [
            {
              hostId: 7,
              certs: [{ name: "example.com", client: "certbot", daysLeft: 5 }],
              checkedAt: "",
            },
          ],
        })),
      } as never,
    });
    expect(rendered.registered.extensions("homepage.widgets")).toEqual([
      "certificates_expiring_widget",
    ]);
    expect(manifest.contributes.uses).toContain("homepage.widgets");
    const fields = (
      manifest.contributes.settings as {
        host: { fields: Array<{ key: string }> };
      }
    ).host.fields.map((f) => f.key);
    expect(fields).toContain("showPanel");
    rendered.renderExtension(
      "homepage.widgets",
      "certificates_expiring_widget",
      "view",
      { widget: { title: null }, config: {} },
    );
    expect(await screen.findByText("example.com")).toBeTruthy();
  });

  it("lists certificates with days left", async () => {
    rendered = await renderWithApp(plugin, {
      manifest,
      locales,
      api: api(status),
    });
    rendered.renderTab("certificates", { isVisible: true, host });
    expect(await screen.findByText("example.com")).toBeTruthy();
    expect(screen.getByText("3 days left")).toBeTruthy();
  });

  it("opens a certificate and reads its chain", async () => {
    rendered = await renderWithApp(plugin, {
      manifest,
      locales,
      api: api(status),
    });
    rendered.renderTab("certificates", { isVisible: true, host });
    fireEvent.click(await screen.findByText("example.com"));
    expect(await screen.findByText("AA:BB")).toBeTruthy();
    expect(screen.getByText(locales.certs.revoke)).toBeTruthy();
  });

  it("offers to install certbot", async () => {
    rendered = await renderWithApp(plugin, {
      manifest,
      locales,
      api: api({ ...status, certbot: "" }),
    });
    rendered.renderTab("certificates", { isVisible: true, host });
    expect(await screen.findByText(locales.install.button)).toBeTruthy();
  });

  it("shows the renewal setup", async () => {
    rendered = await renderWithApp(plugin, {
      manifest,
      locales,
      api: api(status),
    });
    rendered.renderTab("certificates", { isVisible: true, host });
    fireEvent.click(await screen.findByText(locales.tab.viewRenewal));
    expect(await screen.findByText(locales.renewal.timer)).toBeTruthy();
  });

  it("colors by days left", () => {
    expect(expiryTone(-1, 14)).toBe("destructive");
    expect(expiryTone(14, 14)).toBe("warning");
    expect(expiryTone(40, 14)).toBe("success");
    expect(expiryTone(null, 14)).toBe("muted");
  });
});
