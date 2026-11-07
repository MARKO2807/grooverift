# Security review: step 5.11 images and the 5.7 remainder

- **Date:** 2026-11-07 (session 40)
- **Scope:** commits `42a58cd` to `463801f`: uploads and re-encoding, object storage, `/api/media`, artist photos from Wikidata and Commons, the PUB-11 photo reasons, member images in answers and comments with moderation, images in the data copy and the purge, artist cards and CAT-01 mentions, impersonation off.
- **Method:** independent read-only review by the `security-reviewer` subagent of the whole `src` diff and the modules it calls, plus a memory probe of sharp 0.35.5 with the exact pipelines of `src/lib/media/process.ts`. Fixes by Claude in the main session, with tests.
- **Result:** 1 high, 5 medium, 5 low, 5 info. The high, every medium marked "before merge" and four lows are fixed; the rest is recorded below.

## Findings and what was done

| ID | Finding | Status |
|---|---|---|
| H1 | **Decoder memory:** a flat 40 MP PNG of 166 KB took about 260 MB to decode; two or three uploads at once could exhaust the 512 MB web instance. | **Fixed.** `sharp.cache(false)`, `sharp.concurrency(1)`, one image decoded at a time per process with a queue of four (past it the member is told "busy, try again in a minute"), the pixel limit lowered to 24 MP. Unit test: seven parallel decodes → five done, two busy. |
| M1 | **Anyone could hide and delete any artist photo** through PUB-11 (`photoArtist` any id, `csam` made contact details optional, the hide deleted our copy). | **Fixed.** A notice hides a photo at once only with the notifier's name and email and a category other than `csam`; the hide is soft (not served, our copy kept, so "Vrati fotografiju" needs no new download); at most ten notice hides in 24 hours across all notifiers, after that notices only queue. The admin's own "Sakrij fotografiju" still deletes the copy at once. DB test: soft hide, show again keeps the same copy, the daily cap. |
| M2 | **Artist picks** triggered MusicBrainz lookups and catalogue inserts before any rate limit or ownership check (an edit of someone else's answer could queue five lookups and fail afterwards). | **Fixed.** Picks resolve only to artists we already store or that this process just showed in a search answer (`knownArtistFromMbid`, never a MusicBrainz request); a `cards` rate limit (60 per hour) is consumed before resolving; an edit checks that the answer is the member's own first. |
| M3 | **Production fell back to local disk** when an R2 value was missing (images on the ephemeral disk, outside the approved EU store). | **Fixed.** `storeKind()` throws in production without all four R2 values (unless the e2e flag allows the folder); `MEDIA_STORE=file` stays refused in production by `env.ts`. |
| M4 (a) | The moderation copy is taken at the first report; an image added later is not in it. | **Open, recorded.** Append a copy when a report joins an open case and the object's image changed. |
| M4 (b) | "Remove only the image" removed the current image but recorded the copy's one; the removed image could be swept within hours. | **Fixed.** The current image is read under `FOR UPDATE`, removed and recorded as `removed_image_id`; images named by a decision whose appeal window is open are held from `dropMedia` and the sweep; staff see that image through the case. |
| M4 (c) | Profile reports do not capture the profile photo. | **Open, recorded.** Put the photo id in profile copies and allow profile photos on the case path. |
| M5 | The data copy is built in the web process; up to 45 MB of images plus zip and bytea encoding could reach 200–250 MB. | **Mitigated.** Image budget lowered to 20 MB (copy cap 25 MB); images past it are listed with `file: null`. **Open:** build copies only in the worker or stream them to R2. |
| L1 | An overturned appeal could put an image back on a post deleted meanwhile. | **Fixed.** The restore requires the post not deleted and not removed. |
| L2 | A photo refresh could store a new copy under a row hidden meanwhile. | **Fixed.** The upsert only writes when the row is not hidden; otherwise the new copy is dropped and the result is "hidden". |
| L3 | Artist photos were cached publicly for a day plus a week stale. | **Fixed.** `public, max-age=3600`. |
| L4 | The 6 MB server-action body limit applies to every action, including signed-out ones. | **Accepted, recorded.** Revisit by moving uploads to a route handler with its own streaming limit. |
| L5 | A failure in writing the cards after the answer or comment was stored reported the post as failed. | **Fixed.** The post and its cards are written in one transaction. |
| Info | An object can be orphaned if the process dies between the upload and the row insert; `?case=` image loads rely on the case page's evidence log; the Commons download reads the whole body when there is no Content-Length (fixed host); `impersonate-admins` is not in Better Auth's admin statements (nothing to remove); image reports jump to priority 0 by design (D-121 (4)). | Recorded. An R2 lifecycle rule or a periodic list-and-compare would catch orphans. |

## Checked and sound (from the review)

- `/api/media`: one 404 for every refusal with `private, no-store`; `nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `Cross-Origin-Resource-Policy: same-origin`, `Content-Disposition: inline`, the content type from the database; member images `private, max-age=300` with `Vary: Cookie`; the proxy matcher skips `/api`.
- The policy follows the parent for every kind; visitors and blocked pairs never get member images; staff without a second factor count as members; the policy change only lets staff see an image when they may see its parent.
- The `?case=` path needs case access and a copy or decision of that case naming that image.
- No IDOR: clients never send a media id; unique indexes on every parent column; edits and deletes are scoped to the author.
- Uploads: format sniffed and matched to the decoder (polyglots refused), SVG, HTML, GIF and HEIC refused before decoding, `failOn: "error"`, first frame only, WebP without metadata, `file.size` checked before reading, crop clamped, the description cleaned and capped with a database check.
- Storage keys are checked (no path traversal); R2 errors carry only the status code; objects are never public.
- The Commons client calls only the fixed Wikidata and Commons hosts and downloads only from `https://upload.wikimedia.org` with `redirect: "error"`; Commons metadata is plain text, links are rebuilt for Commons and Creative Commons only, no `dangerouslySetInnerHTML`.
- Admin hide and show: admin with a second factor, active, rate-limited, reason required, audited.
- The purge erases images before its transaction, but a restore is refused once the request is due, so there is no race with a cancel.
- Impersonation: `impersonate` is removed from the admin role; `/admin/impersonate-user` answers 403.

## Tests after the fixes

`npm run check` (unit tests including the decoder queue), `npm run test:db` (media, post images, the soft hide and the daily cap, the removed image held and restored), and the e2e specs `images`, `drops`, `safety`, `account`, `artists`. Results are in `docs/STATUS.md` for session 40.
