import { mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

// On macOS 27, Playwright's Firefox (157 and 159) exits with "Could not find
// profile folder": it still resolves ~/Library/Application Support/Firefox,
// which the OS now withholds. Pointing CoreFoundation at a scratch home lets it
// start. Drop this once a Playwright Firefox build launches without it.
export function firefoxLaunchOptions(): {
  env?: Record<string, string | undefined>
} {
  if (process.platform !== "darwin") return {}
  const home = join(tmpdir(), "agent-ui-firefox-home")
  mkdirSync(home, { recursive: true })
  return { env: { ...process.env, CFFIXED_USER_HOME: home } }
}
