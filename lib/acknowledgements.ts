export type DetectorAcknowledgement={
  name:string;
  publication:string;
  paper:string;
  repository:string;
  scope:string;
  scoreMeaning:string;
};

export const WEIGHT_POLICY={
  heading:'No model weights or checkpoints are included',
  summary:'This website serves cached scalar outputs bound to exact media SHA-256 values. Detector repositories, weights, checkpoints, Python environments and GPU runtimes are deliberately excluded.',
  warning:'A link or acknowledgement is not permission to redistribute or use an asset. Code licences, checkpoint terms, dataset terms and depicted-person consent are separate questions.',
} as const;

export const EVIDENCE_SEPARATION=[
  'Manual inspection aids expose pixels, frames or file processing; they do not establish authenticity.',
  'Cached detector outputs are model-specific measurements on exact bytes; they are not votes or a shared probability scale.',
  'Documented source labels provide controlled ground truth for discussion but are not automatically signed provenance.',
  'A watermark or signed provenance record answers a different question from passive forensic detection. Missing provenance never proves authenticity.',
] as const;

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

export const CURRENT_MEDIA_TITLES=new Set([
  'Late Afternoon Cloudy Valley (SD3.5).webp',
  'Mountain (209011307).jpeg',
  'AIGVDBench — difficult authentic studio clip (video evidence A)',
  'AIGVDBench — Sora-generated reading clip (video evidence B)',
  'Face Research Lab London Set — portrait stress case D',
  'SFHQ-T2I — portrait stress case E',
  'Identity evidence A — controlled still-photo face swap',
  'Quiz 8 — contributor-authorised portrait video (v2)',
  'Watermark lab — yo-yo photograph',
  'Authentic comparison reference — presenter portrait',
  'Image evidence C — user-supplied manipulated portrait',
  'Image evidence D — user-supplied camera photograph',
]);
