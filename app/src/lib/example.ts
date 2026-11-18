import { db } from '../db/db'
import type { Concept, ElementType, PaperPage, ResourceLink } from '../db/types'
import { verifyAnchor } from './anchors'

const EXAMPLE_PROJECT_TITLE = 'Attention Is All You Need（L2 复现）'
const ARXIV_URL = 'https://arxiv.org/abs/1706.03762'

const EXAMPLE_PAGES: PaperPage[] = [
  {
    page: 1,
    text: [
      'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism.',
      'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
      'Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.',
      'Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation.',
    ].join('\n\n'),
  },
  {
    page: 2,
    text: [
      '2 Background',
      'Self-attention, sometimes called intra-attention is an attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence.',
      '3 Model Architecture',
      'Most competitive neural sequence transduction models have an encoder-decoder structure.',
      'The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder.',
    ].join('\n\n'),
  },
  {
    page: 3,
    text: [
      '3.1 Encoder and Decoder Stacks',
      'The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network. We employ a residual connection around each of the two sub-layers, followed by layer normalization.',
      'The decoder is also composed of a stack of N = 6 identical layers. In addition to the two sub-layers in each encoder layer, the decoder inserts a third sub-layer, which performs multi-head attention over the output of the encoder stack.',
      '3.2 Attention',
      'An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors.',
      'We call our particular attention "Scaled Dot-Product Attention".',
    ].join('\n\n'),
  },
  {
    page: 4,
    text: [
      '3.2.2 Multi-Head Attention',
      'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.',
      'In this work we employ h = 8 parallel attention layers, or heads.',
      '3.2.3 Applications of Attention in our Model',
      'The Transformer uses multi-head attention in three different ways.',
      '3.5 Positional Encoding',
      'Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence.',
      'In this work, we use sine and cosine functions of different frequencies.',
    ].join('\n\n'),
  },
  {
    page: 5,
    text: [
      '4 Why Self-Attention',
      'Self-attention layers are faster than recurrent layers when the sequence length is smaller than the representation dimensionality.',
      '5 Training',
      '5.1 Training Data and Batching',
      'We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs.',
      'Sentences were encoded using byte-pair encoding, which has a shared source-target vocabulary of about 37000 tokens.',
      'For English-French, we used the significantly larger WMT 2014 English-French dataset consisting of 36M sentences and split tokens into a 32000 word-piece vocabulary.',
      'Sentence pairs were batched together by approximate sequence length. Each training batch contained a set of sentence pairs containing approximately 25000 source tokens and 25000 target tokens.',
    ].join('\n\n'),
  },
  {
    page: 6,
    text: [
      '5.2 Hardware and Schedule',
      'We trained our models on one machine with 8 NVIDIA P100 GPUs.',
      'For our base models using the hyperparameters described throughout the paper, each training step took about 0.4 seconds. We trained the base models for a total of 100,000 steps or 12 hours.',
      'For our big models, step time was 1.0 seconds. The big models were trained for 300,000 steps (3.5 days).',
      '5.3 Optimizer',
      'We used the Adam optimizer with β1 = 0.9, β2 = 0.98 and ϵ = 10−9.',
      'This corresponds to increasing the learning rate linearly for the first warmup_steps training steps, and decreasing it thereafter proportionally to the inverse square root of the step number. We used warmup_steps = 4000.',
      '5.4 Regularization',
      'Residual Dropout We apply dropout to the output of each sub-layer, before it is added to the sub-layer input and normalized.',
      'For the base model, we use a rate of Pdrop = 0.1.',
      'Label Smoothing During training, we employed label smoothing of value ϵls = 0.1. This hurts perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score.',
    ].join('\n\n'),
  },
  {
    page: 7,
    text: [
      '6 Results',
      '6.1 Machine Translation',
      'On the WMT 2014 English-to-German translation task, the big transformer model (Transformer (big) in Table 2) outperforms the best previously reported models (including ensembles) by more than 2.0 BLEU, establishing a new state-of-the-art BLEU score of 28.4.',
      'Training took 3.5 days on 8 P100 GPUs.',
      'Table 2: The Transformer achieves better BLEU scores than previous state-of-the-art models on the English-to-German and English-to-French newstest2014 tests at a fraction of the training cost.',
      'Transformer (base model) 27.3 38.1',
      'Transformer (big) 28.4 41.0',
      'On the WMT 2014 English-to-French translation task, our big model achieves a BLEU score of 41.0.',
      'The code we used to train and evaluate our models is available at https://github.com/tensorflow/tensor2tensor',
    ].join('\n\n'),
  },
  {
    page: 8,
    text: [
      '6.2 Model Variations',
      'To evaluate the importance of different components of the Transformer, we varied our base model in different ways, measuring the change in performance on English-to-German translation on the development set, newstest2013.',
      'We used beam search as described in the previous section, but no checkpoint averaging. We present these results in Table 3.',
      '6.3 English Constituency Parsing',
      'To evaluate if the Transformer can generalize to other tasks we performed experiments on English constituency parsing.',
    ].join('\n\n'),
  },
  {
    page: 9,
    text: [
      '7 Conclusion',
      'In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-headed self-attention.',
      'For translation tasks, the Transformer can be trained significantly faster than architectures based on recurrent or convolutional layers. On both WMT 2014 English-to-German and WMT 2014 English-to-French translation tasks, we achieve a new state of the art.',
      'We are excited about the future of attention-based models and plan to apply them to other tasks.',
      'References',
    ].join('\n\n'),
  },
  {
    page: 10,
    text: [
      'Attention Visualizations',
      'Figure 3: An example of the attention mechanism following long-distance dependencies in the encoder self-attention in layer 5 of 6. Many of the attention heads attend to a distant dependency of the verb “making”, completing the phrase “making...more difficult”.',
      'Different colors represent different heads. Best viewed in color.',
    ].join('\n\n'),
  },
  {
    page: 11,
    text: [
      'Figure 4: Two attention heads, also in layer 5 of 6, apparently involved in anaphora resolution.',
      'Figure 5: Many of the attention heads exhibit behaviour that seems related to the structure of the sentence.',
      'Different colors represent different attention heads. Best viewed in color.',
    ].join('\n\n'),
  },
]

