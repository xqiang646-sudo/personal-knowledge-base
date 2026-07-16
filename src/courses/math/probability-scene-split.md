---
layout: layouts/course.njk
courseId: probability-scene-split
permalink: /learn/math/probability-scene-split.html
math: true
---

## 为什么概率论要从数据切分开始落地

概率论不是只为计算骰子。自动驾驶数据存在采样、噪声、缺失、长尾类别和天气差异，模型输出的也不是绝对真理，而是在给定数据和假设下的预测。

对 nuScenes 这类时序数据，概率与统计最直接的工程作用包括：

- 描述类别、天气、场景和传感器质量的分布；
- 区分平均表现与波动，避免只报一个均值；
- 设计训练、验证和测试集，使评估近似回答“对未见场景能否工作”；
- 防止相邻帧或同一 scene 同时进入训练集和验证集造成数据泄漏；
- 理解似然、Softmax 和交叉熵，为深度学习模块打基础；
- 用失败样本和条件概率说明系统在哪些条件下表现变差。

本课预计用时 $12$–$15$ 小时。完成后，你应能对一份 nuScenes 风格元数据进行描述统计，按 scene 进行可复现切分，检查泄漏，并说明切分的适用边界。

## 课前诊断

1. $100$ 帧中有 $25$ 帧雨天，随机抽到雨天帧的经验概率是多少？
2. 数据 $[10,10,10]$ 与 $[0,10,20]$ 的均值是否相同？哪组波动更大？
3. $P(A\mid B)$ 与 $P(B\mid A)$ 是否一定相等？
4. 一段连续视频的相邻两帧通常是独立样本吗？为什么？
5. 如果先做数据增强，再把增强图随机分到训练集和验证集，可能发生什么？
6. 为什么不能根据测试集结果反复调整模型？
7. 训练集汽车占 $90\%$、行人占 $10\%$。只预测汽车的分类器准确率是多少？它是否有用？
8. 模型给真实类别的概率为 $0.9$ 与 $0.1$ 时，哪个样本的负对数似然更大？

建议先能熟练使用 Python 列表、字典、集合、NumPy 数组和固定随机种子。

## 核心章节

### 1. 样本空间、事件与随机变量

一次试验所有可能结果构成样本空间 $\Omega$。事件是结果的集合。随机变量把结果映射为数值。

例如从数据集中随机抽取一帧：

- “天气是雨天”是一个事件；
- “这一帧的目标数量”可以看作随机变量 $N$；
- “相机图像是否不合格”可以看作取值为 $0$ 或 $1$ 的 Bernoulli 随机变量。

有限数据上的经验概率为

$$
\hat P(A)=\frac{\text{满足事件 }A\text{ 的样本数}}{\text{总样本数}}.
$$

帽子 $\hat P$ 提醒我们：这是从有限样本估计得到的概率，不是永恒不变的真值。

### 2. 联合、边缘与条件概率

联合概率 $P(A,B)$ 表示 $A$ 与 $B$ 同时发生。条件概率为

$$
P(A\mid B)=\frac{P(A,B)}{P(B)},
\qquad P(B)>0.
$$

它回答“已知 $B$ 发生时，$A$ 发生的概率”。交换条件后问题就变了。

贝叶斯公式为

$$
P(A\mid B)
=\frac{P(B\mid A)P(A)}{P(B)}.
$$

若 $A$ 与 $B$ 独立，则

$$
P(A,B)=P(A)P(B),
\qquad
P(A\mid B)=P(A).
$$

相邻视频帧通常不独立，因为它们共享地点、天气、目标和相似像素。随机打散帧不能消除这种真实关联。

### 3. 期望、方差与标准差

离散随机变量的期望为

$$
\mathbb E[X]=\sum_x xP(X=x).
$$

有限数据的均值为

$$
\bar x=\frac{1}{n}\sum_{i=1}^{n}x_i.
$$

方差描述数据围绕均值的波动：

$$
\operatorname{Var}(X)
=\mathbb E\left[(X-\mathbb E[X])^2\right].
$$

标准差为

$$
\sigma=\sqrt{\operatorname{Var}(X)}.
$$

标准差与原变量单位相同，更容易解释。例如延迟均值为 $50\,\mathrm{ms}$、标准差为 $2\,\mathrm{ms}$，与标准差为 $30\,\mathrm{ms}$ 代表完全不同的稳定性。

两个变量共同变化可用协方差描述：

$$
\operatorname{Cov}(X,Y)
=\mathbb E[(X-\mathbb E[X])(Y-\mathbb E[Y])].
$$

