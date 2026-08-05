import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://akizukidenshi.com/catalog/cart/cart.aspx",
      },
    },
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
  },
});
