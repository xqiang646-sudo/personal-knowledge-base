---
layout: layouts/course.njk
courseId: calculus-curvature
permalink: /learn/math/calculus-curvature.html
math: true
---

## 为什么从变化率学到曲率

自动驾驶系统处理的不是静止数字，而是随时间和空间变化的量：车辆位置在变化、航向角在变化、轨迹的弯曲程度在变化，模型损失也会随参数变化。

微积分给这些变化一个可计算的语言：

- 一阶导数描述“变化得多快”，例如速度和轨迹切线；
- 二阶导数描述“变化率本身怎样变化”，例如加速度和弯曲趋势；
- 偏导数与梯度描述多参数系统怎样调整，是深度学习训练的基础；
- 积分描述变化量的累积，例如从速度恢复位移；
- 曲率把一阶、二阶导数组合起来，描述轨迹在某一点弯得有多急。

如果只背曲率公式，很容易在采样间隔、单位、左右转符号或噪声上出错。本课从差商和切线开始，推导解析曲率，再过渡到离散轨迹的数值计算。

本课预计用时 $14$–$17$ 小时。完成后，你应能解释曲率公式每一项的来源，用 NumPy 实现两种离散曲率算法，并说明结果在哪些条件下不可靠。

## 课前诊断

1. 若车辆在 $0.5\,\mathrm s$ 内前进 $2\,\mathrm m$，平均速度是多少？
2. 函数 $f(x)=x^2$ 在 $x=2$ 附近是上升还是下降？你如何从图像判断？
3. 写出 $\sin(0)$、$\cos(0)$，并说明角度输入应使用度还是弧度。
4. 点 $A=(0,0)$ 到点 $B=(3,4)$ 的距离是多少？
5. 如果轨迹是一条直线，你预计曲率是正数、负数还是零？
6. 半径分别为 $5\,\mathrm m$ 和 $20\,\mathrm m$ 的圆，哪一个弯得更急？
7. 为什么用相邻两个采样点做差会放大位置噪声？
8. 对损失 $L(w)=(w-3)^2$，当 $w=5$ 时，要让损失变小，$w$ 应增大还是减小？

建议先通过数学入口诊断，并完成向量范数、坐标方向与 NumPy shape 的基础学习。

## 核心章节

### 1. 函数与平均变化率

设位置是时间的函数 $x(t)$。从 $t$ 到 $t+\Delta t$ 的平均速度为

$$
\bar v=\frac{x(t+\Delta t)-x(t)}{\Delta t}.
$$

几何上，这是函数图像上两个点之间割线的斜率。$\Delta t$ 越小，割线越接近该点的切线，但实际数据中步长太小又会放大测量噪声，所以“越小越好”并不总成立。

### 2. 极限与导数

瞬时变化率定义为差商在步长趋近于零时的极限：

$$
f'(x)=\lim_{h\to0}\frac{f(x+h)-f(x)}{h}.
$$

常用求导规则包括：

$$
\frac{d}{dx}x^n=nx^{n-1},
\qquad
\frac{d}{dx}\sin x=\cos x,
\qquad
\frac{d}{dx}\cos x=-\sin x.
$$

复合函数使用链式法则：

$$
\frac{d}{dx}f(g(x))=f'(g(x))g'(x).
$$

链式法则不仅用于手算，也解释了神经网络反向传播为什么可以把复杂计算拆成局部导数相乘。

### 3. 一阶与二阶导数的物理意义

若 $x(t)$ 是一维位置，则

$$
v(t)=\frac{dx}{dt},
\qquad
a(t)=\frac{d^2x}{dt^2}.
$$

单位会随求导改变。位置单位是米，一阶时间导数单位为 $\mathrm{m/s}$，二阶时间导数单位为 $\mathrm{m/s^2}$。

对于二维参数曲线

$$
\mathbf r(t)=
\begin{bmatrix}
x(t)\\y(t)
\end{bmatrix},
$$

速度和加速度向量分别为

$$
\mathbf r'(t)=
\begin{bmatrix}
x'(t)\\y'(t)
\end{bmatrix},
\qquad
\mathbf r''(t)=
\begin{bmatrix}
x''(t)\\y''(t)
\end{bmatrix}.
$$

轨迹的切线方向由 $\mathbf r'(t)$ 给出。若速度接近零，切线和曲率估计都会变得不稳定。

### 4. 积分是变化量的累积