相关不等于因果。雨量与图像质量同时变化，可能由曝光、能见度或镜头水滴共同导致，不能只凭相关系数宣布因果关系。

### 4. 只学任务需要的常见分布

第一阶段只要求理解四类分布的用途：

- Bernoulli：一个二元结果，例如一帧是否缺失标注；
- Categorical：一个样本属于多个类别中的一个，例如汽车、行人、自行车；
- Binomial：固定次数 Bernoulli 试验中的成功次数；
- Gaussian：许多连续噪声的基础近似模型。

不要求背诵“分布大全”。学习重点是：随机变量取什么值、参数是什么意思、假设是否合理、怎样采样验证直觉。

### 5. 抽样、偏差与大数定律直觉

样本均值在独立同分布且样本量增加等条件下会趋近总体期望，这是大数定律的核心直觉。但它不保证“数据越多就一定越正确”。若采样机制有偏，更多同类偏差数据只会更稳定地得到错误结论。

常见数据偏差包括：

- 只采白天，无法代表夜间；
- 城市道路占绝大多数，乡村道路成为长尾；
- 标注流程更容易漏掉小目标；
- 数据清洗把困难样本大量删除；
- 同一路段被重复采集，样本数量看似很多但场景多样性有限。

### 6. 训练、验证与测试的角色

- 训练集：用于更新模型参数；
- 验证集：用于选择模型、阈值和超参数；
- 测试集：只用于最后一次相对独立的评估。

如果根据测试集表现不断调参，测试集就参与了模型选择，不再是独立评估。

切分目标不是机械追求某个比例，而是构造合理的泛化问题。对时序自动驾驶数据，通常应按 scene 或更高层组进行切分：

$$
S_{\mathrm{train}}
\cap S_{\mathrm{val}}
=S_{\mathrm{train}}
\cap S_{\mathrm{test}}
=S_{\mathrm{val}}
\cap S_{\mathrm{test}}
=\varnothing.
$$

这里的集合元素是 scene 标识，而不是单帧标识。

### 7. 为什么 nuScenes 要按 scene 切分

同一 scene 内的 sample 在时间上连续，共享道路、天气、车辆和大量相似目标。若按帧随机切分，训练集可能包含第 $t$ 帧，验证集包含非常相似的第 $t+1$ 帧。模型看似在“未见数据”上表现很好，实际可能只是利用了近重复信息。

scene-level split 的基本原则是：同一 scene 的所有 sample、sample data、标注以及由它们派生的裁剪、增强样本必须跟随同一个 split。

对正式 nuScenes benchmark 应优先使用官方定义的 split。只有做教学子集或内部任务时才自定义，并且要保存 scene 列表、随机种子和生成规则。

### 8. 从概率到似然与交叉熵

分类模型常输出每个类别的概率 $\hat p_k$，满足

$$
\hat p_k\ge0,
\qquad
\sum_{k=1}^{K}\hat p_k=1.
$$

Softmax 把任意实数 logits $z_k$ 转成概率：

$$
\hat p_k
=\frac{e^{z_k}}{\sum_{j=1}^{K}e^{z_j}}.
$$

若真实类别是 $y$，单样本交叉熵为

$$
L=-\log\hat p_y.
$$

模型给真实类别的概率越小，损失越大。交叉熵是训练信号，不等于完整的模型评价；长尾类别还需要分类别指标和失败样本分析。

## 逐步例题一：条件概率不能交换

有 $100$ 帧图像，其中 $20$ 帧是雨天。雨天中 $8$ 帧质量不合格；其余 $80$ 帧中有 $4$ 帧质量不合格。

已知雨天，图像不合格的概率为

$$
P(\text{不合格}\mid\text{雨天})
=\frac{8}{20}=0.4.
$$

全部不合格帧共有

$$
8+4=12.
$$

已知图像不合格，它来自雨天的概率为

$$
P(\text{雨天}\mid\text{不合格})
=\frac{8}{12}
=\frac{2}{3}.
$$

$0.4$ 与 $2/3$ 都正确，但回答的是不同问题。工程报告必须把条件写完整。

## 逐步例题二：高准确率可能毫无意义

假设验证集中有 $900$ 个汽车样本和 $100$ 个行人样本。一个模型始终预测汽车，则准确率为

$$
\operatorname{accuracy}
=\frac{900}{1000}=0.9.
$$

但行人召回率为

$$
\operatorname{recall}_{\mathrm{pedestrian}}
=\frac{0}{100}=0.
$$

所以 $90\%$ 准确率并不能说明模型适合自动驾驶任务。必须查看类别分布、分类别指标和失败样本。

