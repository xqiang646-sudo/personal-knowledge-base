---
layout: layouts/course.njk
courseId: deep-learning-training-loop
permalink: /learn/deep-learning/training-loop.html
math: true
---

## 本课定位

这一课只解决一个问题：**模型到底是怎样从数据中学会参数的？**

你会从一个只有一层的线性模型开始，亲手跑通一次完整的 PyTorch 训练闭环：

$$
\text{数据} \rightarrow \text{预测} \rightarrow \text{损失} \rightarrow \text{梯度} \rightarrow \text{更新参数} \rightarrow \text{重新预测}
$$

这条闭环是后续多层感知机、卷积神经网络、ResNet 和自动驾驶视觉模型共同的骨架。模型会变复杂，但训练的基本机制不会变。

- 建议课时：$8\text{--}10$ 小时
- 学习方式：先手算，再读代码，最后独立改写
- 最终产物：一个可复现的 PyTorch 训练脚本、一张训练/验证损失曲线和一份实验说明
- 本课边界：不展开 MLP、CNN、ResNet、目标检测或语义分割；它们是后续模块

## 为什么要学习训练闭环

当一个模型效果不好时，真正的问题不一定是“模型不够先进”。常见原因还包括：

- 输入张量的 shape 不对；
- 标签和样本没有对齐；
- 忘记清空梯度或更新参数；
- 训练集和验证集发生泄漏；
- 只看训练损失，没有检查泛化能力；
- 随机种子、数据切分或环境没有记录，导致结果无法复现。

如果不理解训练闭环，就只能反复换模型和调参数；理解它之后，才能判断错误发生在数据、计算、优化还是验证环节。

在后续 nuScenes 和感知数据任务中，这项能力会直接用于：

1. 检查一批图像、标签和类别编号能否被模型正确读取；
2. 判断训练集与验证集是否按 scene 隔离；
3. 解释 loss、梯度和评价指标为什么异常；
4. 保存可复现的配置、曲线、模型权重和失败样本。

## 学习目标

完成本课后，你应当能够：

- 说清标量、向量、矩阵和张量的关系；
- 根据 `shape` 判断样本维、特征维和输出维；
- 写出线性模型、均方误差和梯度下降的基本公式；
- 解释 `loss.backward()` 和 `optimizer.step()` 分别做了什么；
- 独立实现训练阶段和验证阶段；
- 绘制并解读训练损失与验证损失曲线；
- 识别过拟合、数据泄漏和不可复现等问题；
- 提交足以让导师复现实验的证据。

## 先修知识

本课不假设你学过深度学习，但需要能完成以下基础操作：

- Python：变量、函数、循环、列表、字典和 `import`；
- NumPy/PyTorch：创建数组或张量、索引、基本运算；
- 线性代数：向量、矩阵乘法和转置的直观含义；
- 微积分：导数表示函数对输入变化的敏感程度；
- 概率统计：平均值，以及训练集和验证集的区别。

如果暂时不能熟练手算矩阵乘法或导数，可以继续本课，但必须完成本页中的 shape 检查和有限差分实验后再进入独立任务。

## 课前诊断

先不要运行代码，独立回答下面的问题。

1. 有 $100$ 个样本，每个样本有 $4$ 个特征，输入矩阵 $X$ 的 shape 应是什么？
2. 若 $X$ 的 shape 是 $(32, 4)$，权重 $W$ 的 shape 是 $(4, 1)$，那么 $XW$ 的 shape 是什么？
3. 损失函数的作用是产生最终预测，还是衡量预测与目标之间的差异？
4. 为什么验证集不能参与参数更新？
5. `loss.backward()` 之后，模型参数会自动变好吗？
6. 设置随机种子能否证明实验结果一定正确？

<details>
<summary>展开参考答案</summary>

1. $(100, 4)$。第一维通常是样本数，第二维是每个样本的特征数。
2. $(32, 1)$。矩阵乘法的内维 $4$ 消去，保留外维 $32$ 和 $1$。
3. 损失函数衡量预测与目标之间的差异。
4. 验证集用于模拟“没见过的数据”。如果它参与更新，就无法客观评价泛化能力。
5. 不会。`backward()` 只计算梯度；还需要 `optimizer.step()` 才会更新参数。
6. 不能。随机种子只提高可复现性，不会修复错误的数据、模型或评价方法。

</details>

