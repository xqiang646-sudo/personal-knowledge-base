---
layout: layouts/course.njk
courseId: linear-algebra-coordinate
permalink: /learn/math/linear-algebra-coordinate.html
math: true
---

## 为什么线性代数要和坐标系一起学

线性代数不是为了练习大矩阵手算。它提供了一种精确语言，让我们能说明“这个点在哪里”“这个数组每个维度是什么”“怎样把同一个物体从传感器坐标系表示到车辆或世界坐标系”。

在 nuScenes 中，相机、激光雷达、车辆和全局地图都有自己的坐标系。一个激光点的三维数字本身没有完整意义，必须同时知道：

- 这个向量在哪个坐标系中表达；
- 每个轴朝哪个方向；
- 单位是什么；
- 要使用哪一时刻的传感器标定和车辆位姿；
- 变换矩阵从哪个坐标系映射到哪个坐标系。

深度学习同样离不开线性代数：一批图像、点云、标签和模型参数都表示为张量；网络的大部分计算最终落在矩阵乘法、按轴归约和广播上。

本课预计用时 $10$–$12$ 小时。完成后，你应该能够从向量、基和矩阵乘法出发，独立实现二维与三维刚体变换，并用往返测试发现方向或顺序错误。

## 课前诊断

请先独立回答。答错并不妨碍学习，但要把不确定的地方做上标记。

1. 向量 $\mathbf p=[2,1]^\mathsf T$ 是行向量还是列向量？它的形状怎样表示？
2. $A\in\mathbb R^{3\times2}$、$B\in\mathbb R^{2\times4}$，$AB$ 的形状是什么？$BA$ 是否存在？
3. 点 $P=(3,4)$ 到原点的距离是多少？
4. $90^\circ$ 等于多少弧度？
5. 如果 $R$ 是旋转矩阵，$R^{-1}$ 与 $R^\mathsf T$ 有什么关系？不知道可以先写“不知道”。
6. “传感器原点在车辆原点前方 $1\,\mathrm m$”描述的是旋转、平移，还是二者都可能涉及？
7. 为什么 $T_{GE}T_{ES}$ 与 $T_{ES}T_{GE}$ 通常不是同一件事？
8. 一个点云数组形状为 $(N,4)$，你认为四列可能表示什么？哪些信息不能只看 shape 得知？

建议先通过“数学入口诊断”，并能够使用 NumPy 创建数组、查看 `shape`、调用 `np.sin` 和 `np.cos`。

## 核心章节

### 1. 标量、向量、矩阵与张量

标量是单个数，例如速度 $v=5\,\mathrm{m/s}$。向量是有序分量，例如二维点

$$
\mathbf p=
\begin{bmatrix}
x\\y
\end{bmatrix}.
$$

矩阵可以看成一组按行列排列的数，也可以看成把一个向量映射成另一个向量的函数：

$$
\mathbf y=A\mathbf x.
$$

张量是更高维数组。图像批次常写为

$$
\mathbf X\in\mathbb R^{N\times C\times H\times W}.
$$

shape 只能告诉我们尺寸，不能自动告诉我们单位、坐标系或语义。工程变量应至少附带四项信息：名称、shape、单位、坐标系。

### 2. 向量几何

二维向量的欧氏范数为

$$
\lVert\mathbf p\rVert_2=\sqrt{x^2+y^2}.
$$

点积为

$$
\mathbf a^\mathsf T\mathbf b
=\sum_{i=1}^{n}a_i b_i
=\lVert\mathbf a\rVert_2\lVert\mathbf b\rVert_2\cos\theta.
$$

它可以衡量两个方向的相似程度：点积为正表示夹角小于 $90^\circ$，为零表示正交，为负表示大致相反。

单位向量为

$$
\hat{\mathbf a}=\frac{\mathbf a}{\lVert\mathbf a\rVert_2},
$$

但当 $\lVert\mathbf a\rVert_2$ 接近零时不能直接归一化，代码中必须设置容差并明确处理。

### 3. 矩阵乘法与变换顺序

若

$$
A\in\mathbb R^{m\times n},\qquad
B\in\mathbb R^{n\times k},
$$

则

$$
AB\in\mathbb R^{m\times k}.
$$

中间维度必须相等。矩阵乘法通常不满足交换律：

$$
AB\neq BA.
$$