如果已知速度，可以通过积分得到位移：

$$
x(t_1)-x(t_0)=\int_{t_0}^{t_1}v(t)\,dt.
$$

离散数据中常用求和或梯形法近似：

$$
\Delta x
\approx
\sum_{i=0}^{n-1}
\frac{v_i+v_{i+1}}{2}\Delta t_i.
$$

车辆模型的离散仿真也使用相同思想。例如欧拉法把状态微分方程

$$
\dot{\mathbf x}=f(\mathbf x,\mathbf u)
$$

近似为

$$
\mathbf x_{k+1}
=\mathbf x_k+\Delta t\,f(\mathbf x_k,\mathbf u_k).
$$

### 5. 多元函数、偏导数与梯度

深度学习损失通常依赖很多参数。对

$$
L=L(w_1,w_2,\ldots,w_n),
$$

固定其他变量，只改变 $w_i$，得到偏导数

$$
\frac{\partial L}{\partial w_i}.
$$

把所有偏导数组合起来得到梯度：

$$
\nabla_{\mathbf w}L=
\begin{bmatrix}
\frac{\partial L}{\partial w_1}\\
\vdots\\
\frac{\partial L}{\partial w_n}
\end{bmatrix}.
$$

梯度指向函数局部增长最快的方向，所以最基本的梯度下降使用

$$
\mathbf w_{k+1}
=\mathbf w_k-\eta\nabla_{\mathbf w}L,
$$

其中 $\eta$ 是学习率。

### 6. 曲率的几何含义

曲率描述单位弧长上切线方向变化得有多快。若曲线用弧长 $s$ 参数化，单位切向量为 $\mathbf T(s)$，则

$$
\kappa=\left\lVert\frac{d\mathbf T}{ds}\right\rVert.
$$

圆的曲率处处相同：

$$
\kappa=\frac{1}{R}.
$$

半径越小，曲率越大，转弯越急。曲率单位为 $\mathrm{m}^{-1}$。

对一般二维参数曲线，带符号曲率可写成

$$
\kappa(t)=
\frac{x'(t)y''(t)-y'(t)x''(t)}
{\left(x'(t)^2+y'(t)^2\right)^{3/2}}.
$$

按本文约定，坐标系 $x$ 轴向前、$y$ 轴向左且参数沿行驶方向增加时，$\kappa>0$ 表示左转，$\kappa<0$ 表示右转。若只需要弯曲强度，可取 $|\kappa|$，但不要在需要左右方向的控制任务中提前丢掉符号。

若曲线写成 $y=f(x)$，可得到

