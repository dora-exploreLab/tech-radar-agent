import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/core/agent.ts", "src/core/harness.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  target: "node22",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