在坐标链中，右侧变换先作用。若 $T_{ES}$ 把传感器坐标变到车辆坐标，$T_{GE}$ 把车辆坐标变到全局坐标，则

$$
\tilde{\mathbf p}_G
=T_{GE}T_{ES}\tilde{\mathbf p}_S.
$$

不能为了“看起来顺眼”而交换乘法顺序。

### 4. 旋转、平移与刚体变换

二维逆时针旋转矩阵为

$$
R(\theta)=
\begin{bmatrix}
\cos\theta & -\sin\theta\\
\sin\theta & \cos\theta
\end{bmatrix}.
$$

旋转保持长度和夹角，因此满足

$$
R^\mathsf T R=I,
\qquad
R^{-1}=R^\mathsf T,
\qquad
\det(R)=1.
$$

平移不是线性变换，因为原点经过平移后不再映射到原点。把旋转和平移组合起来可写为

$$
\mathbf p_B=R_{BA}\mathbf p_A+\mathbf t_{BA}.
$$

本课统一约定：下标 $BA$ 表示“把在 $A$ 坐标系中的坐标，变换成在 $B$ 坐标系中的坐标”。$\mathbf t_{BA}$ 是 $A$ 坐标系原点在 $B$ 坐标系中的位置表达。

### 5. 齐次坐标

为把旋转和平移统一成一次矩阵乘法，在点坐标末尾补 $1$：

$$
\tilde{\mathbf p}_A=
\begin{bmatrix}
\mathbf p_A\\1
\end{bmatrix},
\qquad
T_{BA}=
\begin{bmatrix}
R_{BA} & \mathbf t_{BA}\\
\mathbf 0^\mathsf T & 1
\end{bmatrix}.
$$

于是

$$
\tilde{\mathbf p}_B=T_{BA}\tilde{\mathbf p}_A.
$$

三维点使用 $4\times4$ 齐次变换矩阵。方向向量不应受到平移影响，所以把方向写成齐次形式时末尾使用 $0$，而不是 $1$。

### 6. 变换复合与求逆

若 $A\rightarrow B\rightarrow C$，则

$$
T_{CA}=T_{CB}T_{BA}.
$$

刚体变换的逆可以直接写成

$$
T_{AB}=T_{BA}^{-1}
=
\begin{bmatrix}
R_{BA}^\mathsf T & -R_{BA}^\mathsf T\mathbf t_{BA}\\
\mathbf 0^\mathsf T & 1
\end{bmatrix}.
$$

这说明“反向变换”不是简单地把平移取负；必须先把平移旋转到正确的坐标表达中。

### 7. 从数学对象到 nuScenes 数据

nuScenes 的 `sample_data` 记录会关联传感器标定和车辆位姿。一个常见几何链是：

$$
\text{sensor}
\rightarrow
\text{ego at capture time}
\rightarrow
\text{global}.
$$

概念上可写为

$$
\tilde{\mathbf p}_{G}
=T_{GE(t)}T_{ES}\tilde{\mathbf p}_{S}.
$$

$T_{ES}$ 描述传感器相对车辆的标定；$T_{GE(t)}$ 描述采集时刻车辆在全局坐标中的位姿。它们含义不同，不能因为都是旋转和平移就混用。

nuScenes 使用四元数存储部分旋转。四元数到旋转矩阵的转换放在后续坐标系专题中；本课先确保你能读懂“从哪到哪”、正确复合矩阵并验证逆变换。

### 8. 张量的轴、归约与广播

深度学习和数据处理常把多个样本堆叠起来。若点云批次为

$$
\mathbf P\in\mathbb R^{B\times N\times3},
$$

则 $B$ 是批次，$N$ 是每帧点数，最后一维是 $(x,y,z)$。对 `axis=1` 求均值会为每一帧得到一个三维中心，输出形状为 $(B,3)$。

广播允许形状兼容的数组自动扩展。例如从每个点减去同一个三维平移向量。但广播成功不等于语义正确：如果轴顺序错了，程序可能不报错却产生错误结果。

## 逐步例题：传感器点变到车辆坐标

定义 $T_{ES}$ 把传感器坐标 $S$ 变到车辆坐标 $E$。假设传感器坐标系相对车辆坐标系逆时针旋转 $90^\circ$，传感器原点在车辆坐标中位于 $(1,0)\,\mathrm m$。

