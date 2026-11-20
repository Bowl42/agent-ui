// Points README.md's install addresses at a release:
// `node scripts/readme-version.ts v0.1.17`. Run it, commit and push, then
// release that version: the Release workflow refuses a version README.md
// does not name, so an app copying the README never installs an old one.
import { readFileSync, writeFileSync } from "node:fs"

const version = process.argv[2]
if (!version || !/^v\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node scripts/readme-version.ts vX.Y.Z")
  process.exit(1)
}
const address =
  /(raw\.githubusercontent\.com\/Bowl42\/agentui\/)v\d+\.\d+\.\d+\//g
const readme = readFileSync("README.md", "utf8")
if (!address.test(readme)) {
  console.error("README.md has no release address to change.")
  process.exit(1)
}
writeFileSync("README.md", readme.replace(address, `$1${version}/`))
console.log(`README.md's addresses are at ${version}.`)
