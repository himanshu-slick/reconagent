import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer, { type Page } from "puppeteer";

export type PortalAccess = { portalUrl: string; user: string; pass: string; outDir: string };

async function signIn(page: Page, { portalUrl, user, pass }: PortalAccess) {
  await page.goto(portalUrl, { waitUntil: "networkidle0" });
  await page.type("#username", user);
  await page.type("#password", pass);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("#submit")]);
  if (!page.url().includes("/statements")) throw new Error("portal login failed");
}

// Fetch inside the page so the request carries the logged-in session cookie.
const fetchBase64 = (page: Page, href: string) =>
  page.evaluate(async (url) => {
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }, href);

export async function loginAndDownload(access: PortalAccess): Promise<Record<string, string>> {
  mkdirSync(access.outDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await signIn(page, access);
    const links = await page.$$eval("a[data-vendor]", (as) =>
      as.map((a) => ({ vendor: (a as HTMLAnchorElement).dataset.vendor!, href: (a as HTMLAnchorElement).href })),
    );
    const files: Record<string, string> = {};
    for (const { vendor, href } of links) {
      files[vendor] = join(access.outDir, `statement-${vendor}.pdf`);
      writeFileSync(files[vendor], Buffer.from(await fetchBase64(page, href), "base64"));
    }
    return files;
  } finally {
    await browser.close();
  }
}
