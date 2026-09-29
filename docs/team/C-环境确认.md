# C 环境确认（D1）

- 日期：2026-09-24
- 成员：ZhangYiMing（C）
- Git 提交邮箱：1371274369@qq.com
- 操作系统：Windows，终端使用 PowerShell。
- node -v 输出：`v22.23.3`
- npm -v 输出：`10.9.9`
- git --version 输出：`git version 2.53.0.windows.1`
- python --version 输出：`Python 3.12.14`

## size_gate 输出

在仓库根目录执行 `python scripts/size_gate.py`，退出码为 0：

```text
== 源码体量门禁 v1.0 ==
  apps/web              797 / 5000    15.9%
  scripts               143 / 600     23.8%
  server                968 / 2000    48.4%
  tests                  50 / 800      6.2%
违规 0 项
结果: 通过 ✓
```

## 前端环境验证

在 `apps/web` 目录下执行：

- `npm ci --no-audit --no-fund`：依赖安装成功。
- `npm test`：7 个测试文件、40 项测试全部通过。
- `npm run build`：TypeScript 类型检查及 Vite 生产构建通过。
- `npm run dev -- --host 127.0.0.1`：开发服务成功启动，访问 `http://127.0.0.1:5173/` 返回 HTTP 200。

## 遇到的问题及解决

- 系统默认 Node.js 为 24、npm 为 11，与 D1 任务卡和仓库 CI 的 Node.js 22 不同。另行安装官方 Node.js 22.23.3 便携版，校验 SHA-256 后在项目终端中优先使用该版本及其附带的 npm 10.9.9。
- 系统默认 Python 为 3.11.7，电脑另有 Python 3.12.14。项目终端使用已有的 Python 3.12.14，体量门禁通过。
- Git 姓名和邮箱已在本仓库配置为 `ZhangYiMing <1371274369@qq.com>`。
- 本次验证覆盖前端安装、测试、构建、开发服务启动及体量门禁；未启动后端服务进行接口联调。
