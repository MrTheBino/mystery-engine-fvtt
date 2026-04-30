import { compilePack } from "@foundryvtt/foundryvtt-cli";

console.log("working directory: " + process.cwd());

await compilePack("./src/packs/example-characters", "./packs/example-characters", { nedb: false,log: true });
await compilePack("./src/packs/system-documentation", "./packs/system-documentation", { nedb: false,log: true });