$$
\kappa(x)=
\frac{f''(x)}{\left(1+f'(x)^2\right)^{3/2}}.
$$

### 7. 离散轨迹的三点曲率

真实轨迹往往只有采样点。取连续三点 $A$、$B$、$C$，定义边长

$$
a=\lVert B-C\rVert,
\qquad
b=\lVert C-A\rVert,
\qquad
c=\lVert A-B\rVert.
$$

二维叉积标量为

$$
z=(B-A)_x(C-A)_y-(B-A)_y(C-A)_x.
$$

三点不共线时，它们确定一个外接圆，带符号曲率为

$$
\kappa=\frac{2z}{abc}.
$$

当三点重合或某条边过短时，乘积 $abc$ 才会接近零；三点几乎共线时，主要问题是面积量 $z$ 很小，曲率符号容易被坐标噪声翻转。代码应分别设置最小边长阈值和随轨迹尺度变化的面积阈值：前者判定无效点，后者把数值上近似直线的三点稳定地视为零曲率。

### 8. 数值导数与采样误差

内部采样点常用中心差分：

$$
x'(t_i)\approx
\frac{x(t_{i+1})-x(t_{i-1})}
{t_{i+1}-t_{i-1}}.
$$

二阶导数对噪声更敏感。工程上要同时检查：

- 采样间隔是否均匀；
- 时间戳或弧长参数是否正确；
- 是否存在重复点；
- 是否需要先做有边界说明的平滑；
- 端点采用了什么差分策略；
- 曲率峰值是否来自真实道路还是测量噪声。

## 逐步例题一：圆的曲率为什么是 $1/R$

令半径为 $R$ 的圆参数化为

$$
x(t)=R\cos t,
\qquad
y(t)=R\sin t.
$$

一阶导数为

$$
x'(t)=-R\sin t,
\qquad
y'(t)=R\cos t.
$$

二阶导数为

$$
x''(t)=-R\cos t,
\qquad
y''(t)=-R\sin t.
$$

代入曲率分子：

$$
x'y''-y'x''
=R^2\sin^2t+R^2\cos^2t
=R^2.
$$

代入分母：

$$
\left(x'^2+y'^2\right)^{3/2}
=\left(R^2\sin^2t+R^2\cos^2t\right)^{3/2}
=R^3.
$$

因此

$$
\kappa=\frac{R^2}{R^3}=\frac{1}{R}.
$$

结果与参数 $t$ 无关，符合圆在每一点弯曲程度相同的直觉。

## 逐步例题二：三个点的离散曲率

取单位圆上的三点

$$
A=(1,0),\qquad B=(0,1),\qquad C=(-1,0).
$$

三条边长为

$$
a=\sqrt2,\qquad b=2,\qquad c=\sqrt2.
$$

叉积标量为

$$
z=(-1,1)\times(-2,0)=2.
$$

所以

$$
\kappa=\frac{2z}{abc}
=\frac{4}{\sqrt2\cdot2\cdot\sqrt2}
=1.
$$

单位圆半径 $R=1$，解析结果也是 $1/R=1$，三点法在这个例子中与解析结果一致。

## 逐步例题三：损失函数的一次梯度更新

设只有一个样本 $x=2$、$y=6$，模型为 $\hat y=wx$，损失为

$$
L(w)=(wx-y)^2.
$$

由链式法则

$$
\frac{dL}{dw}=2(wx-y)x.
$$

当 $w=1$ 时，

$$
\frac{dL}{dw}=2(2-6)\cdot2=-16.
$$

若学习率 $\eta=0.1$，则

$$
w_{\mathrm{new}}
=w-\eta\frac{dL}{dw}
=1-0.1(-16)
=2.6.
$$

负梯度使参数增大，模型输出从 $2$ 接近目标 $6$。这就是后续自动微分和神经网络训练最小闭环的数学原型。

## 引导实验：解析曲率与离散曲率对照

```python
import numpy as np

def signed_curvature_three_points(
    a, b, c, length_eps=1e-12, area_rtol=1e-10
):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    c = np.asarray(c, dtype=float)

    side_a = np.linalg.norm(b - c)
    side_b = np.linalg.norm(c - a)
    side_c = np.linalg.norm(a - b)
    if min(side_a, side_b, side_c) <= length_eps:
        return np.nan

    ab = b - a
    ac = c - a
    cross_z = ab[0] * ac[1] - ab[1] * ac[0]
    scale = max(side_a, side_b, side_c)
    if abs(cross_z) <= area_rtol * scale**2:
        return 0.0

    denominator = side_a * side_b * side_c
    return 2.0 * cross_z / denominator

points = np.array([[1.0, 0.0],
                   [0.0, 1.0],
                   [-1.0, 0.0]])

kappa = signed_curvature_three_points(*points)
assert np.isclose(kappa, 1.0)

def curvature_from_samples(t, x, y, eps=1e-12):
    t = np.asarray(t, dtype=float)
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)

    dx = np.gradient(x, t)
    dy = np.gradient(y, t)
    ddx = np.gradient(dx, t)
    ddy = np.gradient(dy, t)

    numerator = dx * ddy - dy * ddx
    denominator = (dx * dx + dy * dy) ** 1.5
    kappa = np.full_like(numerator, np.nan)
    valid = denominator > eps
    kappa[valid] = numerator[valid] / denominator[valid]
    return kappa

radius = 10.0
t = np.linspace(0.0, np.pi / 2.0, 101)
x = radius * np.cos(t)
y = radius * np.sin(t)
kappa_samples = curvature_from_samples(t, x, y)

#端点差分精度较低，先检查内部区间。
assert np.allclose(kappa_samples[2:-2], 1.0 / radius, atol=2e-4)
```

继续完成四项实验并记录表格：

1. 把采样点数改为 $11$、$21$、$51$、$101$，比较内部区间最大误差；
2. 给 $x,y$ 加入标准差分别为 $0.001\,\mathrm m$、$0.01\,\mathrm m$ 的高斯噪声，观察二阶导数和曲率；
3. 加入两个完全重复的点，确认函数不会返回无穷大；
4. 将点序反转，观察带符号曲率为什么改变符号。

## 独立任务：轨迹曲率质量报告

构造或读取一条不少于 $200$ 个点的二维轨迹，完成：

1. 说明坐标系、单位和点的顺序；
2. 使用参数曲线差分法计算曲率；
3. 使用滑动三点法计算曲率；
4. 画出轨迹和曲率随点序或弧长的变化；
5. 人为加入位置噪声，对比两种算法的变化；
6. 若使用平滑，必须同时给出窗口、边界处理和可能抹去真实急弯的风险；
7. 找出曲率绝对值最大的五个位置，判断它们是道路急弯、端点效应还是噪声；
8. 计算曲率半径 $R=1/|\kappa|$，对近似直线段说明为何不能直接除以零；
9. 写出这条曲率结果是否足以用于车辆控制，以及还缺少哪些验证。

导师验收时会提供一条含重复点、非均匀采样和噪声的隐藏轨迹，要求独立诊断。

## 常见错误案例

### 把点序号当成真实时间或弧长

`np.gradient(x)` 默认相邻索引间隔为 $1$。若真实采样间隔不均匀，应传入时间戳或累计弧长，否则导数单位和数值都会错误。

### 只算一阶差分就称为曲率

一阶导数给切线方向；曲率还需要切线方向怎样变化，因此通常涉及二阶导数。

### 提前取绝对值

$|\kappa|$ 保留弯曲强度，却丢失左转与右转信息。是否取绝对值必须由任务决定。

### 忽略接近零的速度

参数曲率分母包含

$$
\left(x'^2+y'^2\right)^{3/2}.
$$

当速度接近零时会产生巨大或无效结果，必须设置有效掩码。

### 重复点导致三点法除零

三点法分母是三条边长的乘积。任意两个点重合时必须返回无效标记，而不是伪造曲率 $0$。

### 采样越密就一定越准确

无噪声时更密采样通常能减小截断误差；有测量噪声时，过小间隔会放大差分噪声。必须通过步长与噪声实验选择方法。

### 用训练损失下降证明模型有效

梯度下降只说明优化过程能降低当前损失，不代表模型对未见数据有良好泛化。概率和数据切分课程会处理这一边界。

## 需要提交的证据

- 圆曲率和三点曲率的手算推导；
- 带单位的导数、曲率和曲率半径说明；
- 可运行的两种曲率实现；
- 解析值与数值值的误差表；
- 采样密度、噪声和重复点实验；
- 轨迹与曲率可视化；
- 至少三个失败样例及防护策略；
- 一段说明：曲率怎样进入自行车模型，梯度怎样进入深度学习训练。

## 0–3 级验收量表

| 等级 | 数学理解 | 数值实现 | 工程判断 |
|---:|---|---|---|
| 0 | 无法区分位置、速度、加速度和曲率 | 只能粘贴代码，结果不可复现 | 不记录单位、采样或坐标方向 |
| 1 | 能在提示下代公式，但不能解释分子、分母或符号 | 可复现干净圆轨迹，遇到重复点或噪声即失败 | 只看一张曲线就宣布正确 |
| 2 | 能从导数解释曲率并完成圆与三点推导 | 两种算法通过解析、往返式和失败用例检查 | 能说明采样、噪声、端点、符号和零分母边界 |
| 3 | 能诊断未见过的非均匀轨迹并选择合适参数化 | 能量化误差来源、设计鲁棒测试并解释取舍 | 能把曲率可靠衔接到车辆模型和数据验收 |

通过门槛：三列均达到等级 2；隐藏轨迹中不得出现未处理的无穷值，且必须正确保留左右转符号。

## 来源与延伸阅读

- [《动手学深度学习》第二版：微积分](https://zh-v2.d2l.ai/chapter_preliminaries/calculus.html)：导数、偏导数、梯度和链式法则的实践入口。
- [《动手学深度学习》第二版：自动微分](https://zh-v2.d2l.ai/chapter_preliminaries/autograd.html)：把手推梯度连接到 PyTorch 计算图。
- [NumPy `gradient` 文档](https://numpy.org/doc/stable/reference/generated/numpy.gradient.html)：核对非均匀采样、边界和返回值行为。
- [NumPy `trapz`/`trapezoid` 文档](https://numpy.org/doc/stable/reference/generated/numpy.trapezoid.html)：离散积分实验的接口参考。

本课中的轨迹、曲率与验收案例为自动驾驶场景下的重新组织，不复制参考资料的大段正文。公式必须结合参数、单位、方向和数值边界理解。
