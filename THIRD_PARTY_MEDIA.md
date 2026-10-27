# Workshop sources and reuse terms

This record covers the media and tools in the current ten-quiz website. A source label is a publisher or contributor declaration, not signed provenance or proof of authenticity. Cached detector scores do not establish a source label. Reuse terms differ by asset; publishing this repository does not grant a general licence to everything in it.

## Tools

### Detection methods

The site displays saved outputs from these methods on the selected media bytes. It does not include their model weights, checkpoints, detector repositories, or inference environments. Method scope and score interpretation are also shown in the site's Credits view and [`lib/acknowledgements.ts`](lib/acknowledgements.ts).

| Method | Paper | Official code |
|---|---|---|
| UniversalFakeDetect | [CVPR 2023](https://openaccess.thecvf.com/content/CVPR2023/html/Ojha_Towards_Universal_Fake_Image_Detectors_That_Generalize_Across_Generative_Models_CVPR_2023_paper.html) | [Repository](https://github.com/WisconsinAIVision/UniversalFakeDetect) |
| Community Forensics | [CVPR 2025](https://openaccess.thecvf.com/content/CVPR2025/html/Park_Community_Forensics_Using_Thousands_of_Generators_to_Train_Fake_Image_CVPR_2025_paper.html) | [Repository](https://github.com/JeongsooP/Community-Forensics) |
| SPAI | [CVPR 2025](https://openaccess.thecvf.com/content/CVPR2025/html/Karageorgiou_Any-Resolution_AI-Generated_Image_Detection_by_Spectral_Learning_CVPR_2025_paper.html) | [Repository](https://github.com/mever-team/spai) |
| AIDE | [Paper](https://arxiv.org/abs/2406.19435) | [Repository](https://github.com/shilinyan99/AIDE) |
| GenD | [Paper](https://arxiv.org/abs/2508.06248) | [Repository](https://github.com/yermandy/GenD) |
| FatFormer | [CVPR 2024](https://openaccess.thecvf.com/content/CVPR2024/html/Liu_Forgery-aware_Adaptive_Transformer_for_Generalizable_Synthetic_Image_Detection_CVPR_2024_paper.html) | [Repository](https://github.com/Michel-liu/FatFormer) |
| D3 | [ICCV 2025](https://openaccess.thecvf.com/content/ICCV2025/html/Zheng_D3_Training-Free_AI-Generated_Video_Detection_Using_Second-Order_Features_ICCV_2025_paper.html) | [Repository](https://github.com/Zig-HS/D3) |
| PwTF-DVD | [ICCV 2025](https://openaccess.thecvf.com/content/ICCV2025/html/Kim_Beyond_Spatial_Frequency_Pixel-wise_Temporal_Frequency-based_Deepfake_Video_Detection_ICCV_2025_paper.html) | [Repository](https://github.com/rama0126/PwTF-DVD) |

### Workshop-built aids

The Edges, High-pass detail, Compression comparison, JPEG residual view, video timing controls, and educational watermark lab are first-party interfaces. They help inspect or transform a preview; they are not authenticity detectors. The watermark lab illustrates simple spatial/frequency payload embedding, not a production watermark or ownership proof.

## Assets

### Quiz media, in website order

1. **Quiz 1 — synthetic valley image:** [`public/samples/01.webp`](public/samples/01.webp), by VulcanSphere, [Late Afternoon Cloudy Valley (SD3.5)](<https://commons.wikimedia.org/wiki/File:Late_Afternoon_Cloudy_Valley_(SD3.5).webp>). [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Source bytes unchanged; renamed. SHA-256 `5cedd932471ae12a16be2d9f93ec245026df76742a5509dc7dc6e95d82e49177`.

2. **Quiz 2 — authentic-class studio video:** [`public/samples/video/quiz-video-authentic-hard.mp4`](public/samples/video/quiz-video-authentic-hard.mp4), from Long Ma et al., [AIGVDBench](https://huggingface.co/datasets/AIGVDBench/AIGVDBench), whose authors source the authentic class from OpenVid-HD. The dataset card declares [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); upstream rights and capture history were not independently audited. Unchanged archive member `videos/QXqbhkHBRvA_0_70to196.mp4`, renamed. SHA-256 `7d4cc1bf7325dfd2222fd5194c05cc07ca194436489c2de53a75c0961429c036`.

3. **Quiz 3 — Sora-labelled video:** [`public/samples/video/quiz-video-synthetic-hard.mp4`](public/samples/video/quiz-video-synthetic-hard.mp4), from the same [AIGVDBench](https://huggingface.co/datasets/AIGVDBench/AIGVDBench) release. The archive labels it Sora-generated; no prompt, matched authentic clip, or signed generation record is claimed. The dataset card declares [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Unchanged archive member `0758.mp4`, renamed. SHA-256 `d557d12335e607e4fe9f05655ac6865762ac9a97596eb9f06aaec8685ba13df5`.

4. **Quiz 4 — mountain photograph:** [`public/samples/02.jpeg`](public/samples/02.jpeg), by Chaitanya Krishna, [Mountain (209011307)](<https://commons.wikimedia.org/wiki/File:Mountain_(209011307).jpeg>). [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Source bytes unchanged; renamed. Metadata lists a Google Pixel and Snapseed 2.0, but the editing steps are unknown. “Authentic” here follows the source's camera-origin label, not proof that the file was never content-edited. SHA-256 `1957aae4ddbb8d7b48f952c4f26ea709906fee0017eb3daffde9e8bc9bdaecb0`.

5. **Quiz 5 — authentic portrait:** `025_03.jpg` from Lisa DeBruine and Benedict Jones, [Face Research Lab London Set, version 5](https://figshare.com/articles/dataset/Face_Research_Lab_London_Set/5047666), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Its unchanged JPEG is embedded in [`lib/portrait-hard-pair-data.server.json`](lib/portrait-hard-pair-data.server.json); source SHA-256 `a4b10825a7a3a3c71c70ee28a2e8ca456c8c10d90fe6ea59b65b4953fff4b93f`. The authors report signed adult consent for research and presentations; the form was not obtained for this workshop.

6. **Quiz 6 — synthetic portrait:** `FLUX1_dev_image_0000336.jpg` from David Beniaguev's [SFHQ-T2I](https://www.kaggle.com/datasets/selfishgene/sfhq-t2i-synthetic-faces-from-text-2-image-models/versions/1), with an MIT licence declared by its publisher. Its unchanged JPEG is embedded in [`lib/portrait-hard-pair-data.server.json`](lib/portrait-hard-pair-data.server.json); source SHA-256 `38def3588974b9583399576830171742323111ae06ad05d7d2395017fbbadc19`. Training-data, resemblance, and output rights were not independently established. The publisher's MIT notice appears below.

7. **Quiz 7 — still-photo face swap:** [`public/samples/faceswap/faceswapai-photo-pose-neutral-v1.png`](public/samples/faceswap/faceswapai-photo-pose-neutral-v1.png), from FaceSwapAI Editorial / DeepSwap LLC, [Controlled Photo Face-Swap Pose Study v1.0.0](https://faceswapai.com/resources/photo-face-swap-pose-study) ([versioned record](https://faceswapai.com/datasets/photo-pose-study-v1.json)). The publisher declares [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and says both identities are purpose-built synthetic adults. This is vendor-published, not peer-reviewed or signed provenance; identity origin and upstream provider rights were not independently verified. Unchanged 1280 × 720 PNG; SHA-256 `1ba3d918c6c3e6f660dad8ee8edb1317ca87195ce344e36995bcf17379e0b802`.

8. **Quiz 8 — presenter-created face-swap video:** [`public/samples/faceswap/portrait-call-v2.mp4`](public/samples/faceswap/portrait-call-v2.mp4), derived from the presenter's recording using a fictional locally generated Z-Image-Turbo portrait and FaceFusion 3.8.2 HyperSwap 1a. Native box/region masking excluded the mouth and lips from the estimated mask; face boost was set to 1024 pixels. The result was downscaled and H.264-encoded at CRF 26 to 640 × 602 for a call-quality illustration, not captured from a call. Original recorded audio was retained; no voice clone or custom stabilisation was used. The presenter authorised website/repository inclusion on 11 October 2026, not general downstream reuse. SHA-256 `ee2aac5dfffb4a07bcc8206297325244ec85cbbcd1da05bf1a8a15b1c080e632`. Six sampled-frame classifiers plus D3 and PwTF-DVD were run on these bytes; the low PwTF-DVD output is inconclusive, not an authenticity finding. Private originals, the source portrait, and processing environment are not bundled.

9. **Quiz 9 — contributor-created manipulated portrait:** [`public/samples/user-cases/user-image-case-a-v1.jpg`](public/samples/user-cases/user-image-case-a-v1.jpg), from a contributor-declared AI-generated base followed by a face swap. The contributor authorised this selected participant derivative for repository/workshop distribution on 29 September 2026; no general reuse licence. It is a 1024 × 1024 high-quality 4:4:4 JPEG, without crop or resize, with metadata stripped. SHA-256 `aaa15855d3dba65a2f05b033f5b9099f9a36d7bbb912515df08ccad9701e0f24`. The [source PNG copy](source-media/quiz-09/example12_swapped.png), additionally authorised for repository inclusion on 27 October 2026, has only a resolution-metadata chunk removed; its compressed image data is unchanged. Copy SHA-256 `1c53ed57ace49d4d2d41e3b2e4d72a5d3ab55578b425c219a3c63cd10f0d3d51`; private original SHA-256 `f8281b46177f0f5e167fe2a15effc7d9f7f3d40175a9b2cc1998e554bc4370a1`. The process history was not independently replayed or signed.

10. **Quiz 10 — contributor-created camera photograph:** [`public/samples/user-cases/user-image-case-b-v2.jpg`](public/samples/user-cases/user-image-case-b-v2.jpg), declared by its contributor to show heart-shaped bokeh produced optically with a shaped aperture. The contributor authorised this selected derivative for repository/workshop distribution on 29 September 2026; no general reuse licence. Its original orientation was applied, the long edge reduced from 6240 to 4096 pixels without cropping, and metadata stripped for this 2730 × 4096 high-quality 4:4:4 JPEG. SHA-256 `ab99c80e7640b70d9f6ebe0adeb61559a32c97b6b9d7c303fcc6592579f67924`. The [original-resolution source JPEG copy](source-media/quiz-10/photo1_metadata_stripped.jpg), additionally authorised for repository inclusion on 27 October 2026, preserves the original compressed image scan and 6240 × 4160 pixel matrix. Its camera/time/serial-number metadata, XMP and other application segments were removed; a minimal EXIF orientation tag (`6`) remains to convey the intended display orientation. Copy SHA-256 `397ff67762eecd49e27fd6ab197fbaee7ec6b70be318c0de8dbb8f9fc45eafa6`; private unmodified original SHA-256 `24c02856fcebec4bf57dcf5089bb18f7c07d49d9133ed48e76589803b3743c62`. Neither its camera metadata nor the contributor label is signed capture provenance.

Quizzes 2 and 3 were purpose-selected by visual inspection before the final detector runs; Quizzes 5 and 6 were selected after examining detector outputs. None is a random benchmark sample or a general detector-accuracy estimate. The six framewise video scores do not analyse audio or motion; D3 and PwTF-DVD have different tasks and scales.

The two additional copies under [`source-media/`](source-media/) document the contributor-created sources; they are not served by the website and are not the bytes used for the saved detector scores. Their inclusion does not grant general downstream reuse rights.

### Comparison references and watermark input

- **Authentic item reference and watermark input:** [`public/experiments/watermark-888-500.png`](public/experiments/watermark-888-500.png) is the presenter's unchanged 502 × 501 yo-yo photograph, SHA-256 `5106e8e1ebace1e6f2f117c52e62d07cf0c57095a5c9fb8d523557133ce7bb8e`. It is the unwatermarked source, not a generated watermark result. Authenticity is presenter-declared; inclusion does not grant general reuse rights.
- **Authentic portrait reference:** [`public/samples/references/authentic-portrait.png`](public/samples/references/authentic-portrait.png), SHA-256 `224d0edb89671fde87ce7a89f5941509c29e1a0b3d6b203b3a206835ac935bd1`, was derived from the presenter's `portrait.jpg` (source SHA-256 `66620359c8408acfe5de6ebf043ffb1783b083a6c5caf92794ca8d83749f0eba`). The 2048 × 1535 RGB PNG was auto-oriented, fitted within 2048 × 2048 using Lanczos3, and saved without copied metadata; no crop, retouching, or AI generation. The original is outside this repository. Inclusion does not grant general reuse rights.

Both are manual comparison aids, not scored quizzes, detector inputs, matched controls, or signed capture records. The resized portrait cannot restore detail lost in its source JPEG.

### Presenter materials

- [`public/guides/hands-on-session-instruction-manual.pdf`](public/guides/hands-on-session-instruction-manual.pdf) was supplied by the presenter. Repository inclusion does not grant general reuse rights.
- The presenter-supplied slide deck is bundled on `main` only, not in this workshop branch. The deck and its embedded material are not covered by a general project-code licence.

## Branding

- [`public/branding/uq-logo.png`](public/branding/uq-logo.png) and [`public/branding/uq-cyber-logo.png`](public/branding/uq-cyber-logo.png) are user-supplied UQ/UQ Cyber screenshots for the workshop header. They are institutional branding assets, not generally reusable project media. UQ purple `#51247A` follows [UQ's video-production guide](https://elearning.uq.edu.au/files/58214/Participants%20Guide%20-%20Video%20Production.pdf); their use here is not a claim of institutional endorsement.
- [`public/favicon.svg`](public/favicon.svg) is a locally created Evidence Lab interface mark, SHA-256 `de08e08c68d49ec3937ae79f976d02e35fb8a01b7cac06102241a9452469a948`.

## Material not included

The unmodified Quiz 9 and Quiz 10 source files remain private; only their metadata-stripped copies are included under `source-media/`. The original Quiz 8 recording and generated source portrait, and the presenter's original `portrait.jpg`, are also not bundled. The site uses the selected derivatives or comparison copy above. Superseded samples, detector weights/checkpoints, local inference environments, caches, participant responses, and local database state are also excluded.

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
