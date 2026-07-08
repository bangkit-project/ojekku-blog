import { defineMiddleware } from "astro:middleware";
import { getIdEquivalentPath } from "./lib/locale-path";

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return context.redirect(getIdEquivalentPath(context.url), 301);
  }
  return next();
});
