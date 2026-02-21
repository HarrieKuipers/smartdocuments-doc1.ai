import { nanoid } from "nanoid";

export function generateShortId(length = 8): string {
  return nanoid(length);
}