interface ExampleElement {
  type: ElementType
  label: string
  value: string
  quote: string
  page: number
}

const EXAMPLE_ELEMENTS: ExampleElement[] = [
  {
    type: 'task',
    label: '机器翻译序列转导',
    value: '以神经机器翻译验证 Transformer，重点复现 WMT 2014 英德任务，同时参考英法翻译结果。',
    quote:
      'Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.',
    page: 1,
  },
  {
    type: 'dataset',
    label: 'WMT14 英德训练集',
    value: '使用标准 WMT 2014 英德数据，约 450 万句对；复现时需固定数据版本、预处理和划分。',
    quote: 'We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs.',
    page: 5,
  },
  {
    type: 'dataset',
    label: '共享 BPE 词表',
    value: '英德句对采用共享源目标 BPE 词表，约 37,000 个 token，需保持训练与评测分词一致。',
    quote:
      'Sentences were encoded using byte-pair encoding, which has a shared source-target vocabulary of about 37000 tokens.',
    page: 5,
  },
  {
    type: 'architecture',
    label: '编码器—解码器框架',
    value: '保留编码器—解码器总体框架，但两侧都以堆叠自注意力和逐位置全连接层替代循环结构。',
    quote: 'Most competitive neural sequence transduction models have an encoder-decoder structure.',
    page: 2,
  },
  {
    type: 'architecture',
    label: '六层编码器与残差归一化',
    value: '编码器堆叠 6 层；每层含多头自注意力与逐位置前馈网络，子层使用残差连接后接 LayerNorm。',
    quote:
      'The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network. We employ a residual connection around each of the two sub-layers, followed by layer normalization.',
    page: 3,
  },
  {
    type: 'architecture',
    label: '八头注意力',
    value: '使用 8 个并行注意力头，在不同表示子空间学习位置间关系，再拼接并投影各头输出。',
    quote: 'In this work we employ h = 8 parallel attention layers, or heads.',
    page: 4,
  },
  {
    type: 'training',
    label: '按长度组织大批量训练',
    value: '按近似序列长度组批，每批约含 25,000 个源端 token 与 25,000 个目标端 token。',
    quote:
      'Sentence pairs were batched together by approximate sequence length. Each training batch contained a set of sentence pairs containing approximately 25000 source tokens and 25000 target tokens.',
    page: 5,
  },
  {
    type: 'training',
    label: '残差 Dropout 正则化',
    value: '对每个子层输出施加 dropout，再与子层输入相加并归一化；Base 模型 dropout 率为 0.1。',
    quote:
      'Residual Dropout We apply dropout to the output of each sub-layer, before it is added to the sub-layer input and normalized.',
    page: 6,
  },
  {
    type: 'training',
    label: '标签平滑',
    value: '训练时使用 0.1 的标签平滑；它会抬高困惑度，但有助于提升准确率与 BLEU。',
    quote:
      'Label Smoothing During training, we employed label smoothing of value ϵls = 0.1. This hurts perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score.',
    page: 6,
  },
  {
    type: 'hyperparam',
    label: 'Adam 优化器参数',
    value: '采用 Adam，β₁=0.9、β₂=0.98、ϵ=10⁻⁹，复现时应避免沿用框架默认参数。',
    quote: 'We used the Adam optimizer with β1 = 0.9, β2 = 0.98 and ϵ = 10−9.',
    page: 6,
  },
  {
    type: 'hyperparam',
    label: '学习率预热与衰减',
    value: '前 4,000 步线性升高学习率，随后按步数平方根的倒数衰减，需严格对齐 step 计数。',
    quote:
      'This corresponds to increasing the learning rate linearly for the first warmup_steps training steps, and decreasing it thereafter proportionally to the inverse square root of the step number. We used warmup_steps = 4000.',
    page: 6,
  },
  {
    type: 'metric',
    label: 'Base 模型英德 BLEU',
    value: 'Transformer Base 在 WMT14 英德 newstest2014 上报告 BLEU 27.3，是 L2 复现的基础对照值。',
    quote: 'Transformer (base model) 27.3 38.1',
    page: 7,
  },
  {
    type: 'metric',
    label: 'Big 模型英德 BLEU',
    value: 'Transformer Big 在 WMT14 英德 newstest2014 上报告 BLEU 28.4，是大模型复现目标。',
    quote: 'Transformer (big) 28.4 41.0',
    page: 7,
  },
  {
    type: 'compute',
    label: 'Big 模型训练算力',
    value: '论文的大模型配置使用 8 张 P100 训练 3.5 天，可据此估算复现成本并调整实验规模。',
    quote: 'Training took 3.5 days on 8 P100 GPUs.',
    page: 7,
  },
  {
    type: 'code',
    label: 'tensor2tensor 官方代码',
    value: '训练与评测代码位于 TensorFlow tensor2tensor 仓库；复现应固定版本并核对模型配置。',
    quote:
      'The code we used to train and evaluate our models is available at https://github.com/tensorflow/tensor2tensor',
    page: 7,
  },
  {
    type: 'supplement',
    label: '附录注意力可视化',
    value: '补充材料展示编码器自注意力的长距离依赖、指代与句法结构案例，可用于检查模型行为。',
    quote:
      'Figure 3: An example of the attention mechanism following long-distance dependencies in the encoder self-attention in layer 5 of 6. Many of the attention heads attend to a distant dependency of the verb “making”, completing the phrase “making...more difficult”.',
    page: 10,
  },
]