## 逐步例题三：场景泄漏怎样发生

假设 `scene-001` 有连续帧 $f_1,f_2,f_3,f_4$。按帧随机切分后：

$$
\{f_1,f_2,f_4\}\subset D_{\mathrm{train}},
\qquad
\{f_3\}\subset D_{\mathrm{val}}.
$$

虽然帧 token 没有重复，但场景信息泄漏了。正确做法是让整个 scene 只属于一个集合：

$$
\operatorname{split}(f_1)
=\operatorname{split}(f_2)
=\operatorname{split}(f_3)
=\operatorname{split}(f_4).
$$

因此泄漏检查应比较 scene 集合，而不能只比较 sample token。

## 引导实验：实现可复现的 scene-level split

下面使用合成元数据，不需要先下载 nuScenes。

```python
from collections import Counter
import numpy as np

records = [
    {"scene": "scene-001", "sample": "001-0", "weather": "dry",  "label": "car"},
    {"scene": "scene-001", "sample": "001-1", "weather": "dry",  "label": "car"},
    {"scene": "scene-002", "sample": "002-0", "weather": "rain", "label": "pedestrian"},
    {"scene": "scene-002", "sample": "002-1", "weather": "rain", "label": "car"},
    {"scene": "scene-003", "sample": "003-0", "weather": "dry",  "label": "bicycle"},
    {"scene": "scene-004", "sample": "004-0", "weather": "night", "label": "car"},
    {"scene": "scene-005", "sample": "005-0", "weather": "dry",  "label": "pedestrian"},
    {"scene": "scene-006", "sample": "006-0", "weather": "rain", "label": "car"},
    {"scene": "scene-007", "sample": "007-0", "weather": "night", "label": "bicycle"},
    {"scene": "scene-008", "sample": "008-0", "weather": "dry",  "label": "car"},
    {"scene": "scene-009", "sample": "009-0", "weather": "rain", "label": "pedestrian"},
    {"scene": "scene-010", "sample": "010-0", "weather": "dry",  "label": "car"},
]

def split_by_scene(records, seed=42, train_ratio=0.7, val_ratio=0.15):
    if train_ratio <= 0 or val_ratio < 0 or train_ratio + val_ratio >= 1:
        raise ValueError("ratios must leave a non-empty test fraction")

    scenes = np.array(sorted({row["scene"] for row in records}))
    rng = np.random.default_rng(seed)
    rng.shuffle(scenes)

    n = len(scenes)
    n_train = int(round(n * train_ratio))
    n_val = int(round(n * val_ratio))
    n_train = min(max(n_train, 1), n - 2)
    n_val = min(max(n_val, 1), n - n_train - 1)

    scene_sets = {
        "train": set(scenes[:n_train]),
        "val": set(scenes[n_train:n_train + n_val]),
        "test": set(scenes[n_train + n_val:]),
    }

    splits = {
        name: [row for row in records if row["scene"] in scene_set]
        for name, scene_set in scene_sets.items()
    }
    return splits, scene_sets

splits, scene_sets = split_by_scene(records, seed=42)

assert scene_sets["train"].isdisjoint(scene_sets["val"])
assert scene_sets["train"].isdisjoint(scene_sets["test"])
assert scene_sets["val"].isdisjoint(scene_sets["test"])
assert sum(len(rows) for rows in splits.values()) == len(records)

for split_name, rows in splits.items():
    label_counts = Counter(row["label"] for row in rows)
    weather_counts = Counter(row["weather"] for row in rows)
    print(split_name, len(rows), label_counts, weather_counts)
```

然后完成以下实验：

1. 使用同一个 seed 运行两次，确认 scene 列表完全一致；
2. 改变 seed，说明为什么结果变化但仍必须无泄漏；
3. 计算各 split 的类别比例和天气比例；
4. 构造一个按 sample 随机切分的错误版本，证明 `scene-001` 或 `scene-002` 可能跨集合；
5. 给每条记录增加 `source_file`，检查同一原始文件的派生样本没有跨 split；
6. 解释为什么只通过集合互斥检查仍不能保证类别和天气覆盖合理。

## 独立任务：nuScenes 风格切分与质量报告

使用 nuScenes-mini 或导师提供的脱敏 manifest，提交以下结果：

