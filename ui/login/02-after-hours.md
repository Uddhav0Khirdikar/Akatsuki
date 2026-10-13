# 02 — After Hours

[Open the composition study](visuals/02-after-hours.svg).

**The image in your head**

An illustrated city sits under rain after sunset. A crimson cloud sign reflects in a wet rooftop surface. The left side feels expansive and cinematic; on the right, a warm, solid panel creates a quiet place to sign in. The atmosphere suggests late-night ideas, ambitious students, and people building together after class.

The Akatsuki reference comes from the rain-city mood, red clouds, and silhouette language. The illustration is an original scene with its own composition.

**Desktop composition**

Give the scene about 62% of the viewport and the login area 38%. Use a firm vertical boundary with a fine muted-red edge. The login panel fills the viewport height rather than floating as a glass card.

The artwork has three depth layers: a quiet distant skyline, midground industrial rooftops, and a dark foreground ledge. Put the crimson sign slightly left of center, away from all text. Frame a broad area of calm sky for the headline: **“Good things start after class.”** Under it: “Find your next project, role, or collaborator on campus.”

Anchor the wordmark at the top of the login panel. Place the shared form in the upper-middle region with a 368–400px maximum width. Keep service information at the bottom of the panel in the normal reading flow on short screens.

**Material, color, and type**

Use deep blue-black `#0C1119`, slate `#263442`, fog `#A8B1BA`, sign red `#D84459`, and warm ivory `#F5F0E8`. The red reflection can be saturated; the rest of the artwork should have restrained color.

Explore a compact display sans such as Sora for the headline, with a neutral UI sans for the form. Match the form surface to the darkest area of the illustration, but preserve a visible boundary. Use softly rounded inputs and a single solid red button.

**The signature detail**

The cloud appears twice: clearly in the distant sign and abstractly in its broken reflection. This gives depth and makes the scene distinctive without repeating logos across the page. A small foreground sticker can carry the word “CREATE” as artwork, while the actual product explanation remains real text.

**Mobile transformation**

Use a short panoramic art crop above the form. Preserve the red sign and one reflection, eliminating skyline detail that becomes visual noise. The shared form fills the remaining width on an opaque background. A returning-user treatment can reduce the scene to a 96px brand strip.

Do not position the form over the illustrated city on mobile. The keyboard should simply scroll the solid form region into view.

**Interaction and states**

Begin with a static scene. A later motion study can add one slow reflected-light change or a very subtle rain layer confined to the art. Provide a pause mechanism for persistent decorative motion and a static reduced-motion version. No sound, lightning flashes, simulated weather widgets, or pointer-following camera.

Loading and failure stay inside the login panel. Never dim the complete scene so much that error text loses contrast. Successful authentication can fade the artwork briefly as navigation begins, without adding a forced wait.

**Art brief and assets**

Commission or generate a wide original illustration with a reserved text zone and separately planned mobile crop. Deliver skyline, sign, reflection, and foreground as separable layers only if motion testing justifies it. The form must render before the artwork. Keep a small static image as the low-bandwidth fallback.

**What carries into the app**

Fog and slate tones can soften large empty states. The cloud sign becomes a compact brand mark. The city should mostly stay on the entry page, while its typography and palette continue through the product.

**Risks and refinement questions**

Atmosphere may overpower the product or suggest an entertainment site. The illustration is also the largest art and performance investment. Test comprehension with the scene visible for five seconds, then ask students what they expect after signing in.

**Prototype priority:** exploratory. This has the strongest cinematic potential, but the illustration must earn its cost through a memorable, readable first impression.
