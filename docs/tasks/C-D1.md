# C 卡 · D1 —— 环境就绪与第一条提交（预计 30–60 分钟）

> **你（C）今天的目标**：在自己电脑上把前端环境跑通，并向仓库提交你的第一个 commit + PR。
> **开始条件**：等群里公告 GitHub 仓库地址后再执行第 3 步及之后；1–2 步现在就能做。
> 全程遇到任何报错：**截图发群里**，别自己卡超过 20 分钟。

## 第 0 步：装基础软件（已装可跳过）

1. Node.js LTS（20 或 22）：https://nodejs.org/ 下载 LTS 版本，一路默认。
2. Git：https://git-scm.com/download/win 一路默认。
3. 验证：打开 **PowerShell**（开始菜单搜 PowerShell），输入：

```powershell
node -v    # 应显示 v20.x 或 v22.x
npm -v     # 应显示 10.x
git --version
```

4. 配置你的 git 身份（把引号里换成你自己的信息）：

```powershell
git config --global user.name "你的名字拼音"
git config --global user.email "你的GitHub邮箱"
```

## 第 1 步：克隆仓库

```powershell
cd $HOME\Desktop
git clone 仓库地址    # 仓库地址等群公告，形如 https://github.com/bujue600-arch/py-ExportFlow.git
cd py-ExportFlow
```

## 第 2 步：验证你能跑仓库工具（用系统 Python，不装虚拟机环境也行）

```powershell
python scripts/size_gate.py
```

- 若提示找不到 python：装 Python 3.12+（https://www.python.org/downloads/ ，勾 Add to PATH，重开 PowerShell）。
- 预期最后一行：`结果: 通过 ✓`。复制保存输出，下一步要用。

## 第 3 步：写环境确认文档并提交

1. 新建文件 `docs/team/C-环境确认.md`，粘贴以下模板并填入你的实际输出：

```markdown
# C 环境确认（D1）

- 日期：
- node -v 输出：
- npm -v 输出：
- size_gate 输出（末尾几行即可）：
- 遇到的问题及解决：
```

2. 提交并推送：

```powershell
git checkout -b chore/d1-C-env
git add docs/team/C-环境确认.md
git commit -m "chore(team): C 环境就绪确认"
git push -u origin chore/d1-C-env
```

3. 打开仓库网页（push 后终端会显示创建 PR 的链接；或到仓库页面点 "Compare & pull request"），标题填 `chore(team): C 环境就绪确认`，点 "Create pull request"。
   **PR（Pull Request）= 申请把你的分支合并进主分支**，创建完就算完成。

## 常见问题

| 现象 | 处理 |
|---|---|
| `node` 提示找不到 | 重装 LTS 版，装完**重开** PowerShell |
| push 要求登录 | 按提示浏览器登录 GitHub 即可（用你 collaborator 的账号） |
| 其他任何报错 | 截图发群 |
