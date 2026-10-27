# Workshop image and video sources

## Authentic comparison references — 13 October 2026

User requested these two personal photographs as manual-only references beside
the quizzes. They are labelled authentic on the presenter's declaration, not
signed capture provenance; they are not additional quizzes or detector inputs.
This local website inclusion is not a general third-party reuse licence.

- Item: existing `public/experiments/watermark-888-500.png`, an unchanged copy of
  the supplied `888_500.png` (502 × 501; 436,401 bytes; SHA-256
  `5106e8e1ebace1e6f2f117c52e62d07cf0c57095a5c9fb8d523557133ce7bb8e`).
  This is the unwatermarked source fixture, not a watermark-lab output.
- Portrait: `public/samples/references/authentic-portrait.png` (2048 × 1535 RGB;
  2,040,890 bytes; SHA-256
  `224d0edb89671fde87ce7a89f5941509c29e1a0b3d6b203b3a206835ac935bd1`).
  Derived from the supplied `portrait.jpg`, SHA-256
  `66620359c8408acfe5de6ebf043ffb1783b083a6c5caf92794ca8d83749f0eba`.
  Sharp auto-orientation then fit-inside 2048 × 2048, no enlargement, default
  Lanczos3 resizing, PNG output without copied metadata. No crop, retouching or
  AI generation. Original stays outside the repo unchanged. Resizing affects
  fine detail; the PNG does not restore detail lost in the original JPEG.

Both references use the same browser preview/inspection processing as quizzes.
They illustrate normal variation, not matched experimental controls or a benchmark.

## Other bundled assets

The presenter-supplied instruction manual is included at
`public/guides/hands-on-session-instruction-manual.pdf`; its inclusion does not
grant a general reuse licence.