第一步，将角度换成弧度：

$$
\theta=90^\circ=\frac{\pi}{2}.
$$

第二步，写旋转矩阵：

$$
R_{ES}=
\begin{bmatrix}
0&-1\\
1&0
\end{bmatrix}.
$$

第三步，写平移：

$$
\mathbf t_{ES}=
\begin{bmatrix}
1\\0
\end{bmatrix}\mathrm m.
$$

第四步，传感器测得点

$$
\mathbf p_S=
\begin{bmatrix}
2\\1
\end{bmatrix}\mathrm m.
$$

先旋转，再平移：

$$
\begin{aligned}
\mathbf p_E
&=R_{ES}\mathbf p_S+\mathbf t_{ES}\\
&=
\begin{bmatrix}
0&-1\\1&0
\end{bmatrix}
\begin{bmatrix}
2\\1
\end{bmatrix}
+
\begin{bmatrix}
1\\0
\end{bmatrix}\\
&=
\begin{bmatrix}
-1\\2
\end{bmatrix}
+
\begin{bmatrix}
1\\0
\end{bmatrix}
=
\begin{bmatrix}
0\\2
\end{bmatrix}\mathrm m.
\end{aligned}
$$

第五步，做两类检查：

- 距离检查：旋转前后相对传感器原点的长度都应为 $\sqrt5\,\mathrm m$；
- 往返检查：应用 $T_{SE}=T_{ES}^{-1}$ 后应回到原点坐标 $[2,1]^\mathsf T$。

## 引导实验：实现可验证的二维刚体变换

```python
import numpy as np

def rotation_2d(theta_rad: float) -> np.ndarray:
    c = np.cos(theta_rad)
    s = np.sin(theta_rad)
    return np.array([[c, -s],
                     [s,  c]], dtype=float)

def make_transform_2d(theta_rad: float, translation_xy) -> np.ndarray:
    T = np.eye(3, dtype=float)
    T[:2, :2] = rotation_2d(theta_rad)
    T[:2, 2] = np.asarray(translation_xy, dtype=float)
    return T

def transform_points_2d(T_ba: np.ndarray, points_a: np.ndarray) -> np.ndarray:
    """T_ba maps coordinates in frame A into frame B."""
    points_a = np.asarray(points_a, dtype=float)
    if points_a.ndim != 2 or points_a.shape[1] != 2:
        raise ValueError("points_a must have shape (N, 2)")
    ones = np.ones((points_a.shape[0], 1), dtype=float)
    points_a_h = np.concatenate([points_a, ones], axis=1)
    points_b_h = (T_ba @ points_a_h.T).T
    return points_b_h[:, :2]

theta = np.deg2rad(90.0)
T_es = make_transform_2d(theta, [1.0, 0.0])
points_s = np.array([[2.0, 1.0],
                     [0.0, 0.0],
                     [1.0, 0.0]])

points_e = transform_points_2d(T_es, points_s)
points_s_roundtrip = transform_points_2d(np.linalg.inv(T_es), points_e)

assert np.allclose(points_e[0], [0.0, 2.0])
assert np.allclose(points_s_roundtrip, points_s, atol=1e-9)

R_es = T_es[:2, :2]
assert np.allclose(R_es.T @ R_es, np.eye(2), atol=1e-9)
assert np.isclose(np.linalg.det(R_es), 1.0)
```

在此基础上完成四项修改：

1. 增加第二个变换 $T_{GE}$，验证 $T_{GS}=T_{GE}T_{ES}$；
2. 故意交换乘法顺序，记录结果为什么错误或为什么维度不匹配；
3. 把输入点改成 shape 为 $(2,N)$，观察原函数怎样拒绝它，再明确转换方式；
4. 编写 `invert_rigid_transform_2d`，使用 $R^\mathsf T$ 和 $-R^\mathsf T\mathbf t$，并与 `np.linalg.inv` 对照。

## 独立任务：模拟一条 nuScenes 坐标链

不依赖 nuScenes SDK，使用自建小数据完成以下任务：