建议标准：答对至少 $4$ 题再进入实验。低于 $4$ 题时，先复习本页“张量与 shape”“损失、梯度与更新”两节。

## 先建立最小心智模型

一次监督学习至少包含六个对象：

| 对象 | 符号 | 作用 |
|---|---|---|
| 输入 | $X$ | 模型看到的数据 |
| 标签 | $y$ | 希望模型给出的正确答案 |
| 模型 | $f_\theta$ | 将输入映射为预测的函数 |
| 参数 | $\theta$ | 模型要从数据中学到的数值 |
| 预测 | $\hat{y}$ | 模型当前给出的答案 |
| 损失 | $L$ | 预测与标签之间的差异 |

训练的目标不是让模型“记住一段代码”，而是寻找一组参数 $\theta$，使训练数据上的平均损失尽量小，同时在未参与训练的数据上仍能工作：

$$
\theta^* = \arg\min_\theta \frac{1}{N}\sum_{i=1}^{N} \ell\left(f_\theta(x_i), y_i\right)
$$

其中，$N$ 是样本数，$\ell$ 是单个样本的损失函数。

## 张量与 shape

### 从标量到张量

- 标量：一个数，例如温度 $23.5$；
- 向量：一列数，例如二维位置 $(x,y)$；
- 矩阵：按行列排列的数，例如“样本 $\times$ 特征”；
- 张量：对以上概念的统一扩展，可以具有任意多个维度。

在 PyTorch 中，它们都由 `torch.Tensor` 表示：

```python
import torch

scalar = torch.tensor(3.0)                 # shape: ()
vector = torch.tensor([1.0, 2.0, 3.0])     # shape: (3,)
matrix = torch.zeros(5, 3)                 # shape: (5, 3)
images = torch.zeros(8, 3, 224, 224)       # shape: (8, 3, 224, 224)
```

最后一个例子通常表示 $8$ 张图像，每张图像有 $3$ 个通道，高和宽均为 $224$。不要只记数字，要为每一维写出语义：

$$
(N,C,H,W)=(8,3,224,224)
$$

### 线性模型中的 shape

假设一个 batch 有 $B$ 个样本，每个样本有 $d$ 个特征，模型输出 $m$ 个数：

$$
X \in \mathbb{R}^{B\times d},\qquad
W \in \mathbb{R}^{d\times m},\qquad
b \in \mathbb{R}^{m}
$$

线性模型为：

$$
\hat{Y}=XW+b
$$

因此：

$$
\hat{Y}\in\mathbb{R}^{B\times m}
$$

偏置 $b$ 会沿 batch 维广播。广播很方便，但也可能掩盖错误，所以训练前应主动检查：

```python
assert X.ndim == 2
assert y.ndim == 2
assert X.shape[0] == y.shape[0]
assert X.shape[1] == model.in_features
assert y.shape[1] == model.out_features
```

对于本课的一维回归任务：

$$
X:(B,1),\qquad y:(B,1),\qquad \hat{y}:(B,1)
$$

如果把 $y$ 写成 $(B,)$，PyTorch 有时会广播而不立即报错，却可能计算出不是你想要的损失。

## 线性模型：最简单的可训练模型

一维线性模型写作：

$$
\hat{y}=wx+b
$$

- $x$ 是输入；
- $w$ 是斜率，也就是输入变化一个单位时预测大约变化多少；
- $b$ 是截距，也就是 $x=0$ 时的预测；
- $w$ 和 $b$ 是模型要学习的参数。

如果真实数据近似满足：

$$
y=3x+2+\varepsilon
$$

其中 $\varepsilon$ 是噪声，那么训练良好的模型应得到接近 $w=3$、$b=2$ 的参数，但不会完全相等。

线性模型虽然简单，却已经包含深度学习训练的全部基础部件：参数、前向计算、损失、反向传播和优化。

## 损失：把“预测得不好”变成一个数

回归任务常用均方误差：

$$
L(w,b)=\frac{1}{B}\sum_{i=1}^{B}\left(\hat{y}_i-y_i\right)^2
$$

损失越小，表示当前 batch 上的预测通常越接近标签。平方有三个作用：

1. 正误差和负误差不会互相抵消；
2. 大误差会受到更强惩罚；
3. 函数可导，便于计算梯度。

