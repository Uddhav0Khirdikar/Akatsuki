# Selected direction — Crimson Hour

The user-supplied reference replaces the earlier schematic directions as the primary visual target: detailed Itachi artwork, crimson maple leaves, dark violet surfaces, layered depth, and polished animation.

**Implemented composition**

The left side is a cinematic character scene with live typography near its lower edge. The right side holds a translucent dark login panel with a fine crimson highlight and a clear ERP form. The two areas blend through atmospheric gradients instead of a hard split. The mobile layout gives the scene a shorter opening, followed by the complete form.

The visual layers are independently controlled: optimized hero artwork, a separate foreground foliage asset, grain, shadow gradients, a real 3D metal cloud emblem, lit drifting petals, and small particles. Pointer movement adds a small amount of parallax; touch devices keep a stable composition. The motion toggle and reduced-motion preference stop ambient movement.

**Artwork status**

The image-generation skill's API fallback was attempted with the provided reference and [this complete prompt](artwork-prompt.txt), using `gpt-image-2`, high quality, and a 1536 × 1024 target. The API returned `credit_balance_exhausted`, so no generated image was produced.

The working page uses the existing red-maple Itachi artwork found in the reference, with source details in [asset provenance](../../../frontend/public/assets/README.md). It is a sourced illustration plus custom asset processing and 3D work. It is not an original generated illustration or a fully modeled 3D character.

**Review artifacts**

- [Desktop screenshot](screenshots/desktop.png)
- [Mobile screenshot](screenshots/mobile.png)
- [Frontend source and run instructions](../../../frontend/README.md)

**Functional boundaries**

The form connects to the existing ERP endpoint. Browser validation uses intercepted test responses for error and success states; it does not authenticate a real student's ERP account. Successful sign-in displays the returned identity within the page. Further application screens remain outside this login task.

The next visual refinement should happen against this working page, with attention to character crop, text contrast, mobile form placement, and the subtlety of the metal and particle animation.
