# Personal Knowledge Base

面向零基础实习生的自动驾驶学习知识库，使用 GitHub Pages 发布。首页不是文章列表，而是一条包含诊断、练习、交付物和阶段验收的统一学习路线。

## 三个入口

- [`index.html`](index.html)：唯一学习主线。按 7 个阶段依次完成 16 门课程，建议投入 110–150 小时。
- [`notes/autonomous-driving-index.html`](notes/autonomous-driving-index.html)：按主题查阅已有知识，不定义另一套学习顺序。
- [`notes/mentor-index.html`](notes/mentor-index.html)：导师备课、课前诊断、课中讲解、课后验收与 M01–M08 映射面板。

## 零基础学习路线

| 阶段 | 课程 | 建议投入 | 阶段产物 |
| --- | --- | --- | --- |
| 0 零基础预备 | [零基础预备课](notes/foundations-bootcamp.html) | 18–24h | 基础诊断表与最小练习 |
| 1 系统全景 | [系统总览](notes/autonomous-driving-overview.html) → [车辆硬件与网络](notes/vehicle-hardware-network.html) → [GPU 工作流程](notes/gpu-workflow.html) | 6–8h | 系统闭环与数据链图 |
| 2 工具与证据 | [工程工具](notes/engineering-toolkit.html) → [证据优先排障](notes/evidence-first-engineering.html) | 8–12h | 带环境边界的证据卡 |
| 3 坐标、感知与数据 | [坐标系转换](notes/coordinate-transformations.html) → [感知与地图](notes/perception-maps.html) → [nuScenes 数据任务](notes/nuscenes-dataset.html) | 28–36h | 可追溯 mini 数据包 |
| 4 Autoware 与 ROS 2 | [规划控制与 Autoware](notes/planning-autoware.html) → [ROS 2 数据链排障](notes/ros2-autoware-debugging.html) | 14–18h | 只读断链分析报告 |
| 5 车辆运动与控制 | [阿克曼与自行车模型](notes/ackermann-bicycle-model.html) → [曲率计算](notes/curvature-calculation.html) → [CAN 接口](notes/can-bus-interface.html) | 20–24h | 轨迹仿真、曲率测试与离线报文解码 |
| 6 工程交付 | [训练到部署契约](notes/perception-deployment-contracts.html) → [验证闭环](notes/validation-closure.html) | 16–24h | 可由他人复现的结业证据包 |

每课按“诊断 → 理解 → 动手 → 留证 → 过门”完成。已有经验可以通过诊断跳过局部讲解，但不能跳过阶段交付和验收。

## 内容与公式

- `assets/knowledge.css`：首页、课程页和移动端共用样式。
- `assets/`：知识库图片资源。
- `notes/`：课程正文、专题索引和带教面板。
- 数学课程使用 LaTeX 语法，由 MathJax 4 在浏览器中渲染。

## 本地预览

在仓库根目录执行：

```bash
python3 -m http.server 8000
```

然后访问 `http://127.0.0.1:8000/`。不要直接双击 HTML 文件验证跨页链接和资源路径。

## 公开内容边界

课程使用原创文字、公开官方资料和通用或合成示例，不收录真实账号、密码、IP、主机名、车辆标识、内部仓库路径、现场日志或未公开指标。完成课程不自动获得真实车辆写操作、生产发布或正式验收权限；项目结论仍需在目标主机、版本、配置和场景中重新验证。