损失和业务指标不是同一个概念。模型使用某个可优化的损失进行训练，最终还应使用适合任务的指标评价，例如 MAE、准确率、precision、recall 或 IoU。

## 梯度、反向传播与参数更新

### 梯度表示什么

导数表示一个变量发生小变化时，函数大约怎样变化。对多个参数求偏导并排列起来，就得到梯度：

$$
\nabla_\theta L=
\begin{bmatrix}
\frac{\partial L}{\partial \theta_1}\\
\frac{\partial L}{\partial \theta_2}\\
\vdots
\end{bmatrix}
$$

梯度指向损失增大最快的方向，因此沿负梯度方向更新参数：

$$
\theta_{t+1}=\theta_t-\eta\nabla_\theta L(\theta_t)
$$

$\eta$ 是学习率：

- 太小：训练很慢；
- 太大：可能反复越过低点，甚至出现 `nan`；
- 合适：损失总体下降并逐渐稳定。

### 前向传播和反向传播

前向传播按计算顺序得到预测和损失：

$$
x \rightarrow wx+b \rightarrow \hat{y} \rightarrow L(\hat{y},y)
$$

反向传播利用链式法则，从损失出发反向计算每个参数的梯度：

$$
\frac{\partial L}{\partial w}
=
\frac{\partial L}{\partial \hat{y}}
\frac{\partial \hat{y}}{\partial w}
$$

PyTorch 的自动微分会记录前向计算图。调用：

```python
loss.backward()
```

会把梯度写入各参数的 `.grad`，但不会修改参数本身。参数更新由优化器完成：

```python
optimizer.step()
```

PyTorch 默认会累加梯度，因此每个 batch 更新前还需要：

```python
optimizer.zero_grad()
```

正确顺序是：

```text
清空旧梯度 → 前向计算 → 计算损失 → 反向传播 → 更新参数
```

## 优化器

优化器负责按照梯度和更新规则修改参数。本课使用最基本的随机梯度下降 SGD：

```python
optimizer = torch.optim.SGD(model.parameters(), lr=0.05)
```

这里的“随机”来自每次只使用一小批样本估计总体梯度。一个小批次称为 batch，完整看过一次训练集称为一个 epoch。

后续课程会比较动量法和 Adam。本课只要求理解：优化器不是模型，也不产生预测；它只根据参数梯度执行更新。

## 训练模式与验证模式

模型在训练和验证时扮演不同角色。

### 训练阶段

```python
model.train()
```

训练阶段需要：

- 启用梯度记录；
- 计算损失；
- 反向传播；
- 更新参数。

### 验证阶段

```python
model.eval()
with torch.no_grad():
    ...
```

验证阶段：

- 不更新参数；
- 不需要保存梯度计算图；
- 应使用与训练集隔离的数据；
- 应使用固定、可比较的数据处理流程。

`model.eval()` 会让 Dropout、BatchNorm 等层切换到推理行为；`torch.no_grad()` 则关闭梯度记录、减少内存开销。两者作用不同，后续模型中通常都要使用。

虽然本课的 `nn.Linear` 没有 Dropout 或 BatchNorm，仍然从第一天就养成显式切换模式的习惯。

## 最小 PyTorch 训练闭环

下面的程序只使用合成数据，可以在 CPU 上运行。请先逐段阅读，再完整执行。

