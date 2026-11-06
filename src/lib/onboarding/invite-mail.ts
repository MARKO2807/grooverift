// The invitation email (ADM-03), in the language the admin chose. Plain text, as every account email until A7.
// It carries the link only: no name of the inviter and nothing about the invitee beyond the address it goes to.
import type { Mail } from "@/lib/auth/email";
import { INVITE_TTL_DAYS } from "@/lib/data/invitations";

export function inviteLink(appUrl: string, locale: "hr" | "en", token: string): string {
  return `${appUrl}${locale === "en" ? "/en" : ""}/invite/${token}`;
}

export function inviteMail(to: string, locale: "hr" | "en", link: string): Mail {
  if (locale === "en") {
    return {
      to,
      subject: "Your invitation to the GrooveRift alpha",
      text: [
        "You are invited to GrooveRift, a place for people who live music. One question a day for everyone, your Music DNA, and people with different tastes.",
        "",
        `Accept the invitation (valid ${INVITE_TTL_DAYS} days, for this address only):`,
        link,
        "",
        "This is a closed alpha: some things are still missing and may change. GrooveRift is for adults (18+).",
        "If you did not expect this invitation, you can ignore this message; nothing happens without the link.",
      ].join("\n"),
    };
  }
  return {
    to,
    subject: "Tvoja pozivnica za GrooveRift alfu",
    text: [
      "Imaš pozivnicu za GrooveRift, mjesto za ljude koji žive glazbu. Svaki dan jedno pitanje za sve, tvoj Music DNA i ljudi različitih ukusa.",
      "",
      `Prihvati pozivnicu (vrijedi ${INVITE_TTL_DAYS} dana, samo za ovu adresu):`,
      link,
      "",
      "Ovo je zatvorena alfa: neke stvari još nedostaju i mogu se promijeniti. GrooveRift je za punoljetne (18+).",
      "Ako ti pozivnica nije bila namijenjena, zanemari poruku; bez poveznice se ništa ne događa.",
    ].join("\n"),
  };
}
