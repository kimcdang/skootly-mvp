# Skool Integration Policy Assessment

## Current evidence

Skool’s current platform policy says users should refrain from scraping data or making automation requests and prohibits bot-driven posting, commenting, and messaging. This applies to a browser implementation that collects page content without an official permission path.

The Chrome Web Store listing for **Skool on Easy Mode | Skoot CRM** identifies a separate developer named Garrett and links to `skootcrm.com`; the listing does not state that the extension is developed, promoted, approved, or partnered by Skool itself. Its listed capabilities are creator-facing onboarding, follow-up, DMs, tagging, and payment-failure/cancellation workflows, not lesson transcript export.

The `skool.com/skoot` page is a private, paid community listed as “By Garrett F,” rather than an official Skool product or partner directory entry. The existence of the community and Chrome extension does not supersede Skool’s published platform policy.

## Decision rule

Skootly will not claim Skool approval based on the existence of this third-party extension. We will only implement a Skool browser extension if an official Skool policy, API documentation, written partner permission, or direct statement specifically permits the proposed transcript and homework capture behavior.

Until then, the compliant product path is user-supplied learning context: manual transcript/caption import, owner-provided exports, or a future official integration. Any recommendation can link a user back to the original lesson and suggest user-authored progress updates or questions, but it must not automatically post, comment, message, crawl, or retrieve hidden data.

## Current implementation boundary

No official Skool statement in the sources above verifies that Skoot CRM is a Skool partner or grants third parties permission to capture lesson transcripts. **Skootly therefore treats the third-party extension as neither approval nor precedent.**

| Area | Skootly currently permits | Skootly does not do |
| --- | --- | --- |
| Hosts | Store a user-pasted HTTPS lesson or group link, including a `skool.com` URL, as an outbound destination. | Request, inspect, enumerate, crawl, or scrape any Skool host or hidden API. |
| Data | User-pasted transcript/caption text, homework, lesson title, source date, and a creator-provided export the user is authorized to import. | Browser cookies, credentials, member profiles, private discussion content, direct DOM extraction, or background sync. |
| User action | Explicit manual import, review, source pause/delete, homework completion, and a user-clicked return link. | Automatic navigation to private settings, automated upload, post, comment, message, reply, or follow-up. |
| Engagement | A Skoot can encourage an authentic, user-authored homework completion, progress update, focused question, or discussion reply when the imported material asks for it. | Manufacturing activity, scripted engagement, bulk messaging, or automating community interactions. |

If Skool publishes a relevant API, partner agreement, or written authorization, this decision can be revisited with the documented scope as the upper boundary.

## Sources

1. [Skool Platform Policy](https://help.skool.com/article/179-platform-policy)
2. [Skool on Easy Mode | Skoot CRM — Chrome Web Store](https://chromewebstore.google.com/detail/skool-on-easy-mode-skoot/dlhacdibagpkbncekcdalificbgfkhjj?hl=en)
3. [Skoot | CRM for skool](https://www.skool.com/skoot/about)
