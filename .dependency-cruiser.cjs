module.exports = {
  forbidden: [
    {
      name: "domain-must-stay-pure",
      severity: "error",
      from: { path: "^src/domain" },
      to: {
        path: [
          "^src/application",
          "^src/infrastructure",
          "^src/presentation",
          "^src/main\\.ts$",
        ],
      },
    },
    {
      name: "application-no-infra-or-presentation",
      severity: "error",
      from: { path: "^src/application" },
      to: { path: ["^src/infrastructure", "^src/presentation"] },
    },
    {
      name: "infrastructure-no-presentation",
      severity: "error",
      from: { path: "^src/infrastructure" },
      to: { path: ["^src/presentation", "^src/main\\.ts$"] },
    },
    {
      name: "presentation-no-infrastructure",
      severity: "error",
      from: { path: "^src/presentation" },
      to: { path: "^src/infrastructure" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
  },
};
