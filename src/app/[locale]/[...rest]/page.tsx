import { notFound } from "next/navigation";

/** Any path without a route renders SYS-01 with HTTP 404 (IA8). */
export default function CatchAll() {
  notFound();
}
