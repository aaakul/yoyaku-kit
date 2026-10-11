import type ja from "./messages/ja.json";

type Messages = typeof ja;

declare global {
  // Use type safe message keys with `next-intl`
  interface IntlMessages extends Messages {}
}
