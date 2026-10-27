export type DetectorAcknowledgement={
  name:string;
  publication:string;
  paper:string;
  repository:string;
  scope:string;
  scoreMeaning:string;
};

export const DETECTORS:readonly DetectorAcknowledgement[]=[
  {name:'UniversalFakeDetect',publication:'CVPR 2023',paper:'https://openaccess.thecvf.com/content/CVPR2023/html/Ojha_Towards_Universal_Fake_Image_Detectors_That_Generalize_Across_Generative_Models_CVPR_2023_paper.html',repository:'https://github.com/WisconsinAIVision/UniversalFakeDetect',scope:'Whole-image synthetic-image classifier; video use here scores sampled frames independently.',scoreMeaning:'Raw 0–1 output: higher leans synthetic under this model. It is not a calibrated probability.'},
  {name:'Community Forensics',publication:'CVPR 2025',paper:'https://openaccess.thecvf.com/content/CVPR2025/html/Park_Community_Forensics_Using_Thousands_of_Generators_to_Train_Fake_Image_CVPR_2025_paper.html',repository:'https://github.com/JeongsooP/Community-Forensics',scope:'Whole-image classifier trained across many generators; video use here remains framewise.',scoreMeaning:'Raw 0–1 output: higher leans synthetic under this model. It is not a calibrated probability.'},
  {name:'SPAI',publication:'CVPR 2025',paper:'https://openaccess.thecvf.com/content/CVPR2025/html/Karageorgiou_Any-Resolution_AI-Generated_Image_Detection_by_Spectral_Learning_CVPR_2025_paper.html',repository:'https://github.com/mever-team/spai',scope:'Whole-image spectral/context synthetic-image detector.',scoreMeaning:'Raw 0–1 output: higher leans synthetic. Spectral evidence is not a manipulation map.'},
  {name:'AIDE',publication:'ICLR 2025',paper:'https://arxiv.org/abs/2406.19435',repository:'https://github.com/shilinyan99/AIDE',scope:'Whole-image detector combining noise and semantic evidence.',scoreMeaning:'Displayed class-1 softmax output leans fake as it increases; it is not calibrated.'},
  {name:'GenD',publication:'WACV 2026',paper:'https://arxiv.org/abs/2508.06248',repository:'https://github.com/yermandy/GenD',scope:'Face-manipulation classifier applied to a detected face crop.',scoreMeaning:'Raw 0–1 manipulation output: higher leans manipulated. A missing usable face yields no result.'},
  {name:'FatFormer',publication:'CVPR 2024',paper:'https://openaccess.thecvf.com/content/CVPR2024/html/Liu_Forgery-aware_Adaptive_Transformer_for_Generalizable_Synthetic_Image_Detection_CVPR_2024_paper.html',repository:'https://github.com/Michel-liu/FatFormer',scope:'Whole-image synthetic/forgery classifier.',scoreMeaning:'Displayed binary softmax class-1 output leans forged as it increases; it is not calibrated.'},
  {name:'D3',publication:'ICCV 2025',paper:'https://openaccess.thecvf.com/content/ICCV2025/html/Zheng_D3_Training-Free_AI-Generated_Video_Detection_Using_Second-Order_Features_ICCV_2025_paper.html',repository:'https://github.com/Zig-HS/D3',scope:'Training-free method aimed at fully generated video.',scoreMeaning:'Unbounded second-order temporal statistic. Higher is more real-like within a controlled same-task comparison; there is no universal threshold.'},
  {name:'PwTF-DVD',publication:'ICCV 2025',paper:'https://openaccess.thecvf.com/content/ICCV2025/html/Kim_Beyond_Spatial_Frequency_Pixel-wise_Temporal_Frequency-based_Deepfake_Video_Detection_ICCV_2025_paper.html',repository:'https://github.com/rama0126/PwTF-DVD',scope:'Temporal face-forgery detector operating on tracked face clips.',scoreMeaning:'Mean sigmoid-transformed fake-class output across clips. Higher is more face-forgery-like, but it is not a calibrated probability.'},
] as const;

/** The order is the visible Quiz 1–10 order, not the source-manifest order. */
export const CURRENT_QUIZ_MEDIA_CREDITS=[
  {quizId:'quiz-first-look',assetTitle:'Late Afternoon Cloudy Valley (SD3.5).webp'},
  {quizId:'quiz-video-authentic-hard',assetTitle:'AIGVDBench — difficult authentic studio clip (video evidence A)'},
  {quizId:'quiz-video-synthetic-hard',assetTitle:'AIGVDBench — Sora-generated reading clip (video evidence B)'},
  {quizId:'quiz-image-five',assetTitle:'Mountain (209011307).jpeg'},
  {quizId:'quiz-portrait-d',assetTitle:'Face Research Lab London Set — portrait stress case D'},
  {quizId:'quiz-portrait-e',assetTitle:'SFHQ-T2I — portrait stress case E'},
  {quizId:'quiz-faceswap-still-v3',assetTitle:'Identity evidence A — controlled still-photo face swap'},
  {quizId:'quiz-faceswap-video-v2',assetTitle:'Quiz 8 — contributor-authorised portrait video (v2)'},
  {quizId:'quiz-user-image-a-v1',assetTitle:'Image evidence C — user-supplied manipulated portrait'},
  {quizId:'quiz-user-image-b-v2',assetTitle:'Image evidence D — user-supplied camera photograph'},
] as const;

export const CURRENT_MEDIA_TITLES=new Set([
  ...CURRENT_QUIZ_MEDIA_CREDITS.map(item=>item.assetTitle),
  'Watermark lab — yo-yo photograph',
  'Authentic comparison reference — presenter portrait',
]);
