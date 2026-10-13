# 05 — Cloud Passage

[Open the composition study](visuals/05-cloud-passage.svg).

**The image in your head**

A huge crimson cloud silhouette cuts through a black canvas, leaving a calm dark opening in its center. The login form sits in that opening, perfectly upright and readable. The cloud extends beyond the viewport so its rounded lobes become the architecture of the page. The result feels bold and almost spatial despite using very few elements.

The identity is immediate: the red cloud itself determines the composition. The form is the central destination.

**Desktop composition**

Use a centered composition rather than a conventional split screen. The wordmark sits at the top left and the descriptor at the top right. A large cloud-inspired shape spans roughly 1100–1300px behind a 400px central form area.

Build the cloud as a thick, irregular outline or layered silhouette with a large dark central void. Keep an uninterrupted rectangular region around all text and controls; the decorative outline can suggest a shape without forcing content to fit its exact curves.

Place a short campaign line above the opening: **“Step into your next chapter.”** The form beneath uses the shared content. At the bottom, a simple horizontal line of product verbs—“Discover · Collaborate · Build”—grounds the invitation in the actual app.

Let the crimson shape crop off the lower-right edge. Maintain enough black margin elsewhere that the page feels intentional rather than filled with a giant logo. Avoid placing separate cloud icons on top of the giant cloud.

**Material, color, and type**

Use deep ink `#111114`, crimson `#C52640`, dark wine `#761A2F`, and warm white `#F7F0EA`. A narrow second contour in wine can create a shallow layered-paper effect. Keep shadows broad and minimal.

Explore a sturdy grotesk with expressive lowercase for the headline and a conventional UI sans for fields. The form's heading is smaller than the perimeter graphic, but its contrast and central placement make it the first actionable object.

**The signature detail**

The cloud's lower curl points toward the sign-in button while remaining outside the form's quiet rectangle. This creates a visual path from brand to action without arrows, blinking, or animation.

**Mobile transformation**

Convert the giant shape into two cropped edge fragments: one near the header and one at the lower side of the page. The central form becomes a normal full-width column. This is a separate composition using the same shapes, not a miniature desktop cloud.

When the keyboard opens, the fragments remain background decoration and can move out of view naturally. They must never cover text, consume touch events, or create horizontal overflow. On very narrow screens, one fragment is sufficient.

**Interaction and states**

A short initial reveal can expose the contour, but the form is present from the start. Use no zoom-through animation on submit; that could feel disorienting and add unnecessary delay. Success can simply soften the red contour as the next screen appears.

Reserve enough quiet vertical space for two lines of field error and a service notice. At enlarged text sizes, expand the page and loosen the decorative composition rather than clipping the form to its initial dimensions.

**Art brief and assets**

Create a custom cloud silhouette with a legible dark opening, two contour layers, and desktop/mobile arrangements. Use vector artwork with all form text kept outside the asset. Produce a flat-color version first; add shallow depth only if it improves the form's separation.

**What carries into the app**

Use cropped corners of the same silhouette in empty states, onboarding, and occasional section banners. The product's everyday screens inherit the restrained surfaces and crimson actions rather than giant background shapes.

**Risks and refinement questions**

The giant silhouette can overpower the page or limit form growth. It needs careful optical balance at different widths. Test error states and 200% zoom early. Compare a thick outline against a broad filled silhouette to find the version that preserves more breathing room.

**Prototype priority:** medium-high. This is the most direct graphic statement and a good candidate for a striking, lightweight login page.