- **Header logos:** `public/branding/uq-logo.png` and `uq-cyber-logo.png` are the two user-supplied UQ/UQ Cyber screenshots, copied unchanged for the requested workshop header. Branding/trademark assets are not licensed under any general project-code licence. UQ purple is `#51247A`, consistent with [UQ's video-production guide](https://elearning.uq.edu.au/files/58214/Participants%20Guide%20-%20Video%20Production.pdf). Logo use here is not a claim of institutional endorsement.

- **Quiz 8:** `public/samples/faceswap/portrait-call-v2.mp4` is derived from the presenter's own recording using a fictional locally generated Z-Image-Turbo portrait and FaceFusion 3.8.2 HyperSwap 1a. Face boost was set to 1024 pixels; native box/region masking excluded the mouth and lips from the estimated mask, without guaranteeing pixel-exact preservation. The result was bicubically downscaled and H.264-encoded at CRF 26 to 640 × 602 as a call-quality illustration, not an actual conferencing capture. Original recorded audio was retained; no voice clone or custom stabilisation was used. The presenter approved this derivative for website/repository inclusion on 11 October 2026, not general downstream reuse. The 279,124-byte file has SHA-256 `ee2aac5dfffb4a07bcc8206297325244ec85cbbcd1da05bf1a8a15b1c080e632`. Six framewise image classifiers plus D3 and PwTF-DVD were run on these exact bytes; their records are in `lib/controlled-video-detectors.server.json` and `lib/video-sequence-evidence.server.json`. The low PwTF-DVD output remains an inconclusive model result, not an authenticity finding. Private originals, source portrait, weights and processing environment are not bundled.
- **Watermark lab:** `public/experiments/watermark-888-500.png` is the presenter's unchanged 502 × 501 yo-yo photograph, also used as the authentic item reference. It is not a watermark output. Website/repository inclusion is approved; no general reuse licence. SHA-256 `5106e8e1ebace1e6f2f117c52e62d07cf0c57095a5c9fb8d523557133ce7bb8e`.

The table below lists only current bundled third-party quiz media. Labels are
documented by the source publisher or creator; they are not signed provenance.
Cached detector outputs do not establish a source label.

| Workshop asset | Credit and source | Declared terms | SHA-256 / changes |
|---|---|---|---|
| `public/samples/01.webp` | VulcanSphere, [Late Afternoon Cloudy Valley (SD3.5)](<https://commons.wikimedia.org/wiki/File:Late_Afternoon_Cloudy_Valley_(SD3.5).webp>) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | `5cedd932471ae12a16be2d9f93ec245026df76742a5509dc7dc6e95d82e49177`; unchanged bytes, renamed |
| `public/samples/02.jpeg` | Chaitanya Krishna, [Mountain (209011307)](<https://commons.wikimedia.org/wiki/File:Mountain_(209011307).jpeg>) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | `1957aae4ddbb8d7b48f952c4f26ea709906fee0017eb3daffde9e8bc9bdaecb0`; unchanged bytes, renamed |
| `public/samples/video/quiz-video-authentic-hard.mp4` | Long Ma et al., [AIGVDBench](https://huggingface.co/datasets/AIGVDBench/AIGVDBench); authentic class sourced by the authors from OpenVid-HD | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) as declared by the dataset card | `7d4cc1bf7325dfd2222fd5194c05cc07ca194436489c2de53a75c0961429c036`; unchanged archive member `videos/QXqbhkHBRvA_0_70to196.mp4`, renamed. Purpose-selected by visual inspection before the final detector run because its studio appearance can look synthetic. Upstream rights, capture history and label were not independently audited. |
| `public/samples/video/quiz-video-synthetic-hard.mp4` | Long Ma et al., [AIGVDBench](https://huggingface.co/datasets/AIGVDBench/AIGVDBench); archive labels the generator as Sora | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) as declared by the dataset card | `d557d12335e607e4fe9f05655ac6865762ac9a97596eb9f06aaec8685ba13df5`; unchanged archive member `0758.mp4`, renamed. Purpose-selected by visual inspection before the final detector run because the reading scene appears stable and plausible. No prompt, matched authentic source or signed generation provenance is claimed. |
| Portrait D, embedded in `lib/portrait-hard-pair-data.server.json` | Lisa DeBruine and Benedict Jones, [Face Research Lab London Set, version 5](https://figshare.com/articles/dataset/Face_Research_Lab_London_Set/5047666) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | `a4b10825a7a3a3c71c70ee28a2e8ca456c8c10d90fe6ea59b65b4953fff4b93f`; unchanged `025_03.jpg`. The authors report signed adult consent for research and presentations. |
| Portrait E, embedded in `lib/portrait-hard-pair-data.server.json` | David Beniaguev, [SFHQ-T2I](https://www.kaggle.com/datasets/selfishgene/sfhq-t2i-synthetic-faces-from-text-2-image-models/versions/1), FLUX1.dev sample 0000336 | MIT, as declared by the publisher | `38def3588974b9583399576830171742323111ae06ad05d7d2395017fbbadc19`; unchanged `FLUX1_dev_image_0000336.jpg`. Upstream training-data, resemblance, and output rights were not independently established. |
| `public/samples/faceswap/faceswapai-photo-pose-neutral-v1.png` | FaceSwapAI Editorial / DeepSwap LLC, [Controlled Photo Face-Swap Pose Study v1.0.0](https://faceswapai.com/resources/photo-face-swap-pose-study); [versioned data record](https://faceswapai.com/datasets/photo-pose-study-v1.json) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) as declared by the publisher | `1ba3d918c6c3e6f660dad8ee8edb1317ca87195ce344e36995bcf17379e0b802`; unchanged 1280 × 720 neutral PNG. The publisher states that source and target are purpose-built synthetic adult identities. The record is vendor-published, not peer reviewed or signed provenance; the identity claim was not independently verified, the upstream provider/model and its rights are undisclosed, and the generation was not replayed. |
| `public/samples/user-cases/user-image-case-a-v1.jpg` | Workshop contributor; private source retained outside this repository | Creator-authorised repository/workshop distribution, confirmed 29 September 2026; no general reuse licence | `aaa15855d3dba65a2f05b033f5b9099f9a36d7bbb912515df08ccad9701e0f24`; 90,822-byte, 1024 × 1024 high-quality 4:4:4 JPEG derived without resizing or cropping from a private 1,547,040-byte PNG (`f8281b46177f0f5e167fe2a15effc7d9f7f3d40175a9b2cc1998e554bc4370a1`), with metadata stripped. The contributor declares an AI-generated portrait base followed by a face swap and states that they created and authorised the case. The process was not independently replayed and the record is not signed provenance. |
| `public/samples/user-cases/user-image-case-b-v2.jpg` | Workshop contributor; private source retained outside this repository | Creator-authorised repository/workshop distribution, confirmed 29 September 2026; no general reuse licence | `ab99c80e7640b70d9f6ebe0adeb61559a32c97b6b9d7c303fcc6592579f67924`; 771,048-byte, 2730 × 4096 high-quality 4:4:4 JPEG derived from a private 10,394,864-byte Fujifilm JPEG (`24c02856fcebec4bf57dcf5089bb18f7c07d49d9133ed48e76589803b3743c62`). The source orientation was applied, the long edge was resized from 6240 to 4096 pixels without cropping, and metadata was stripped. The contributor declares an authentic camera photograph with optically shaped heart bokeh and states that they created and authorised the case. Camera metadata and the contributor label are not signed capture provenance. |
| `public/favicon.svg` | First-party Evidence Lab interface mark | Project source | `de08e08c68d49ec3937ae79f976d02e35fb8a01b7cac06102241a9452469a948`; locally created navy rounded square with a white “E”, used only as interface chrome |

The portrait pair was purpose-selected after detector-output inspection. It must not be presented as a random sample, benchmark, accuracy estimate, or general measure of detector performance.

## Material intentionally not published here

This Git-ready repository still excludes private source material and non-selected working-site cases:

- The contributor's private source PNG and Fujifilm JPEG are not bundled. Only the selected participant derivatives above are included under the contributor's scoped authorisation.
- Superseded and experimental samples, local detector repositories, checkpoints, virtual environments, caches, participant responses and the local D1 database are not part of this distribution.

The repository contains cached detector measurements only. It contains no model weights or checkpoints; official method links appear in the site's Admin → Credits view and `lib/acknowledgements.ts`.

## Interpretation of camera-origin labels

“Authentic” in this workshop is a source-based camera-origin classification,
not a guarantee of an untouched file. “Real photo edited” refers to changes to
depicted content rather than routine colour adjustment, resizing, compression
or metadata removal. Quiz 4's source metadata lists Google Pixel and Snapseed
2.0; the editing steps are unknown. Its unchanged download is not necessarily
untouched camera output, and its answer key is not independent verification
that content edits are absent. Quiz 10's selected derivative includes orientation
correction, resizing and JPEG re-encoding, not merely metadata removal.

## SFHQ-T2I publisher-provided MIT notice

```text
MIT License

Copyright (c) 2024 David Beniaguev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
