import { db } from '../db/db'
import type {
  Concept,
  ElementType,
  HiddenDetailType,
  NoteKind,
  PaperPage,
  PlanStepStatus,
  ResourceLink,
} from '../db/types'
import { verifyAnchor } from './anchors'
import { deleteProjectData } from './projectData'

export const RESNET_EXAMPLE_PROJECT_TITLE = 'Deep Residual Learning（ResNet on CIFAR-10）'
export const RESNET_ARXIV_URL = 'https://arxiv.org/abs/1512.03385'

/** 仅内置原文关键句，供离线定位、引文校验与界面演示使用。 */
export const RESNET_EXAMPLE_PAGES: PaperPage[] = [
  {
    page: 1,
    text: [
      'Deep Residual Learning for Image Recognition',
      'Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun',
      'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.',
      'We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.',
      'We provide comprehensive empirical evidence showing that these residual networks are easier to optimize, and can gain accuracy from considerably increased depth.',
      'We also present analysis on CIFAR-10 with 100 and 1000 layers.',
    ].join('\n\n'),
  },
  {
    page: 2,
    text: [
      '1. Introduction',
      'Deep convolutional neural networks have led to a series of breakthroughs for image classification.',
      'Driven by the significance of depth, a question arises: Is learning better networks as easy as stacking more layers?',
      'When deeper networks are able to start converging, a degradation problem has been exposed: with the network depth increasing, accuracy gets saturated and then degrades rapidly.',
      'Unexpectedly, such degradation is not caused by overfitting, and adding more layers to a suitably deep model leads to higher training error.',
    ].join('\n\n'),
  },
  {
    page: 3,
    text: [
      '3. Deep Residual Learning',
      '3.1 Residual Learning',
      'Let us consider H(x) as an underlying mapping to be fit by a few stacked layers, with x denoting the inputs to the first of these layers.',
      'Rather than expect stacked layers to approximate H(x), we explicitly let these layers approximate a residual function F(x) := H(x) − x.',
      'The original function thus becomes F(x) + x.',
      'If the added layers can be constructed as identity mappings, a deeper model should have training error no greater than its shallower counterpart.',
    ].join('\n\n'),
  },
  {
    page: 4,
    text: [
      '3.2. Identity Mapping by Shortcuts',
      'We adopt residual learning to every few stacked layers. A building block is defined as y = F(x, {Wi}) + x.',
      'The operation F + x is performed by a shortcut connection and element-wise addition.',
      'The shortcut connections simply perform identity mapping, and their outputs are added to the outputs of the stacked layers.',
      'Identity shortcut connections add neither extra parameter nor computational complexity.',
      'The dimensions of F and x must be equal. If this is not the case, we can perform a linear projection by the shortcut connections to match the dimensions.',
    ].join('\n\n'),
  },
  {
    page: 5,
    text: [
      '3.3. Network Architectures',
      'Plain Network. Our plain baselines are mainly inspired by the philosophy of VGG nets.',
      'The convolutional layers mostly have 3×3 filters and follow two simple design rules: for the same output feature map size, the layers have the same number of filters; and if the feature map size is halved, the number of filters is doubled so as to preserve the time complexity per layer.',
      'Residual Network. Based on the above plain network, we insert shortcut connections which turn the network into its counterpart residual version.',
    ].join('\n\n'),
  },
  {
    page: 6,
    text: [
      '3.4. Implementation',
      'Our implementation for ImageNet follows the practice in previous studies.',
      'The image is resized with its shorter side randomly sampled in [256, 480] for scale augmentation. A 224×224 crop is randomly sampled from an image or its horizontal flip, with the per-pixel mean subtracted.',
      'We use SGD with a mini-batch size of 256. The learning rate starts from 0.1 and is divided by 10 when the error plateaus, and the models are trained for up to 60 × 10^4 iterations.',
      'We use a weight decay of 0.0001 and a momentum of 0.9. We do not use dropout.',
    ].join('\n\n'),
  },
  {
    page: 7,
    text: [
      '4.2. CIFAR-10 and Analysis',
      'The CIFAR-10 dataset consists of 50,000 training images and 10,000 testing images in 10 classes.',
      'We focus on the behaviors of extremely deep networks, but not on pushing the state-of-the-art results, so we intentionally use simple architectures as follows.',
      'The network inputs are 32×32 images, with the per-pixel mean subtracted.',
      'The first layer is a 3×3 convolution. Then we use a stack of 6n layers with 3×3 convolutions on the feature maps of sizes {32,16,8} respectively, with 2n layers for each feature map size.',
      'The numbers of filters are {16,32,64} respectively. The subsampling is performed by convolutions with a stride of 2.',
      'The network ends with a global average pooling, a 10-way fully-connected layer, and softmax. There are totally 6n+2 stacked weighted layers.',
    ].join('\n\n'),
  },
  {
    page: 8,
    text: [
      'When the dimensions increase, we consider two options: (A) The shortcut still performs identity mapping, with extra zero entries padded for increasing dimensions. This option introduces no extra parameter; (B) The projection shortcut is used to match dimensions, done by 1×1 convolutions.',
      'For both options, when the shortcuts go through feature maps of two sizes, they are performed with a stride of 2.',
      'The weights are initialized as in [13], and Batch Normalization (BN) [16] is used after each convolution and before activation.',
      'We use a weight decay of 0.0001 and momentum of 0.9, and adopt the weight initialization and BN but with no dropout.',
      'These models are trained with a mini-batch size of 128 on two GPUs.',
      'We start with a learning rate of 0.1, divide it by 10 at 32k and 48k iterations, and terminate training at 64k iterations, which is determined on a 45k/5k train/val split.',
      'We follow the simple data augmentation in [24] for training: 4 pixels are padded on each side, and a 32×32 crop is randomly sampled from the padded image or its horizontal flip.',
      'For testing, we only evaluate the single view of the original 32×32 image.',
      'For the first 400 iterations we use a learning rate of 0.01 and then turn back to 0.1, although this is not necessary for shallower ResNets.',
    ].join('\n\n'),
  },
  {
    page: 9,
    text: [
      'Table 6. Classification error on the CIFAR-10 test set. All results are with simple data augmentation.',
      'ResNet-20 0.27M 8.75',
      'ResNet-32 0.46M 7.51',
      'ResNet-44 0.66M 7.17',
      'ResNet-56 0.85M 6.97',
      'ResNet-110 1.7M 6.43',
      'ResNet-1202 19.4M 7.93',
      'The 110-layer ResNet is able to converge well. It has fewer parameters than other deep and thin networks, yet is among the state-of-the-art results.',
      'The 1202-layer network is able to achieve training error <0.1%. Its test error is still fairly good. But there are still open questions on the optimization and regularization of such aggressively deep models.',
    ].join('\n\n'),
  },
  {
    page: 10,
    text: [
      'Analysis of Layer Responses',
      'ResNets have generally smaller responses than their plain counterparts.',
      'These results support our basic motivation that the residual functions might be generally closer to zero than the non-residual functions.',
      'We also notice that the deeper ResNet has smaller magnitudes of responses, as evidenced by the comparisons among ResNet-20, 56, and 110.',
    ].join('\n\n'),
  },
  {
    page: 11,
    text: [
      'Comparisons with State-of-the-art Methods',
      'We compare our results with the state-of-the-art methods on CIFAR-10.',
      'Our extremely deep ResNets are able to achieve compelling results without using special data augmentation or advanced regularization methods.',
      'The residual learning principle can also be applied to other image recognition tasks and architectures.',
    ].join('\n\n'),
  },
  {
    page: 12,
    text: [
      'References',
      '[13] K. He, X. Zhang, S. Ren, and J. Sun. Delving deep into rectifiers: Surpassing human-level performance on ImageNet classification.',
      '[16] S. Ioffe and C. Szegedy. Batch normalization: Accelerating deep network training by reducing internal covariate shift.',
      '[24] C.-Y. Lee, S. Xie, P. Gallagher, Z. Zhang, and Z. Tu. Deeply-supervised nets.',
      '[41] K. Simonyan and A. Zisserman. Very deep convolutional networks for large-scale image recognition.',
    ].join('\n\n'),
  },
]

