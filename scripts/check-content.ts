// Checks that what the repository holds could be anyone's: samples and
// docs name no real machine, network or person. `pnpm check:content`; part
// of `pnpm check:quick`.
//
// - No absolute path under a real home folder (`/Users/<name>`,
//   `/home/<name>`, `C:\Users\<name>`): samples use `~/…` or a
//   placeholder user.
// - No private network address (10.x, 172.16–31.x, 192.168.x).
// - No email address but at a placeholder domain.
// - Text in other scripts (Chinese, Japanese, Korean, full-width forms)
//   only in stories, tests and docs, where it tests or shows a language;
//   code and comments elsewhere are English.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const placeholderUsers = new Set(["someone", "sam", "runner", "user"])
const placeholderDomains =
  /(^|\.)(example\.(com|org|net)|example|acme\.dev|agent\.local|anthropic\.com)$/
const otherScripts =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uff00-\uffef]/
const scriptsAllowed = /^(src\/stories\/|src\/test\/|docs\/)/

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(
    (file) =>
      file &&
      file !== "pnpm-lock.yaml" &&
      !file.startsWith("public/r/") &&
      file !== "scripts/check-content.ts"
  )

const problems: string[] = []
for (const file of files) {
  let text: string
  try {
    text = readFileSync(file, "utf8")
  } catch {
    continue
  }
  if (text.includes("\0")) continue
  text.split("\n").forEach((line, index) => {
    const at = `${file}:${index + 1}`
    for (const [, user] of line.matchAll(
      /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)([\w.-]+)/g
    ))
      if (!placeholderUsers.has(user!))
        problems.push(`${at}: a real home folder ("${user}"); use ~/…`)
    for (const [address] of line.matchAll(
      /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g
    ))
      problems.push(`${at}: a private network address (${address})`)
    for (const [address, domain] of line.matchAll(
      /\b[\w.+-]+@((?:[\w-]+\.)+[a-z]{2,})\b/gi
    ))
      if (
        !/\.(png|jpe?g|svg|webp|gif|avif)$/i.test(domain!) &&
        !placeholderDomains.test(domain!.toLowerCase())
      )
        problems.push(`${at}: an email address (${address}); use example.com`)
    if (!scriptsAllowed.test(file) && otherScripts.test(line))
      problems.push(
        `${at}: text in another script; keep it to stories, tests and docs`
      )
  })
}

if (problems.length) {
  console.error(problems.join("\n"))
  process.exit(1)
}
