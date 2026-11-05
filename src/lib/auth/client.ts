"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import type { Auth } from "./auth";
import { ac, roles } from "./roles";

// Browser-side client. The base URL is same-origin; cookies carry the session.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>(), twoFactorClient(), adminClient({ ac, roles })],
});

export type AuthClient = typeof authClient;