export interface ResnetExampleElement {
  type: ElementType
  label: string
  value: string
  quote: string
  page: number
}

export const RESNET_EXAMPLE_ELEMENTS: ResnetExampleElement[] = [
  {
    type: 'task',
    label: 'CIFAR-10 图像分类',
    value: '在 10 类 CIFAR-10 上复现 ResNet 深度对照实验，以测试集分类错误率为核心指标。',
    quote: 'The CIFAR-10 dataset consists of 50,000 training images and 10,000 testing images in 10 classes.',
    page: 7,
  },
  {
    type: 'dataset',
    label: 'CIFAR-10 数据划分',
    value: '训练集 50,000 张、测试集 10,000 张；原实验另用 45k/5k 训练验证划分确定学习率节点。',
    quote: 'The CIFAR-10 dataset consists of 50,000 training images and 10,000 testing images in 10 classes.',
    page: 7,
  },
  {
    type: 'dataset',
    label: '简单数据增强',
    value: '每边填充 4 像素，再随机裁剪 32×32 并随机水平翻转；测试只评估原始单视图。',
    quote: 'We follow the simple data augmentation in [24] for training: 4 pixels are padded on each side, and a 32×32 crop is randomly sampled from the padded image or its horizontal flip.',
    page: 8,
  },
  {
    type: 'architecture',
    label: '残差学习 F(x)+x',
    value: '堆叠层学习相对输入的残差，而不是直接逼近无参照映射； shortcut 将输入与残差逐元素相加。',
    quote: 'The original function thus becomes F(x) + x.',
    page: 3,
  },
  {
    type: 'architecture',
    label: 'CIFAR 三组残差阶段',
    value: '32/16/8 三档特征图各含 2n 层 3×3 卷积，通道数为 16/32/64，总计 6n+2 个加权层。',
    quote: 'The network ends with a global average pooling, a 10-way fully-connected layer, and softmax. There are totally 6n+2 stacked weighted layers.',
    page: 7,
  },
  {
    type: 'architecture',
    label: '恒等与投影 shortcut',
    value: '维度增加时，方案 A 用零填充恒等映射，方案 B 用 1×1 卷积投影；跨尺寸时步长为 2。',
    quote: 'For both options, when the shortcuts go through feature maps of two sizes, they are performed with a stride of 2.',
    page: 8,
  },
  {
    type: 'training',
    label: '卷积—BN—激活顺序',
    value: '每个卷积之后、激活之前使用 Batch Normalization，并采用 He 初始化，不使用 dropout。',
    quote: 'The weights are initialized as in [13], and Batch Normalization (BN) [16] is used after each convolution and before activation.',
    page: 8,
  },
  {
    type: 'training',
    label: '深层学习率预热',
    value: '深层 CIFAR ResNet 前 400 次迭代使用 0.01，再恢复 0.1，以缓解初始训练不稳定。',
    quote: 'For the first 400 iterations we use a learning rate of 0.01 and then turn back to 0.1, although this is not necessary for shallower ResNets.',
    page: 8,
  },
  {
    type: 'hyperparam',
    label: 'SGD、batch 与正则化',
    value: 'mini-batch 128，两张 GPU，momentum 0.9，weight decay 0.0001，不使用 dropout。',
    quote: 'We use a weight decay of 0.0001 and momentum of 0.9, and adopt the weight initialization and BN but with no dropout.',
    page: 8,
  },
  {
    type: 'hyperparam',
    label: '64k 迭代学习率计划',
    value: '初始学习率 0.1，在 32k 与 48k 迭代各除以 10，64k 结束；深层网络另有 400 次预热。',
    quote: 'We start with a learning rate of 0.1, divide it by 10 at 32k and 48k iterations, and terminate training at 64k iterations, which is determined on a 45k/5k train/val split.',
    page: 8,
  },
  {
    type: 'metric',
    label: 'ResNet-20 测试错误率',
    value: '论文主表 ResNet-20 为 8.75%，参数量 0.27M，是短跑后最先对齐的基础指标。',
    quote: 'ResNet-20 0.27M 8.75',
    page: 9,
  },
  {
    type: 'metric',
    label: 'ResNet-56 / 110 测试错误率',
    value: '论文 ResNet-56 为 6.97%，ResNet-110 为 6.43%；复现应同时记录单次值和多次运行波动。',
    quote: 'ResNet-56 0.85M 6.97',
    page: 9,
  },
  {
    type: 'compute',
    label: '双 GPU 训练配置',
    value: 'CIFAR 实验使用两张 GPU 和 batch size 128；改变设备或等效 batch 时应记录缩放策略。',
    quote: 'These models are trained with a mini-batch size of 128 on two GPUs.',
    page: 8,
  },
  {
    type: 'code',
    label: '作者发布的模型代码',
    value: '作者原始实现与模型入口为 KaimingHe/deep-residual-networks；示例使用固定提交的 PyTorch 复现做对照。',
    quote: 'Deep Residual Learning for Image Recognition',
    page: 1,
  },
  {
    type: 'supplement',
    label: '层响应与千层网络分析',
    value: '补充观察显示 ResNet 响应通常更小；1202 层可低训练误差但测试误差 7.93%，不能只看深度。',
    quote: 'ResNet-1202 19.4M 7.93',
    page: 9,
  },
]

