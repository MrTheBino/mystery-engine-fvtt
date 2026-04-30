import { extractPack } from "@foundryvtt/foundryvtt-cli";

console.log("working directory: " + process.cwd());

await extractPack("./packs/example-characters", "./src/packs/example-characters", { nedb: false,log: true,documentType: "Actor" });
await extractPack("./packs/system-documentation", "./src/packs/system-documentation", { nedb: false,log: true,documentType: "Journal" });