```python
import random

import matplotlib.pyplot as plt
import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset


SEED = 42


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


set_seed(SEED)
device = torch.device("cpu")

# 1. 构造数据：y = 3x + 2 + noise
num_samples = 1000
X = torch.randn(num_samples, 1)
noise = 0.2 * torch.randn(num_samples, 1)
y = 3.0 * X + 2.0 + noise

assert X.shape == (num_samples, 1)
assert y.shape == (num_samples, 1)

# 2. 用固定随机序列切分数据，验证集不参与训练
split_generator = torch.Generator().manual_seed(SEED)
indices = torch.randperm(num_samples, generator=split_generator)
train_indices = indices[:800]
val_indices = indices[800:]

X_train, y_train = X[train_indices], y[train_indices]
X_val, y_val = X[val_indices], y[val_indices]

train_dataset = TensorDataset(X_train, y_train)
val_dataset = TensorDataset(X_val, y_val)

loader_generator = torch.Generator().manual_seed(SEED)
train_loader = DataLoader(
    train_dataset,
    batch_size=32,
    shuffle=True,
    generator=loader_generator,
)
val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)

# 3. 定义模型、损失函数和优化器
model = nn.Linear(in_features=1, out_features=1).to(device)
loss_fn = nn.MSELoss()
optimizer = torch.optim.SGD(model.parameters(), lr=0.05)


def train_one_epoch() -> float:
    model.train()
    total_loss = 0.0
    total_samples = 0

    for batch_X, batch_y in train_loader:
        batch_X = batch_X.to(device)
        batch_y = batch_y.to(device)

        optimizer.zero_grad()
        predictions = model(batch_X)
        loss = loss_fn(predictions, batch_y)
        loss.backward()
        optimizer.step()

        batch_size = batch_X.shape[0]
        total_loss += loss.item() * batch_size
        total_samples += batch_size

    return total_loss / total_samples


def evaluate() -> float:
    model.eval()
    total_loss = 0.0
    total_samples = 0

    with torch.no_grad():
        for batch_X, batch_y in val_loader:
            batch_X = batch_X.to(device)
            batch_y = batch_y.to(device)

            predictions = model(batch_X)
            loss = loss_fn(predictions, batch_y)

            batch_size = batch_X.shape[0]
            total_loss += loss.item() * batch_size
            total_samples += batch_size

    return total_loss / total_samples


# 4. 重复“训练一次 + 验证一次”，并保存曲线数据
epochs = 30
train_losses = []
val_losses = []

for epoch in range(epochs):
    train_loss = train_one_epoch()
    val_loss = evaluate()
    train_losses.append(train_loss)
    val_losses.append(val_loss)

    print(
        f"epoch={epoch + 1:02d} "
        f"train_loss={train_loss:.6f} "
        f"val_loss={val_loss:.6f}"
    )

# 5. 查看学到的参数
learned_weight = model.weight.detach().cpu().item()
learned_bias = model.bias.detach().cpu().item()
print(f"learned_weight={learned_weight:.3f}")
print(f"learned_bias={learned_bias:.3f}")

# 6. 绘制训练/验证损失曲线
plt.plot(range(1, epochs + 1), train_losses, label="train")
plt.plot(range(1, epochs + 1), val_losses, label="validation")
plt.xlabel("epoch")
plt.ylabel("MSE loss")
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.show()
```

正常情况下，你应观察到：

- 训练损失和验证损失在前几个 epoch 明显下降；
- 两条曲线最终稳定在相近范围；
- 学到的权重接近 $3$；
- 学到的偏置接近 $2$。

不要把某个精确数值当作唯一答案。随机数据、PyTorch 版本和计算设备都可能造成小幅差异；更重要的是趋势、参数范围和可复现证据。

## 怎样阅读训练曲线

训练曲线是诊断工具，不是装饰图。

### 正常学习

- 训练损失总体下降；
- 验证损失也下降；
- 两者逐渐稳定；
- 训练损失通常略低于验证损失。

### 欠拟合

- 训练损失和验证损失都较高；
- 两条曲线可能都没有充分下降。

可能原因包括训练时间不足、学习率不合适、输入信息不足或模型表达能力不足。

### 过拟合

- 训练损失持续下降；
- 验证损失先下降后上升；
- 训练和验证之间的差距越来越大。

这表示模型越来越适应训练样本，却没有提高对新数据的能力。后续课程会学习正则化、数据增广和更合理的模型选择。

### 曲线异常但不一定是模型问题

- 损失突然为 `nan`：检查学习率、数据范围和非法值；
- 损失完全不变：检查梯度、参数更新和数据是否有变化；
- 验证结果好得不合理：优先排查数据泄漏；
- 每次运行差异巨大：检查种子、切分、shuffle、环境和非确定性算子。

## 三条必须守住的数据边界

### 训练集和验证集不能泄漏

数据泄漏是指训练过程直接或间接使用了本应只用于验证的信息。例如：

- 同一 scene 的相邻帧同时进入训练集和验证集；
- 先使用全量数据计算均值和方差，再切分数据；
- 根据验证集表现反复人工修改标签；
- 训练时错误地遍历了验证 `DataLoader`；
- 文件重复、样本 ID 重复或增强版本跨集合出现。

自动驾驶连续帧高度相似，因此 nuScenes 等数据集通常需要按 scene 切分，而不是随机按单帧切分。

### 随机种子不是“正确性证明”

