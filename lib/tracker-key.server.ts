import type {ReconsideredSelection} from './domain.ts';
// Source/process labels, NEVER inferred from detector scores. Exact media bindings
// prevent silently grading a replacement file with the old answer key.
export const TRACKER_KEY: Record<string,{sha256:string; selections:ReconsideredSelection[]; basis:string}> = {
 'quiz-first-look': {sha256:'5cedd932471ae12a16be2d9f93ec245026df76742a5509dc7dc6e95d82e49177',selections:['synthetic_generation'],basis:'Bundled source-example-01 generation record.'},
 'quiz-video-authentic-hard': {sha256:'7d4cc1bf7325dfd2222fd5194c05cc07ca194436489c2de53a75c0961429c036',selections:['authentic_capture'],basis:'Public dataset authentic source label; video-sequence-evidence.server.json.'},
 'quiz-video-synthetic-hard': {sha256:'d557d12335e607e4fe9f05655ac6865762ac9a97596eb9f06aaec8685ba13df5',selections:['synthetic_generation'],basis:'Public dataset generated-video source label; video-sequence-evidence.server.json.'},
 'quiz-image-five': {sha256:'1957aae4ddbb8d7b48f952c4f26ea709906fee0017eb3daffde9e8bc9bdaecb0',selections:['authentic_capture'],basis:'Source-labelled camera-origin photograph. Source metadata lists Google Pixel and Snapseed 2.0; the editing steps are unknown. Authentic is the workshop source-based classification, not a claim of an untouched file or independently verified absence of content edits.'},
 'quiz-portrait-d': {sha256:'a4b10825a7a3a3c71c70ee28a2e8ca456c8c10d90fe6ea59b65b4953fff4b93f',selections:['authentic_capture'],basis:'Face Research Lab London Set participant 025; publisher source label.'},
 'quiz-portrait-e': {sha256:'38def3588974b9583399576830171742323111ae06ad05d7d2395017fbbadc19',selections:['synthetic_generation'],basis:'SFHQ-T2I FLUX1.dev sample 0000336; publisher source label.'},
 'quiz-faceswap-still-v3': {sha256:'1ba3d918c6c3e6f660dad8ee8edb1317ca87195ce344e36995bcf17379e0b802',selections:['synthetic_generation','face_swap'],basis:'FaceSwapAI publisher record: face swap between synthetic source and target portraits.'},
 'quiz-faceswap-video-v2': {sha256:'ee2aac5dfffb4a07bcc8206297325244ec85cbbcd1da05bf1a8a15b1c080e632',selections:['face_swap'],basis:'Controlled FaceFusion swap into real recorded video. Generated source face does not make the whole video fully synthetic.'},
 'quiz-user-image-a-v1': {sha256:'aaa15855d3dba65a2f05b033f5b9099f9a36d7bbb912515df08ccad9701e0f24',selections:['synthetic_generation','face_swap'],basis:'User-declared Z-Image full-image generation followed by FaceFusion.'},
 'quiz-user-image-b-v2': {sha256:'ab99c80e7640b70d9f6ebe0adeb61559a32c97b6b9d7c303fcc6592579f67924',selections:['authentic_capture'],basis:'User-declared camera photograph with optical heart-shaped bokeh. Displayed derivative applies source orientation, resizes without cropping to 2730 × 4096, re-encodes as high-quality 4:4:4 JPEG and strips metadata; not metadata-only removal.'},
};