type ConceptSeed = Omit<Concept, 'id' | 'projectId' | 'dependsOn' | 'createdAt' | 'resources'> & {
  resources: ResourceLink[]
}

function resources(name: string, secondaryTitle: string, secondaryUrl: string): ResourceLink[] {
  return [
    { title: 'Deep Residual Learning for Image Recognition', url: RESNET_ARXIV_URL, tier: 'primary', provider: 'arXiv' },
    { title: secondaryTitle, url: secondaryUrl, tier: 'secondary', provider: '教材 / 文档' },
    { title: `B 站搜索：${name}`, url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(name)}`, tier: 'blog', provider: 'B 站' },
  ]
}

export const RESNET_EXAMPLE_CONCEPTS: ConceptSeed[] = [
  {
    name: '残差学习', summary: '让堆叠层拟合 F(x)=H(x)−x，再将输入加回输出。',
    whyNeeded: '这是整篇论文的优化假设，也是所有 ResNet block 与深度对照实验的共同基础。',
    difficulty: 2, mastery: 'known', resources: resources('残差学习', 'D2L：残差网络', 'https://d2l.ai/chapter_convolutional-modern/resnet.html'),
  },
  {
    name: '恒等 shortcut', summary: '不改变输入映射，直接把 block 输入加到残差支路输出。',
    whyNeeded: 'CIFAR 主实验主要使用零填充恒等连接；它会改变参数量与维度处理方式。',
    difficulty: 2, mastery: 'known', resources: resources('恒等 shortcut', 'D2L：残差块', 'https://d2l.ai/chapter_convolutional-modern/resnet.html'),
  },
  {
    name: '投影 shortcut', summary: '用可学习线性投影匹配残差支路与输入的通道或空间尺寸。',
    whyNeeded: '需要区分论文方案 A/B，避免在 CIFAR 主表中误用带参数的投影连接。',
    difficulty: 2, mastery: 'half', resources: resources('投影 shortcut', 'PyTorch ResNet 参考实现', 'https://github.com/pytorch/vision/blob/main/torchvision/models/resnet.py'),
  },
  {
    name: 'Batch Normalization', summary: '按 mini-batch 统计归一化中间激活，并使用可学习缩放与平移。',
    whyNeeded: '论文采用 conv-BN-ReLU 顺序，训练与推理时 running statistics 的行为会直接影响结果。',
    difficulty: 2, mastery: 'half', resources: resources('Batch Normalization', 'Batch Normalization 原论文', 'https://arxiv.org/abs/1502.03167'),
  },
  {
    name: 'He 初始化', summary: '按 ReLU 卷积层输入维度设置初始权重方差。',
    whyNeeded: '深层网络能否从初始迭代稳定收敛与初始化直接相关。',
    difficulty: 2, mastery: 'unknown', resources: resources('He 初始化', 'Delving Deep into Rectifiers', 'https://arxiv.org/abs/1502.01852'),
  },
  {
    name: 'SGD 与动量', summary: '用梯度更新参数，并以动量累积历史方向。',
    whyNeeded: 'batch size 128、momentum 0.9 与 weight decay 0.0001 是训练口径的一部分。',
    difficulty: 1, mastery: 'known', resources: resources('SGD momentum', 'PyTorch SGD 文档', 'https://pytorch.org/docs/stable/generated/torch.optim.SGD.html'),
  },
  {
    name: '学习率阶梯衰减', summary: '在指定训练节点把学习率乘以一个衰减系数。',
    whyNeeded: '32k/48k/64k 是迭代数而不是 epoch，数据划分变化时不能机械换算。',
    difficulty: 1, mastery: 'half', resources: resources('学习率阶梯衰减', 'PyTorch MultiStepLR 文档', 'https://pytorch.org/docs/stable/generated/torch.optim.lr_scheduler.MultiStepLR.html'),
  },
  {
    name: 'CIFAR 数据增强', summary: '边缘填充后随机裁剪，并随机水平翻转图像。',
    whyNeeded: '训练与测试预处理不一致足以造成明显的主表偏差。',
    difficulty: 1, mastery: 'half', resources: resources('CIFAR10 数据增强', 'CIFAR-10 数据集说明', 'https://www.cs.toronto.edu/~kriz/cifar.html'),
  },
  {
    name: '参数量与 FLOPs', summary: '分别衡量模型参数规模与前向计算量。',
    whyNeeded: '深度比较必须同时记录参数量；1202 层过深并不自动带来更低测试误差。',
    difficulty: 2, mastery: 'unknown', resources: resources('参数量 FLOPs', 'D2L：卷积层计算', 'https://d2l.ai/chapter_convolutional-neural-networks/channels.html'),
  },
  {
    name: '分类错误率', summary: '预测类别不等于真实类别的测试样本所占比例。',
    whyNeeded: '主表报告 error 而非 accuracy，录入指标时应设为越低越好。',
    difficulty: 1, mastery: 'known', resources: resources('分类错误率', 'CIFAR-10 数据集说明', 'https://www.cs.toronto.edu/~kriz/cifar.html'),
  },
]

export const RESNET_EXAMPLE_DEPENDENCIES: Record<string, string[]> = {
  残差学习: [],
  '恒等 shortcut': ['残差学习'],
  '投影 shortcut': ['残差学习', '恒等 shortcut'],
  'Batch Normalization': [],
  'He 初始化': [],
  'SGD 与动量': ['He 初始化'],
  学习率阶梯衰减: ['SGD 与动量'],
  'CIFAR 数据增强': ['分类错误率'],
  '参数量与 FLOPs': ['恒等 shortcut', '投影 shortcut'],
  分类错误率: [],
}

interface PlanSeed {
  milestone: string
  title: string
  detail: string
  estimatedMinutes: number
  status: PlanStepStatus
  checkpoint: string
  checkpointDone: boolean
  concepts: string[]
}

export const RESNET_EXAMPLE_PLAN: PlanSeed[] = [
  { milestone: 'L1 · 跑通官方代码', title: '固定代码、依赖与随机种子', detail: '保存仓库提交、Python/PyTorch/CUDA 版本，并固定数据顺序与模型初始化种子。', estimatedMinutes: 45, status: 'done', checkpoint: '环境清单和提交哈希已记录，同一命令可重复启动。', checkpointDone: true, concepts: ['He 初始化', 'SGD 与动量'] },
  { milestone: 'L1 · 跑通官方代码', title: '下载并核对 CIFAR-10', detail: '检查 50k/10k 数据规模、标签与像素范围，保留官方 45k/5k 划分配置。', estimatedMinutes: 45, status: 'done', checkpoint: '类别计数正确，抽样图像与标签一致，划分文件可复用。', checkpointDone: true, concepts: ['CIFAR 数据增强', '分类错误率'] },
  { milestone: 'L1 · 跑通官方代码', title: '完成 ResNet-20 短跑', detail: '先运行 100 次迭代，确认损失下降、checkpoint 恢复与测试命令均可用。', estimatedMinutes: 60, status: 'done', checkpoint: '短跑无 NaN，恢复训练后 step 连续，输出一次测试错误率。', checkpointDone: true, concepts: ['残差学习', 'Batch Normalization'] },
  { milestone: 'L2 · 对齐 CIFAR-10 主表', title: '逐层核对 ResNet-20', detail: '确认 6n+2 层、16/32/64 通道、全局平均池化与零填充恒等 shortcut。', estimatedMinutes: 75, status: 'done', checkpoint: '逐层 shape 表与参数量 0.27M 对齐，shortcut 类型无歧义。', checkpointDone: true, concepts: ['残差学习', '恒等 shortcut', '参数量与 FLOPs'] },
  { milestone: 'L2 · 对齐 CIFAR-10 主表', title: '锁定预处理与评测口径', detail: '逐像素均值、4 像素填充、随机裁剪和水平翻转只用于训练，测试使用原始单视图。', estimatedMinutes: 60, status: 'doing', checkpoint: '固定批次完成 train/test transform 快照对比，评测无随机增强。', checkpointDone: false, concepts: ['CIFAR 数据增强', 'Batch Normalization', '分类错误率'] },
  { milestone: 'L2 · 对齐 CIFAR-10 主表', title: '对齐 64k 迭代训练计划', detail: '使用 batch 128、momentum 0.9、weight decay 0.0001，在 32k/48k 衰减并记录深层预热。', estimatedMinutes: 90, status: 'doing', checkpoint: '实际日志中的学习率节点与 400 次预热逐项通过自动断言。', checkpointDone: false, concepts: ['SGD 与动量', '学习率阶梯衰减', 'He 初始化'] },
  { milestone: 'L2 · 对齐 CIFAR-10 主表', title: '训练 ResNet-20 / 56 / 110', detail: '沿用同一数据和种子策略训练三个深度，保存日志、最佳与最终 checkpoint。', estimatedMinutes: 480, status: 'todo', checkpoint: '三组实验均有完整曲线、配置、checkpoint 和单次测试错误率。', checkpointDone: false, concepts: ['残差学习', '学习率阶梯衰减', '分类错误率'] },
  { milestone: 'L2 · 对齐 CIFAR-10 主表', title: '补齐重复运行与主表', detail: '至少重复三次 ResNet-20 与 ResNet-56，记录均值、极值和标准差。', estimatedMinutes: 360, status: 'todo', checkpoint: '指标表区分单次结果和统计结果，不用单次偏差代替随机波动。', checkpointDone: false, concepts: ['分类错误率', '参数量与 FLOPs'] },
  { milestone: 'L2 · 对齐 CIFAR-10 主表', title: '归因偏差并完成复盘', detail: '按数据、超参、随机种子、硬件四类整理证据，补充论文未写全的实现细节。', estimatedMinutes: 90, status: 'todo', checkpoint: '每项主要偏差都有日志或控制变量证据，复盘字段完整。', checkpointDone: false, concepts: ['CIFAR 数据增强', '学习率阶梯衰减', 'Batch Normalization'] },
]

interface NoteSeed {
  stepTitle: string
  kind: NoteKind
  concepts: string[]
  content: string
  complete?: boolean
  hiddenDetailType?: HiddenDetailType
}

export const RESNET_EXAMPLE_NOTES: NoteSeed[] = [
  {
    stepTitle: '固定代码、依赖与随机种子', kind: 'command', concepts: ['SGD 与动量'], complete: true,
    content: '固定本地复现入口与依赖版本，先用短跑验证命令，而不是直接启动完整训练。\n\n```bash\npython train.py --dataset cifar10 --depth 20 --batch-size 128 --max-steps 100 --seed 42\n```\n\n退出码为 0，配置与日志均已保存。',
  },
  {
    stepTitle: '下载并核对 CIFAR-10', kind: 'result', concepts: ['CIFAR 数据增强', '分类错误率'], complete: true,
    content: '训练图像 50,000 张、测试图像 10,000 张，10 个类别数量一致。像素已缩放到 `[0,1]`，训练集另按固定种子拆成 45k/5k。\n\n**检查点已完成**：测试集没有参与学习率或 checkpoint 选择。',
  },
  {
    stepTitle: '逐层核对 ResNet-20', kind: 'code', concepts: ['残差学习', '恒等 shortcut', '参数量与 FLOPs'],
    content: '逐层检查得到 `3 + 3×6 + 1 = 20` 个加权层，参数量约 0.27M。跨通道阶段使用零填充，而不是框架默认的 1×1 投影。\n\n下一步将 shape 表加入测试，防止换 backbone 后静默改变主表口径。',
  },
  {
    stepTitle: '对齐 64k 迭代训练计划', kind: 'idea', concepts: ['学习率阶梯衰减', 'SGD 与动量'],
    hiddenDetailType: 'hyperparameter',
    content: '【论文没写的细节】学习率节点的实际 step 定义\n\n论文写 32k/48k iterations，但框架的 scheduler 可能按 epoch 调用。这里必须在 optimizer 每次更新后递增 scheduler，并把 64k 终止条件写成 optimizer step；若按 epoch 衰减，曲线会完全不同。',
  },
  {
    stepTitle: '锁定预处理与评测口径', kind: 'idea', concepts: ['CIFAR 数据增强', 'Batch Normalization'],
    hiddenDetailType: 'preprocessing',
    content: '【论文没写的细节】均值计算的精度与通道顺序\n\n论文只写 per-pixel mean subtracted。复现时需固定均值是在训练划分还是全部训练图像上计算、在 `[0,1]` 还是 `[0,255]` 域计算，以及 RGB 通道顺序；这些默认值不能只交给数据管道隐式决定。',
  },
  {
    stepTitle: '训练 ResNet-20 / 56 / 110', kind: 'error', concepts: ['Batch Normalization', '学习率阶梯衰减'],
    content: 'ResNet-110 初次启动时 loss 在前 100 次迭代出现 NaN。\n\n排查：数据抽样正常，梯度幅值在学习率切换到 0.1 后突增。修正为前 400 次使用 0.01，再恢复 0.1，短跑已稳定。待完整训练确认。',
  },
]

export const RESNET_EXAMPLE_METRICS = [
  { name: 'ResNet-20 · CIFAR-10 测试错误率', ours: 8.91, paperValue: 8.75, unit: '%', higherIsBetter: false },
  { name: 'ResNet-56 · CIFAR-10 测试错误率', ours: 7.08, paperValue: 6.97, unit: '%', higherIsBetter: false },
  { name: 'ResNet-110 · CIFAR-10 测试错误率', ours: 6.72, paperValue: 6.43, unit: '%', higherIsBetter: false },
  { name: 'ResNet-1202 · CIFAR-10 测试错误率', ours: 8.16, paperValue: 7.93, unit: '%', higherIsBetter: false },
]

export interface LoadResnetExampleOptions {
  reset?: boolean
}

export async function loadResnetExampleProject(
  options: LoadResnetExampleOptions = {},
): Promise<{ projectId: number; existing: boolean }> {
  return db.transaction('rw', [
    db.projects, db.papers, db.chunks, db.elements, db.concepts, db.planSteps,
    db.planVersions, db.notes, db.metrics, db.retrospectives,
  ], async () => {
    let existing = (await db.projects.toArray()).find(
      (project) => project.title === RESNET_EXAMPLE_PROJECT_TITLE,
    )
    if (existing?.id !== undefined && options.reset) {
      await deleteProjectData(existing.id)
      existing = undefined
    }
    if (existing?.id !== undefined) return { projectId: existing.id, existing: true }

    const now = Date.now()
    const projectId = await db.projects.add({
      title: RESNET_EXAMPLE_PROJECT_TITLE,
      goal: '先跑通 CIFAR-10 官方训练，再复现 ResNet-20/56/110 主表错误率，解释深度、预处理与学习率计划带来的偏差。',
      level: 'L2',
      device: '论文参考：2 GPU；示例记录：单张 12GB GPU，batch size 128',
      createdAt: now,
      updatedAt: now,
    })
    if (projectId === undefined) throw new Error('创建 ResNet 示例项目后未获得项目编号。')

    const paperId = await db.papers.add({
      projectId,
      title: 'Deep Residual Learning for Image Recognition',
      authors: ['Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun'],
      abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.',
      year: 2016,
      venue: '2016 IEEE Conference on Computer Vision and Pattern Recognition (CVPR)',
      arxivId: '1512.03385',
      url: RESNET_ARXIV_URL,
      pdfUrl: 'https://arxiv.org/pdf/1512.03385',
      source: 'arxiv',
      pageCount: 12,
      pages: RESNET_EXAMPLE_PAGES,
      pagesLabel: '770–778',
      fileName: 'Deep Residual Learning（内置关键页文本节选）.txt',
      createdAt: now,
      updatedAt: now,
    })
    if (paperId === undefined) throw new Error('创建 ResNet 示例论文后未获得论文编号。')

    await db.elements.bulkAdd(RESNET_EXAMPLE_ELEMENTS.map((element) => ({
      ...element,
      projectId,
      paperId,
      verified: verifyAnchor(RESNET_EXAMPLE_PAGES, element.page, element.quote),
      source: 'example' as const,
      createdAt: now,
    })))

    const conceptIds = new Map<string, number>()
    for (const concept of RESNET_EXAMPLE_CONCEPTS) {
      const id = await db.concepts.add({
        ...concept,
        projectId,
        dependsOn: [],
        masteryUpdatedAt: concept.mastery === 'known' ? now : undefined,
        createdAt: now,
      })
      if (id === undefined) throw new Error(`创建概念「${concept.name}」后未获得编号。`)
      conceptIds.set(concept.name, id)
    }
    for (const concept of RESNET_EXAMPLE_CONCEPTS) {
      await db.concepts.update(conceptIds.get(concept.name)!, {
        dependsOn: (RESNET_EXAMPLE_DEPENDENCIES[concept.name] ?? []).map((name) => conceptIds.get(name)!),
      })
    }

    const stepIds = new Map<string, number>()
    for (const [order, seed] of RESNET_EXAMPLE_PLAN.entries()) {
      const id = await db.planSteps.add({
        projectId,
        milestone: seed.milestone,
        version: 1,
        title: seed.title,
        detail: seed.detail,
        order,
        estimatedMinutes: seed.estimatedMinutes,
        status: seed.status,
        checkpoint: seed.checkpoint,
        checkpointDone: seed.checkpointDone,
        conceptIds: seed.concepts.map((name) => conceptIds.get(name)!),
        source: 'example',
        createdAt: now,
        updatedAt: now,
      })
      if (id === undefined) throw new Error(`创建步骤「${seed.title}」后未获得编号。`)
      stepIds.set(seed.title, id)
    }

    for (const [index, seed] of RESNET_EXAMPLE_NOTES.entries()) {
      const stepId = stepIds.get(seed.stepTitle)
      const conceptIdsForNote = seed.concepts.map((name) => conceptIds.get(name)!)
      const references = [
        ...seed.concepts.map((name) => `[@卡片：${name}](#concept-${conceptIds.get(name)})`),
        `[@步骤：${seed.stepTitle}](#step-${stepId})`,
      ].join(' · ')
      await db.notes.add({
        projectId,
        stepId,
        kind: seed.kind,
        content: `${seed.content}\n\n${references}`,
        conceptIds: conceptIdsForNote,
        stepIds: stepId === undefined ? [] : [stepId],
        completeCheckpoint: seed.complete ?? false,
        completeStep: seed.complete ?? false,
        isHiddenDetail: seed.hiddenDetailType !== undefined,
        hiddenDetailType: seed.hiddenDetailType,
        source: 'example',
        createdAt: now + index,
        updatedAt: now + index,
      })
    }

    await db.metrics.bulkAdd(RESNET_EXAMPLE_METRICS.map((metric, index) => ({
      ...metric,
      projectId,
      createdAt: now + index,
    })))

    await db.retrospectives.add({
      projectId,
      scope: '范围：CIFAR-10 简单数据增强条件下的 ResNet-20/56/110，补充 ResNet-1202 作为过深网络对照。\n目标：先完成 L1 跑通，再按论文主表口径复现 L2 分类错误率。\n边界：示例数值是内置演示数据，不代表用户本机已执行训练。',
      method: '采用 6n+2 CIFAR ResNet、零填充恒等 shortcut、conv-BN-ReLU、batch 128 和 64k optimizer steps。学习率在 32k/48k 除以 10，深层网络前 400 步以 0.01 预热。测试只使用原始 32×32 单视图。',
      results: '内置指标表：ResNet-20 示例值 8.91%（论文 8.75%），ResNet-56 为 7.08%（6.97%），ResNet-110 为 6.72%（6.43%），ResNet-1202 为 8.16%（7.93%）。所有指标均按越低越好处理。',
      deviations: '三个主要深度均比论文高 0.11～0.29 个百分点，当前只能视为待解释偏差，不能在没有重复实验时归因于随机种子。',
      dataDeviation: '已固定 50k/10k 数据与 45k/5k 划分。下一步核对逐像素均值的计算范围、数值域和 RGB 顺序，并用固定批次快照比较训练与测试 transform。',
      hyperparameterDeviation: '已确认 scheduler 按 optimizer step 更新。ResNet-110 初次 NaN 在补齐 400 步预热后消失；完整训练仍需确认 32k/48k 节点和 weight decay 实现。',
      seedDeviation: '当前示例只给出一组内置单次结果。正式复现至少重复三次，并报告均值、标准差和极值后，再评估种子造成的波动。',
      hardwareDeviation: '论文使用双 GPU，示例记录为单张 12GB GPU 但保持总 batch 128。需记录混合精度、cuDNN benchmark 与非确定性算子；不在缺乏证据时把差异直接归因于硬件。',
      difficulties: '难点：深层初始阶段稳定性、iteration 与 epoch 的 scheduler 语义、恒等 shortcut 的零填充。\n易点：ResNet-20 短跑、CIFAR 数据核对和 0.27M 参数量检查均已通过。',
      hiddenDetails: '1. 学习率 scheduler 必须跟随 optimizer step，而非默认 epoch。\n2. per-pixel mean 的计算集合、精度与通道顺序需要显式固定。\n3. CIFAR 方案 A 的零填充恒等 shortcut 不能用框架默认投影替代。',
      authorContact: '示例未联系作者。若完整复现仍有稳定偏差，先整理最小配置、三次运行日志与数据预处理快照，再形成可复现问题。',
      createdAt: now,
      updatedAt: now,
    })

    return { projectId, existing: false }
  })
}