设置种子能让随机初始化、数据切分和 shuffle 更容易复现，但不能保证：

- 数据没有错误；
- 算法没有 bug；
- 所有设备上的浮点结果完全一致；
- 模型具有泛化能力。

种子必须与依赖版本、设备、数据版本和配置一起记录。

### 验证集不能被当成训练集反复使用

如果不断根据验证集选择参数，验证集信息也会逐渐渗入开发过程。正式项目还需要独立测试集；测试集只在方案基本确定后使用。

## 引导实验

### 实验 A：验证梯度真的存在

在第一次 `loss.backward()` 后、`optimizer.step()` 前打印：

```python
print(model.weight.grad)
print(model.bias.grad)
```

完成以下记录：

1. 两个梯度的 shape；
2. 梯度是否为 `None`；
3. 执行 `optimizer.step()` 前后的参数差值；
4. 解释为什么差值方向通常与梯度方向相反。

### 实验 B：用有限差分检查自动微分

对一个简单标量函数：

$$
f(w)=(w-3)^2
$$

解析导数为：

$$
f'(w)=2(w-3)
$$

有限差分近似为：

$$
f'(w)\approx\frac{f(w+h)-f(w-h)}{2h}
$$

请在 $w=1$、$h=10^{-4}$ 时，对比解析导数、有限差分和 PyTorch 自动微分。三者应当接近，但浮点误差使它们不必完全相同。

### 实验 C：改变学习率

分别使用：

```text
0.0001、0.05、1.0
```

每次都从相同随机种子重新初始化模型，绘制三组曲线并回答：

- 哪个学习率收敛太慢？
- 哪个学习率较稳定？
- 哪个学习率可能震荡或发散？
- 为什么比较学习率时必须重置模型？

### 实验 D：制造一次泄漏

仅在隔离实验中，故意让验证集等于训练集并观察验证损失。然后恢复正确切分，并写下：

- 泄漏后的曲线为什么“漂亮”；
- 为什么漂亮的指标反而可能是风险信号；
- 在真实 nuScenes 任务中如何通过 scene token 检查交集。

禁止把故意泄漏的结果作为正式实验结论。

## 独立迁移任务

在不照抄本页回归代码的前提下，完成一个二维二分类线性模型：

1. 生成两类二维点，输入 shape 为 $(N,2)$；
2. 固定随机种子，并独立切分训练集和验证集；
3. 使用 `nn.Linear(2, 2)` 输出两个类别的 logits；
4. 使用 `nn.CrossEntropyLoss()`；
5. 完成训练和验证函数；
6. 记录训练/验证损失与准确率；
7. 绘制损失曲线；
8. 保存模型参数和实验配置；
9. 至少诊断一次你真实遇到的错误。

注意：`CrossEntropyLoss` 接收未经 softmax 的 logits，标签通常应是 shape 为 $(N,)$ 的整数类别编号，dtype 为 `torch.long`。不要在模型输出后自行重复调用 softmax。

最低完成条件：验证准确率达到合理水平不是唯一标准；还必须证明没有样本 ID 交集、代码能够从空环境重新运行，并能解释每一步为何存在。

## 常见错误案例

| 现象 | 常见原因 | 先检查什么 | 修复方向 |
|---|---|---|---|
| shape 报错 | 矩阵内维不匹配 | 打印每个张量的 shape | 明确 batch/feature/output 维 |
| 没报错但 loss 奇怪 | 标签被意外广播 | 比较预测和标签 shape | 用 `assert` 强制一致 |
| loss 不下降 | 忘记 `backward()` 或 `step()` | 检查 `.grad` 和参数变化 | 恢复完整更新顺序 |
| 梯度越来越大 | 学习率过高或输入尺度异常 | 梯度范数、输入范围 | 降低学习率、检查数据 |
| 显存或内存持续增加 | 验证时保留计算图 | 是否使用 `no_grad()` | 验证阶段关闭梯度 |
| 验证结果异常优秀 | 数据泄漏或重复样本 | 样本/scene ID 交集 | 重新按数据边界切分 |
| 每次结果差异很大 | 种子或切分未固定 | 记录随机状态和索引 | 统一种子并保存 split |
| 设备不一致报错 | 模型和数据位于不同设备 | 打印 `.device` | 模型、输入、标签移到同一设备 |
| 验证结果不稳定 | 忘记 `model.eval()` | 检查当前模式 | 验证前切换 eval 模式 |
| 指标正确但样本错位 | 特征与标签排序不同 | 抽样显示 ID、输入和标签 | 用稳定主键进行对齐 |

