# Login exploration — shared brief

**The ambition**

Make the first encounter with Akatsuki feel like discovering a campus collective with a strong creative identity. The page should be recognizable in a screenshot, clear within a few seconds, and comfortable on a phone. A returning student should be able to sign in immediately.

Explore six different compositions, materials, and emotional tones. Each direction needs enough specificity that a designer can produce a high-fidelity screen without inventing the entire concept again.

**What the page must communicate**

1. This is Akatsuki, a campus opportunity and collaboration hub.
2. Students can find roles, build teams, and talk directly with opportunity creators.
3. College ERP credentials are used for access.
4. The next action is signing in.

The Akatsuki inspiration should read through crimson clouds, cloak-like contrasts, collective symbolism, and deliberate graphic shapes. The concept must also make sense to students unfamiliar with the series. Keep lore in optional flavor and artwork; field labels and errors use plain language.

**The fixed content for comparisons**

Use the same form in all six concepts so visual exploration does not change the underlying task:

| Item | Proposed text or behavior |
| --- | --- |
| Wordmark | AKATSUKI |
| Product descriptor | Campus opportunities. Built by students. |
| Form heading | Your next chapter starts here. |
| Form introduction | Sign in with your college ERP account. |
| First field label | ERP username |
| First field helper | Use the username you use on your college ERP. |
| Second field label | Password |
| Visibility control | Show password / Hide password |
| Primary action | Sign in |
| Supporting product copy | Find opportunities, build a team, and talk to the people behind it. |
| Identity explanation | We use your ERP account to confirm your campus identity. |
| Service relationship | Akatsuki is a student project and is separate from the college ERP portal. |

Username is the current API's field; do not narrow it to email or roll number without verifying accepted identifiers. Additional Google, GitHub, or local-account buttons would change the product decision and dilute this first exploration.

First-time and returning ERP users currently share the same backend login route. Do not introduce a separate multi-step registration flow for visual interest. A brief post-login identity check can happen after successful authentication.

A working ERP recovery URL should be verified before adding “Forgot password?” as a link. Until then, explain that ERP account recovery is handled through the college portal. Likewise, help and privacy links need real destinations before implementation.

**Trust and information hierarchy**

Place the brand first, the product purpose second, and the login action within immediate reach. Show the short identity explanation near the form. Keep detailed service information below it or in a genuine help destination.

Do not promise that passwords are never processed or stored without verifying the complete implementation. Do not display campus approval marks, security certification, online-student counts, or live opportunity statistics without evidence.

Illustrative opportunity cards in a composition must be clearly labeled as examples. They should help explain the product rather than impersonate a live feed. Form submission must remain visually dominant over any illustrative card.

**Form behavior shared by every concept**

| State | Visible response | Behavior |
| --- | --- | --- |
| Initial | Persistent labels and one clear action | Form usable immediately, even before artwork finishes loading |
| Keyboard focus | High-contrast outline and clear caret | Logical tab order; no focus captured by decoration |
| Missing required field | Inline instruction associated with that field | Move focus to the first invalid field after submission |
| Submitting | Button reads “Signing in…” with compact activity indicator | Prevent duplicate submission; avoid fake progress percentages |
| Invalid credentials | “Those ERP details didn't work. Check your username and password.” | Preserve username and let the student correct the form |
| ERP unavailable | “The college ERP isn't responding. Try again in a moment.” | Keep form usable; separate service failure from bad credentials |
| Offline | Clear connection message | Preserve username; avoid a permanent loading state |
| Rate limit, if returned | Explain retry timing when supplied by the server | Do not invent a countdown |
| Session expired | “Your session ended. Sign in to continue.” | Preserve the intended destination |
| Success | Brief acknowledgment, then navigation | Show success only after authentication succeeds |

Keep passwords out of saved drafts, local storage, URLs, analytics, and design recordings. Password-manager autofill and paste should work. Field errors must survive text zoom without overlapping artwork. Use polite live announcements for submission status and appropriate error announcements.

**Desktop and mobile composition rules**

Explore desktop at 1440 × 900 and compact laptop at 1280 × 720. Typical form width is 360–420px, with 48–52px fields and generous spacing. Use 16px input text on mobile.

Explore mobile at 390 × 844 and stress-test 320px width. Aim to show the first field without scrolling; prioritize the complete form over preserving the desktop hero. Allow vertical scrolling at larger text sizes. The keyboard must not cover the focused field or trap the submit action behind a fixed panel.

Artwork, background, and form need separate layers. Inputs sit on an opaque, readable surface. A composition can be asymmetrical while the form remains straightforward. Provide a useful static state with reduced motion and a complete fallback when the artwork fails.

**Motion direction**

One short reveal can establish atmosphere, but fields are available from the start. Ambient animation is optional; it cannot run across the form, flash, respond to every keystroke, or depend on pointer movement. Returning sessions should have a quiet entry.

Prototype still screens before motion. If a design only feels distinctive while moving, strengthen its composition first.

**What each prototype should contain**

- A desktop first-visit screen and a mobile first-visit screen.
- A compact returning-user treatment using the same design language.
- Keyboard focus, invalid credentials, unavailable ERP, submitting, and success variants.
- Long helper text and enlarged-text examples.
- A still-art fallback and reduced-motion behavior.

**How we choose**

Evaluate immediate product comprehension, form clarity, Akatsuki recognizability, youth appeal, mobile quality, implementation cost, and the ability to extend the language into Explore and Messages. Ask students what they think the app does before telling them. Compare fans and non-fans.

The first decision is which visual territory deserves refinement. It is not a commitment to every color or decorative detail in its initial study.