1. 定义三个坐标系：`sensor`、`ego`、`global`；
2. 明确每个坐标系的轴方向和单位；
3. 自行设置 $T_{ES}$ 与 $T_{GE}$，至少包含一次非零旋转和一次非零平移；
4. 将至少五个二维传感器点变换到全局坐标；
5. 使用一步复合变换和两步连续变换分别计算，验证结果一致；
6. 从全局坐标往返到传感器坐标，报告最大误差；
7. 植入一个“角度未转弧度”或“乘法顺序颠倒”的错误，说明哪项测试能发现它；
8. 画出三个坐标系原点、坐标轴和点的位置，图例中注明坐标系。

验收时导师会替换一组变换参数和点，要求你在未见过的数据上重新运行，避免只记住固定答案。

## 常见错误案例

### 变换方向没有写清

只命名为 `transform` 无法判断它从哪里到哪里。建议使用 `T_ba` 或 `T_target_source`，并在函数文档中写出映射关系。

### 交换矩阵乘法顺序

$T_{GE}T_{ES}$ 表示先从传感器到车辆，再从车辆到全局。写成 $T_{ES}T_{GE}$ 不仅语义错误，在三维齐次矩阵同形时还可能静默得到一个“能运行的错答案”。

### 把点当作行向量却套用列向量公式

本文公式采用列向量。代码为了批处理把点存成 $(N,2)$，所以先补齐次维，再转置后左乘矩阵。必须说明数学约定与存储布局之间的桥接。

### 认为反向变换只需把平移取负

正确的逆平移是 $-R^\mathsf T\mathbf t$，不是简单的 $-\mathbf t$。

### 混用度和弧度

旋转矩阵的三角函数输入是弧度。应在边界处转换，并在变量名中使用 `_deg` 或 `_rad`。

### 把不同时间的车辆位姿混在一起

传感器标定描述固定安装关系，车辆位姿随时间变化。在 nuScenes 中必须跟随具体 `sample_data` 记录取得对应的 `ego_pose`。

### 只检查图像“看起来差不多”

可视化是检查之一，但不能代替数值测试。至少应检查旋转正交性、行列式、复合一致性和往返误差。

## 需要提交的证据

- 带下标约定的手算推导；
- 每个数组的 shape、单位与坐标系说明；
- 可运行的二维变换代码；
- 旋转正交性、复合一致性和往返测试；
- 坐标轴与点的可视化；
- 至少一个人为错误及其检测证据；
- 一段说明：nuScenes 中传感器标定与车辆位姿分别解决什么问题。

## 0–3 级验收量表

| 等级 | 概念与推导 | 实现与证据 | 边界意识 |
|---:|---|---|---|
| 0 | 无法说明向量、矩阵或变换方向 | 代码不能运行，或无测试 | 不记录单位和坐标系 |
| 1 | 在提示下能套用公式，但会混淆顺序、行列向量或逆变换 | 能复现示例，无法独立修改 | 只凭可视化判断正确 |
| 2 | 能独立推导、复合和求逆，并解释 shape | 通过正交性、复合和往返测试 | 主动检查单位、方向、时间和容差 |
| 3 | 能诊断未见过的坐标错误，并清楚解释主动/被动变换差异 | 能设计失败用例并指导他人复核 | 能把数学约定准确映射到 nuScenes 数据关系 |

通过门槛：三列均达到等级 2，且往返误差、乘法顺序、度与弧度三项不能有未解释错误。

## 来源与延伸阅读

- [《动手学深度学习》第二版：线性代数](https://zh-v2.d2l.ai/chapter_preliminaries/linear-algebra.html)：标量、向量、矩阵、张量、矩阵乘法与范数的实践入口。
- [《视觉 SLAM 十四讲》第二版代码仓库](https://github.com/gaoxiang12/slambook2)：后续刚体运动、旋转表示和李群课程的参考入口。
- [nuScenes 官方教程](https://www.nuscenes.org/tutorials/nuscenes_tutorial.html)：核对 `sample_data`、`calibrated_sensor`、`ego_pose` 等数据关系。
- [nuScenes devkit](https://github.com/nutonomy/nuscenes-devkit)：后续使用真实数据和官方坐标转换实现时的代码来源。
- [NumPy 线性代数参考](https://numpy.org/doc/stable/reference/routines.linalg.html)：核对范数、行列式和矩阵求逆接口。

本课以自动驾驶坐标链重新组织例题。参考资料用于核对概念和接口，不应替代对每个下标、坐标系、单位和时间戳的独立说明。
