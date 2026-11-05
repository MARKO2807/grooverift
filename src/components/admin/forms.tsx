"use client";

import { useActionState, useEffect, useId } from "react";
import { useTranslations } from "next-intl";
import { setFlagAction, setRoleAction } from "@/lib/admin/actions";
import type { FormState } from "@/lib/auth/actions";
import { ROLES } from "@/lib/auth/roles";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";

// Success is confirmed by a toast; an error stays in the page as an alert (components §4.9, §4.10).

export function RoleForm({ userId, role, name }: { userId: string; role: string; name: string }) {
  const t = useTranslations("admin.members");
  const tr = useTranslations("roles");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(setRoleAction, {});
  const toast = useToast();
  const id = useId();
  useEffect(() => {
    if (state.ok) toast.show(t("roleChanged"));
  }, [state, toast, t]);
  return (
    <form action={action} className="form-stack" style={{ gap: "var(--gr-space-2)" }}>
      <div className="flex items-center gap-2">
        <input type="hidden" name="userId" value={userId} />
        <label htmlFor={id} className="sr-only">
          {t("setRole")}: {name}
        </label>
        <select
          id={id}
          name="role"
          className="select"
          defaultValue={role}
          style={{ minWidth: "9rem" }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {tr(r)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary btn-sm">
          {t("setRole")}
        </button>
      </div>
      {state.error ? (
        <Notice kind="error">
          {state.error === "cannotSelf" ? t("cannotSelf") : te(state.error)}
        </Notice>
      ) : null}
    </form>
  );
}

export function FlagForm({
  flagKey,
  state: current,
  note,
}: {
  flagKey: string;
  state: "on" | "off" | "paused";
  note: string;
}) {
  const t = useTranslations("admin.flags");
  const te = useTranslations("authErrors");
  const [state, action] = useActionState<FormState, FormData>(setFlagAction, {});
  const toast = useToast();
  const id = useId();
  useEffect(() => {
    if (state.ok) toast.show(t("saved"));
  }, [state, toast, t]);
  return (
    <form action={action} className="form-stack" style={{ gap: "var(--gr-space-2)" }}>
      <div className="flex items-center gap-2">
        <input type="hidden" name="key" value={flagKey} />
        <input type="hidden" name="note" value={note} />
        <label htmlFor={id} className="sr-only">
          {t("state")}: {flagKey}
        </label>
        <select
          id={id}
          name="state"
          className="select"
          defaultValue={current}
          style={{ minWidth: "8rem" }}
        >
          <option value="on">{t("on")}</option>
          <option value="off">{t("off")}</option>
          <option value="paused">{t("paused")}</option>
        </select>
        <button type="submit" className="btn btn-secondary btn-sm">
          {t("set")}
        </button>
      </div>
      {state.error ? <Notice kind="error">{te(state.error)}</Notice> : null}
    </form>
  );
}