interface CuratedResource {
  title: string
  url: string
  provider: string
}

function resourcesFor(
  conceptName: string,
  primary: CuratedResource,
  secondary: CuratedResource,
): ResourceLink[] {
  return [
    { ...primary, tier: 'primary' },
    { ...secondary, tier: 'secondary' },
    {
      title: `B 站搜索：${conceptName}`,
      url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(conceptName)}`,
      tier: 'blog',
      provider: 'B 站',
    },
  ]
}

type ConceptSeed = Omit<Concept, 'id' | 'projectId' | 'dependsOn' | 'createdAt'>

const EXAMPLE_CONCEPTS: ConceptSeed[] = [
  {
    name: 'Softmax',
    summary: '把一组实数分数归一化为非负且总和为 1 的概率分布。',
    whyNeeded: '缩放点积注意力用 Softmax 把分数变为注意力权重，解码器也用它产生词表概率。',
    difficulty: 1,
    mastery: 'known',
    resources: resourcesFor(
      'Softmax',
      { title: 'Attention Is All You Need', url: ARXIV_URL, provider: 'arXiv' },
      {
        title: 'Wikipedia：Softmax function',
        url: 'https://en.wikipedia.org/wiki/Softmax_function',
        provider: 'Wikipedia',
      },
    ),
  },
  {
    name: 'Encoder-Decoder',
    summary: '编码器将输入序列表示为上下文，解码器据此逐步生成目标序列。',
    whyNeeded: '理解编码器输出、解码器掩码与交叉注意力的数据流，是搭建 Transformer 的前提。',
    difficulty: 2,
    mastery: 'known',
    resources: resourcesFor(
      'Encoder-Decoder',
      {
        title: 'Sequence to Sequence Learning with Neural Networks',
        url: 'https://arxiv.org/abs/1409.3215',
        provider: 'arXiv',
      },
      {
        title: 'Wikipedia：Seq2seq',
        url: 'https://en.wikipedia.org/wiki/Seq2seq',
        provider: 'Wikipedia',
      },
    ),
  },
  {
    name: 'BPE 分词',
    summary: '通过反复合并高频符号对构造子词词表，在词与字符之间折中。',
    whyNeeded: 'WMT14 英德配置依赖共享 BPE 词表，分词差异会直接改变训练数据与 BLEU 结果。',
    difficulty: 1,
    mastery: 'half',
    resources: resourcesFor(
      'BPE 分词',
      {
        title: 'Neural Machine Translation of Rare Words with Subword Units',
        url: 'https://arxiv.org/abs/1508.07909',
        provider: 'arXiv',
      },
      {
        title: 'Wikipedia：Byte pair encoding',
        url: 'https://en.wikipedia.org/wiki/Byte_pair_encoding',
        provider: 'Wikipedia',
      },
    ),
  },
  {
    name: '自注意力',
    summary: '让同一序列中的位置相互计算相关性，直接建模任意位置间依赖。',
    whyNeeded: '它是论文替代循环与卷积的核心，也是实现编码器和解码器掩码注意力的基础。',
    difficulty: 2,
    mastery: 'half',
    resources: resourcesFor(
      '自注意力',
      { title: 'Attention Is All You Need', url: ARXIV_URL, provider: 'arXiv' },
      {
        title: 'Wikipedia：Attention (machine learning)',
        url: 'https://en.wikipedia.org/wiki/Attention_(machine_learning)',
        provider: 'Wikipedia',
      },
    ),
  },
  {
    name: '多头注意力',
    summary: '在多组投影后的表示子空间并行计算注意力，再拼接各头结果。',
    whyNeeded: '需要正确拆分与合并 8 个注意力头，才能对齐模型容量、张量形状和论文结果。',
    difficulty: 2,
    mastery: 'unknown',
    resources: resourcesFor(
      '多头注意力',
      { title: 'Attention Is All You Need', url: ARXIV_URL, provider: 'arXiv' },
      {
        title: 'D2L 教材：Multi-Head Attention',
        url: 'https://d2l.ai/chapter_attention-mechanisms-and-transformers/multihead-attention.html',
        provider: 'D2L 教材',
      },
    ),
  },
  {
    name: '位置编码',
    summary: '把 token 的绝对或相对位置注入表示，弥补注意力本身不含顺序信息的问题。',
    whyNeeded: '复现原论文需实现不同频率的正弦与余弦编码，并验证其与词嵌入相加的方式。',
    difficulty: 2,
    mastery: 'unknown',
    resources: resourcesFor(
      '位置编码',
      { title: 'Attention Is All You Need', url: ARXIV_URL, provider: 'arXiv' },
      {
        title: 'Wikipedia：Positional encoding',
        url: 'https://en.wikipedia.org/wiki/Positional_encoding',
        provider: 'Wikipedia',
      },
    ),
  },
  {
    name: '残差与 LayerNorm',
    summary: '残差连接保留子层输入通路，LayerNorm 按特征归一化以稳定深层训练。',
    whyNeeded: '六个编码器与解码器层都依赖该结构，连接或归一化顺序错误会显著影响收敛。',
    difficulty: 2,
    mastery: 'unknown',
    resources: resourcesFor(
      '残差连接 LayerNorm',
      { title: 'Layer Normalization', url: 'https://arxiv.org/abs/1607.06450', provider: 'arXiv' },
      {
        title: 'D2L 教材：Transformer',
        url: 'https://d2l.ai/chapter_attention-mechanisms-and-transformers/transformer.html',
        provider: 'D2L 教材',
      },
    ),
  },
  {
    name: 'Adam 与学习率预热',
    summary: 'Adam 自适应调整参数步长，预热先线性升学习率再按步数平方根衰减。',
    whyNeeded: 'β 参数、4,000 步预热及衰减 schedule 都是复现训练曲线与最终 BLEU 的关键。',
    difficulty: 3,
    mastery: 'unknown',
    resources: resourcesFor(
      'Adam 学习率预热',
      { title: 'Adam: A Method for Stochastic Optimization', url: 'https://arxiv.org/abs/1412.6980', provider: 'arXiv' },
      {
        title: 'D2L 教材：Adam',
        url: 'https://d2l.ai/chapter_optimization/adam.html',
        provider: 'D2L 教材',
      },
    ),
  },
  {
    name: '标签平滑',
    summary: '把部分正确标签概率分给其他类别，抑制模型过度自信。',
    whyNeeded: '论文使用 0.1 标签平滑改善准确率和 BLEU，忽略它会造成训练目标不一致。',
    difficulty: 1,
    mastery: 'unknown',
    resources: resourcesFor(
      '标签平滑',
      {
        title: 'Rethinking the Inception Architecture for Computer Vision',
        url: 'https://arxiv.org/abs/1512.00567',
        provider: 'arXiv',
      },
      {
        title: 'Wikipedia：Label smoothing',
        url: 'https://en.wikipedia.org/wiki/Label_smoothing',
        provider: 'Wikipedia',
      },
    ),
  },
  {
    name: 'BLEU',
    summary: '通过 n-gram 精度与长度惩罚衡量机器翻译和参考译文的一致程度。',
    whyNeeded: '27.3 与 28.4 是核心复现指标，必须统一 tokenization、大小写和评测脚本。',
    difficulty: 1,
    mastery: 'unknown',
    resources: resourcesFor(
      'BLEU 机器翻译',
      {
        title: 'BLEU: a Method for Automatic Evaluation of Machine Translation',
        url: 'https://aclanthology.org/P02-1040/',
        provider: 'ACL Anthology',
      },
      {
        title: 'Wikipedia：BLEU',
        url: 'https://en.wikipedia.org/wiki/BLEU',
        provider: 'Wikipedia',
      },
    ),
  },
]

const EXAMPLE_DEPENDENCIES: Record<string, string[]> = {
  Softmax: [],
  'Encoder-Decoder': [],
  'BPE 分词': [],
  自注意力: ['Softmax'],
  多头注意力: ['自注意力'],
  位置编码: ['Encoder-Decoder'],
  '残差与 LayerNorm': ['Encoder-Decoder'],
  'Adam 与学习率预热': [],
  标签平滑: ['Softmax'],
  BLEU: ['BPE 分词'],
}

export async function loadExampleProject(): Promise<{ projectId: number; existing: boolean }> {
  return db.transaction('rw', [db.projects, db.papers, db.elements, db.concepts], async () => {
    const existing = (await db.projects.toArray()).find(
      (project) => project.title === EXAMPLE_PROJECT_TITLE,
    )
    if (existing?.id !== undefined) return { projectId: existing.id, existing: true }

    const now = Date.now()
    const projectId = await db.projects.add({
      title: EXAMPLE_PROJECT_TITLE,
      goal: '按论文配置复现 Transformer Base/Big 的 WMT 2014 英德训练与评测，核对 BLEU 27.3/28.4，并记录结果偏差。',
      level: 'L2',
      device: '论文参考：8 × NVIDIA P100（可按本机配置调整）',
      createdAt: now,
      updatedAt: now,
    })
    if (projectId === undefined) throw new Error('创建示例项目后未获得项目编号。')

    const paperId = await db.papers.add({
      projectId,
      title: 'Attention Is All You Need',
      authors: [
        'Ashish Vaswani',
        'Noam Shazeer',
        'Niki Parmar',
        'Jakob Uszkoreit',
        'Llion Jones',
        'Aidan N. Gomez',
        'Lukasz Kaiser',
        'Illia Polosukhin',
      ],
      abstract:
        'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.',
      year: 2017,
      venue: 'Advances in Neural Information Processing Systems 30 (NeurIPS 2017)',
      arxivId: '1706.03762',
      url: ARXIV_URL,
      pdfUrl: 'https://arxiv.org/pdf/1706.03762',
      source: 'arxiv',
      pageCount: 11,
      pages: EXAMPLE_PAGES,
      pagesLabel: '5998–6008',
      fileName: 'Attention Is All You Need（内置关键页文本节选）.txt',
      createdAt: now,
      updatedAt: now,
    })
    if (paperId === undefined) throw new Error('创建示例论文后未获得论文编号。')

    await db.elements.bulkAdd(
      EXAMPLE_ELEMENTS.map((element) => ({
        ...element,
        projectId,
        paperId,
        verified: verifyAnchor(EXAMPLE_PAGES, element.page, element.quote),
        source: 'example',
        createdAt: now,
      })),
    )

    const conceptIds = new Map<string, number>()
    for (const concept of EXAMPLE_CONCEPTS) {
      const id = await db.concepts.add({
        projectId,
        name: concept.name,
        summary: concept.summary,
        whyNeeded: concept.whyNeeded,
        difficulty: concept.difficulty,
        mastery: concept.mastery,
        dependsOn: [],
        resources: concept.resources,
        createdAt: now,
      })
      if (id === undefined) throw new Error(`创建概念「${concept.name}」后未获得编号。`)
      conceptIds.set(concept.name, id)
    }

    for (const concept of EXAMPLE_CONCEPTS) {
      const dependsOn = (EXAMPLE_DEPENDENCIES[concept.name] ?? []).map(
        (name) => conceptIds.get(name)!,
      )
      await db.concepts.update(conceptIds.get(concept.name)!, { dependsOn })
    }

    return { projectId, existing: false }
  })
}
