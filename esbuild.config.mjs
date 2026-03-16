import esbuild from "esbuild";

await esbuild.build({
  entryPoints: {
    main: "src/main.ts",
    "terminal-helper": "src/terminal/helper.ts",
  },
  bundle: true,
  outdir: "dist",
  format: "cjs",
  platform: "node",
  external: ["obsidian", "electron"],
  sourcemap: true,
  target: "es2021",
});
