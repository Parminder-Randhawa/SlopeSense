import { existsSync } from "node:fs";
import { chromium } from "playwright";
export function launchBrowser() {
  const localChrome =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const executablePath =
    process.env.CHROME_PATH ||
    (!process.env.CI && existsSync(localChrome) ? localChrome : undefined);
  return chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
}
export function disableWebGL() {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (type === "webgl" || type === "webgl2" || type === "experimental-webgl")
      return null;
    return original.call(this, type, ...args);
  };
}
