# Quiz 8 — accepted replacement, 11 October 2026

Current exercise: `quiz-faceswap-video-v2`.
Participant file: `public/samples/faceswap/portrait-call-v2.mp4`.
SHA-256: `ee2aac5dfffb4a07bcc8206297325244ec85cbbcd1da05bf1a8a15b1c080e632`.
Size: 279,124 bytes; 640 × 602 H.264/AAC, approximately 3.8 seconds.

The presenter supplied and identified the original recording as their own.
A fictional adult East Asian portrait generated locally using Z-Image-Turbo
(seed 5206) supplied the replacement face. FaceFusion 3.8.2, HyperSwap 1a,
1024 pixel boost and native box/region masking produced the swap. Mouth and
lip regions were excluded from the estimated mask; this is not a guarantee
of pixel-exact mouth preservation. No face enhancer or custom stabilisation
was used. Original recorded audio was retained, not cloned or synthesised.
Ordinary bicubic downscaling and H.264 CRF 26 compression simulate call quality;
this is not an actual conferencing-platform capture.

The presenter accepted this derivative and explicitly requested its website
and repository inclusion on 11 October 2026. This is scoped contributor
authorisation, not a blanket downstream reuse licence or an assurance that
all upstream model licences permit every use. Private originals, source
portrait, models and processing environments are excluded from the repository.

On 11 October, all six image classifiers were run on eight uniformly sampled
decoded frames of these exact bytes. Separate D3 and PwTF-DVD inference ran on
the RTX 5090. Results are in `lib/controlled-video-detectors.server.json` and
the version-2 case in `lib/video-sequence-evidence.server.json`.
The replaced Wikimedia video's
scores and historical answers remain attached to `quiz-faceswap-video-v1`.
Runtime session projection replaces that retired ID without rewriting the
stored historical configuration or answers. Historical evidence retained in
the repository is not evidence for the new video.

The processing record and source label are not signed provenance, a learned
detector finding, or independent proof of authenticity. No live deployment
or Git operation is part of this replacement.

## Actual detection run

The six classifier scores are each that model's mean over eight frames, not
votes or a shared confidence scale. Their full checkpoint/preprocessing records
and individual timestamps remain in the packaged JSON. No audio was analysed.

D3 returned **5.379194259643555**, using 16 frames sampled at 8 fps, starting at
zero (approximately the first two seconds). Its unbounded temporal statistic
targets fully generated video; this face-swap result is outside that primary
task and is not a face-swap verdict.

PwTF-DVD returned **0.00416635237662576**, the mean over 82 overlapping 32-frame
clips (stride 1), one tracked face and 113 decoded frames. Higher leans toward
face forgery, but this is not a calibrated probability. The low output despite
the known swap is retained without alteration. It does not establish why the
model missed the manipulation or its accuracy on other examples.

The reviewed runner uses strict checkpoint loading, offline assets and actual
FP32 CUDA inference. Runtime: RTX 5090, 32,607 MiB, driver 591.86, Torch
2.7.1+cu128. Compatibility/instrumentation adaptations are recorded, not claimed
as a bit-exact reproduction of every author environment. The inherited raw
PwTF protocol description says “native60fps”; that description is stale:
this input has approximately 30.05 fps and all 113 native frames were used.
No 60-fps conversion was applied. Source-result and runner hashes bind the
packaged records to the retained private technical audit. No weights are bundled.