1. 数据总量：scene、sample、sample data 和 annotation 数量；
2. 每个 scene 的 sample 数、天气/时段标签、主要类别数量；
3. 按官方 split 或自定义 scene-level split 生成不可变的 scene 清单；
4. 明确随机种子、比例、生成日期和代码版本；
5. 检查 scene、sample token、原始文件和派生样本是否跨 split；
6. 分别报告各 split 的类别、天气和场景长度分布；
7. 找出至少三个分布差异或长尾风险；
8. 对一个条件问题作答，例如

   $$
   P(\text{行人标注}\mid\text{夜间 scene})
   $$

   并写清分子、分母和样本量；
9. 设计一个只预测多数类的基线，说明准确率为什么不足；
10. 写出这份切分适合回答什么问题、不适合回答什么问题。

若使用官方 benchmark split，不要为了让分布更“漂亮”而改动；应报告观察到的差异。自定义 split 仅用于教学或明确的内部实验，并与官方结果分开。

## 常见错误案例

### 按帧随机切分连续数据

相邻帧高度相似，同一 scene 跨集合会导致验证结果过于乐观。应按 scene 或更高层组切分。

### 先增强再切分

同一原图的两个增强版本可能分别进入训练集和验证集。正确顺序是先按原始组切分，再只在训练集内部增强。

### 只检查 token 不重复

不同 token 可能来自同一 scene、同一原始文件或相邻时刻。泄漏检查必须覆盖任务实际共享的信息源。

### 只追求 $70/15/15$ 比例

样本数比例接近目标，不代表天气、类别、地点和场景长度合理。比例是约束之一，不是唯一目标。

### 没有保存随机种子和 scene 清单

无法复现的切分会让两次实验无法公平比较。必须保存 seed、算法和最终清单，而不只是口头写“随机划分”。

### 用测试集选择模型

反复查看测试结果并调参，会让测试集参与训练决策。应使用验证集选择，测试集留到最终评估。

### 把相关关系当成因果关系

发现雨天与误检同时增加，只能先报告关联。确认因果还需要控制其他变量或设计额外实验。

### 忽略零样本和小样本

某 split 中稀有类别为零时，比例和召回率可能不可解释。必须同时报告计数，不能只报百分比。

## 需要提交的证据

- 原始 manifest 或其可追溯生成说明；
- scene-level split 代码；
- seed、比例、最终 scene 清单；
- scene、sample、文件和派生样本的无泄漏断言；
- 各 split 的计数、比例、均值和标准差；
- 类别、天气和场景长度对比图；
- 条件概率的分子、分母与样本量；
- 多数类基线及其局限；
- 至少三个偏差或泛化边界；
- 一条从零开始复现报告的命令或 Notebook 运行说明。

## 0–3 级验收量表

| 等级 | 概率与统计 | 切分实现 | 工程解释 |
|---:|---|---|---|
| 0 | 无法区分比例、均值和条件概率 | 按帧随机切分且无检查 | 用单一准确率宣布模型有效 |
| 1 | 能在提示下计算，但会交换条件或忽略样本量 | 能生成 split，不能保证复现或无泄漏 | 只说明比例，不分析长尾和偏差 |
| 2 | 能独立计算分布、方差和条件概率并解释含义 | scene 集合互斥，seed、清单和断言齐全 | 能说明切分回答的问题、边界和失败风险 |
| 3 | 能识别隐藏依赖、采样偏差和指标误导 | 能设计组级、文件级和派生样本级验证 | 能针对未见数据提出并验证合理的切分策略 |

通过门槛：三列均达到等级 2；scene 泄漏、不可复现切分、使用测试集调参任一项出现且未修复，都不能通过。

## 来源与延伸阅读

- [《动手学深度学习》第二版：概率](https://zh-v2.d2l.ai/chapter_preliminaries/probability.html)：随机变量、联合概率、条件概率、贝叶斯公式、期望和方差的实践入口。
- [《动手学深度学习》第二版：Softmax 回归](https://zh-v2.d2l.ai/chapter_linear-networks/softmax-regression.html)：概率输出与多分类模型的连接。
- [《动手学深度学习》第二版：图像分类数据集](https://zh-v2.d2l.ai/chapter_linear-networks/image-classification-dataset.html)：批量数据与分类任务的基础示例。
- [nuScenes 官方教程](https://www.nuscenes.org/tutorials/nuscenes_tutorial.html)：数据表、scene、sample 和标注关系。
- [nuScenes devkit：split 定义](https://github.com/nutonomy/nuscenes-devkit/blob/master/python-sdk/nuscenes/utils/splits.py)：正式 benchmark 与 mini 数据的官方 scene 列表实现。

本课使用 nuScenes 风格场景重新组织概率与数据切分知识。参考资料用于核对概念、数据结构和官方 split，不替代对内部数据采样机制的单独审查。
