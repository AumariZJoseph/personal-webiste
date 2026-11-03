# Blog maintenance

The blog is a static extension of the existing portfolio. No new build step or dependency is required.

## Add a post

1. Create `blog/<slug>/index.html` using the current article as the structural reference.
2. Add one row to `blog/index.html`. Keep the archive chronological and increment the three-digit index.
3. Add the canonical URL to the root `sitemap.xml`.
4. Use one H1, sequential H2/H3 headings, a unique description, canonical URL, and factual JSON-LD dates.

## Asset and verification status

- Original prototype photographs are included in the article and used as its social preview image.
- The original demonstration video is intentionally not published in the article.
- Original App Inventor Designer and Blocks screenshots are included beside the app explanation.
- The original `Smart_Light.aia` is now included as a public article download, as requested by the author.
- The author has now confirmed HC-06 on Uno hardware serial pins 0/RX and 1/TX, PIR OUT on D2, relay IN on D9, the relay selector on H, direct HC-06 5V/GND, and return to PIR control after Bluetooth disconnect.
- The photographs confirm VIN-to-positive-rail while Arduino 5V separately powered the HC-06. This conflicts with the exact relay being a 5V module, so retain the article’s historical-not-recommended warning.

The YouTube tutorial linked in the article is the credited source used for the first motion-sensing build; it is not embedded.

## Comments

The article loads its Utterances comment thread only after a reader clicks **Load comments**. Comments map to the article pathname in `AumariZJoseph/personal-webiste`. The repository must remain public with Issues enabled, and the Utterances GitHub App must be granted access to the repository.

## Safety and historical accuracy

- Keep the household-load foundation attributed to the original tutorial. Do not independently invent or expand mains wiring instructions; retain the qualified-help note.
- The original Arduino sketch is unavailable; label new code as an educational reconstruction.
- The archived app verifies commands `1` and `0`, not a historical Automatic button.
- Treat return-to-automatic mode after Bluetooth disconnect as author-confirmed historical behaviour, while noting that the exact implementation cannot be reproduced without the final sketch.