面对错误时，不要先“多训练几轮”。先保留报错、输入 shape、样本 ID、参数梯度和最小复现，再定位故障层次。

## 应提交的学习证据

请提交一个目录，至少包含：

```text
training-loop-evidence/
├── README.md
├── train.py
├── config.json
├── split.json
├── metrics.json
├── loss-curve.png
├── model.pt
└── error-note.md
```

证据要求：

- `README.md`：环境、运行命令、任务定义和结果解释；
- `train.py`：可从头训练和验证，不依赖 Notebook 隐藏状态；
- `config.json`：随机种子、epoch、batch size、学习率和数据版本；
- `split.json`：训练/验证样本 ID，能够证明两者无交集；
- `metrics.json`：每个 epoch 的训练和验证指标；
- `loss-curve.png`：图例、横纵轴和标题完整；
- `model.pt`：通过 `state_dict` 保存的模型参数；
- `error-note.md`：一次真实错误的现象、假设、证据、修复和复测结果。

导师应能够仅根据这些文件复现实验，不需要询问“你当时点了哪个单元格”。

## 0–3 级验收量表

| 维度 | 0：未建立 | 1：跟随完成 | 2：独立完成 | 3：迁移与诊断 |
|---|---|---|---|---|
| 机制理解 | 无法区分模型、损失、梯度和优化器 | 能复述步骤但解释不清因果 | 能用公式和 shape 解释完整闭环 | 能推导简单梯度并解释链式法则 |
| 独立实现 | 代码无法运行 | 依赖逐行提示才能运行 | 能独立写出训练和验证函数 | 能迁移到新的线性分类任务 |
| 数据边界 | 不区分训练与验证 | 知道要切分但无法证明隔离 | 能保存 split 并检查 ID 无交集 | 能识别 scene 级泄漏和重复样本 |
| 诊断能力 | 只会重跑或调 epoch | 能读取报错但不会缩小范围 | 能检查 shape、梯度、参数和曲线 | 能设计最小实验区分多个假设 |
| 证据与复现 | 无运行记录 | 有截图但缺配置 | 产物完整，固定种子，可重新运行 | 能说明跨设备差异和复现边界 |

通过标准：

- 五个维度均达到 $2$ 级；
- “数据边界”必须达到 $3$ 级；
- 独立任务能够重新运行；
- 导师随机删除模型文件后，学习者能够从配置重新训练并解释结果差异。

## 本课之后学什么

完成本课后，按照以下顺序继续，不要把所有模型堆进这一页：

1. **多层感知机与泛化**：隐藏层、激活函数、欠拟合、过拟合、权重衰减和 Dropout；
2. **卷积神经网络**：图像张量、卷积核、通道、padding、stride 和 pooling；
3. **现代卷积网络与 ResNet**：BatchNorm、残差连接、迁移学习；
4. **计算机视觉数据任务**：图像增广、边界框、IoU、NMS、检测与分割数据集；
5. **nuScenes 小项目**：按 scene 切分、标注投影、数据质检、微调、指标和失败样本分析。

本课是这些模块的共同先修课，不替代它们。

## 来源与延伸阅读

本页以训练闭环为教学目标进行原创组织和示例编写，参考以下官方资料；延伸阅读时建议只选择 PyTorch 路线：

- [《动手学深度学习》第二版：预备知识](https://zh-v2.d2l.ai/chapter_preliminaries/index.html)
- [《动手学深度学习》第二版：自动微分](https://zh-v2.d2l.ai/chapter_preliminaries/autograd.html)
- [《动手学深度学习》第二版：线性神经网络](https://zh-v2.d2l.ai/chapter_linear-networks/index.html)
- [《动手学深度学习》第二版：多层感知机](https://zh-v2.d2l.ai/chapter_multilayer-perceptrons/index.html)
- [PyTorch 官方教程：Optimization Loop](https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html)
- [PyTorch 官方文档：`torch.nn.Module`](https://docs.pytorch.org/docs/stable/generated/torch.nn.Module.html)
- [PyTorch 官方文档：`torch.no_grad`](https://docs.pytorch.org/docs/stable/generated/torch.no_grad.html)
