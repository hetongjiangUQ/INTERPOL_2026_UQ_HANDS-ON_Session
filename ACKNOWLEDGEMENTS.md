# Acknowledgements and reproducibility

## Quiz 8 replacement — 11 October 2026

The current contributor-authorised clip uses local Z-Image-Turbo and FaceFusion
3.8.2 HyperSwap 1a; see [the media record](QUIZ8_MEDIA.md) for processing,
permissions and exact bytes. All six image classifiers plus D3 and PwTF-DVD have now run on this exact replacement; see QUIZ8_MEDIA.md. Existing
Wikimedia video measurements remain historical references only. Neither their
scores nor their CC0 declaration applies to the new clip.

## Distribution boundary

This repository contains the workshop website, teaching media intentionally approved for this distribution, and cached detector outputs bound to exact media SHA-256 values. It deliberately does **not** contain detector repositories, model weights, checkpoints, Python environments, inference caches, local databases, participant responses, private contributor source files, or GPU runtimes.

Acknowledgement is not permission. Code licences, checkpoint terms, dataset terms, output rights, and depicted-person consent are separate questions. Obtain every external asset from its official source and review the applicable terms before reproducing a run.

The two contributor-created image derivatives are included under the contributor's explicit repository/workshop authorisation confirmed on 29 September 2026; this is not a general reuse licence. The current Quiz 8 has separate contributor authorisation dated 11 October. The retired Wikimedia face-swap video is not bundled; its historical CC0 declaration does not apply to the replacement. Inclusion records the applicable permission decision and limitations; it does not independently authenticate provenance.

## Detection methods

| Method | Publication | Official repository | Workshop use |
|---|---|---|---|
| UniversalFakeDetect | [CVPR 2023 paper](https://openaccess.thecvf.com/content/CVPR2023/html/Ojha_Towards_Universal_Fake_Image_Detectors_That_Generalize_Across_Generative_Models_CVPR_2023_paper.html) | [WisconsinAIVision/UniversalFakeDetect](https://github.com/WisconsinAIVision/UniversalFakeDetect) | Whole-image synthetic-image score; sampled frames for video |
| Community Forensics | [CVPR 2025 paper](https://openaccess.thecvf.com/content/CVPR2025/html/Park_Community_Forensics_Using_Thousands_of_Generators_to_Train_Fake_Image_CVPR_2025_paper.html) | [JeongsooP/Community-Forensics](https://github.com/JeongsooP/Community-Forensics) | Multi-generator whole-image score; sampled frames for video |
| SPAI | [CVPR 2025 paper](https://openaccess.thecvf.com/content/CVPR2025/html/Karageorgiou_Any-Resolution_AI-Generated_Image_Detection_by_Spectral_Learning_CVPR_2025_paper.html) | [mever-team/spai](https://github.com/mever-team/spai) | Spectral/context whole-image score |
| AIDE | [ICLR 2025 author paper](https://arxiv.org/abs/2406.19435) | [shilinyan99/AIDE](https://github.com/shilinyan99/AIDE) | Noise-plus-semantic whole-image score |
| GenD | [WACV 2026 paper](https://arxiv.org/abs/2508.06248) | [yermandy/GenD](https://github.com/yermandy/GenD) | Face-manipulation score on detected face crops |
| FatFormer | [CVPR 2024 paper](https://openaccess.thecvf.com/content/CVPR2024/html/Liu_Forgery-aware_Adaptive_Transformer_for_Generalizable_Synthetic_Image_Detection_CVPR_2024_paper.html) | [Michel-liu/FatFormer](https://github.com/Michel-liu/FatFormer) | Whole-image forgery score |
| D3 | [ICCV 2025 paper](https://openaccess.thecvf.com/content/ICCV2025/html/Zheng_D3_Training-Free_AI-Generated_Video_Detection_Using_Second-Order_Features_ICCV_2025_paper.html) | [Zig-HS/D3](https://github.com/Zig-HS/D3) | Unbounded temporal statistic for fully generated video |
| PwTF-DVD | [ICCV 2025 paper](https://openaccess.thecvf.com/content/ICCV2025/html/Kim_Beyond_Spatial_Frequency_Pixel-wise_Temporal_Frequency-based_Deepfake_Video_Detection_ICCV_2025_paper.html) | [rama0126/PwTF-DVD](https://github.com/rama0126/PwTF-DVD) | Temporal face-forgery output on tracked face clips |

The displayed outputs have different training tasks and scales. They must not be averaged, treated as votes, or presented as a common probability of authenticity.

## Media

Quiz and comparison-reference source records, declared reuse terms, exact SHA-256 values, transformations and caveats are listed in [`THIRD_PARTY_MEDIA.md`](THIRD_PARTY_MEDIA.md). Current media credits are available in the running site under **Admin → Credits**.

## First-party workshop functions

Browser zoom, Edges, High-pass detail, Compression comparison, JPEG residual view, frame stepping, and watermark exercises are teaching interfaces. They expose features or controlled transformations but do not establish authenticity. A valid signature, watermark, source label, detector output, or file hash answers a different question; none should be collapsed into a single truth score.
