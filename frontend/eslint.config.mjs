import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@next/next/no-img-element": "off",
      "@next/next/no-assign-module-variable": "off",
      "prefer-const": "warn",
      "react/display-name": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },
];

export default eslintConfig;
