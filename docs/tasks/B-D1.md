# B 卡 · D1 —— 环境就绪与第一条提交（预计 30–60 分钟）

> **你（B）今天的目标**：在自己电脑上把开发环境跑通，并向仓库提交你的第一个 commit + PR。
> **开始条件**：等群里公告 GitHub 仓库地址后再执行第 3 步及之后；1–2 步现在就能做。
> 全程遇到任何报错：**截图发群里**，别自己卡超过 20 分钟。

## 第 0 步：装基础软件（已装可跳过）

1. Python 3.12 或更高：https://www.python.org/downloads/ 安装时**务必勾选 "Add python.exe to PATH"**。
2. Git：https://git-scm.com/download/win 一路默认。
3. 验证：打开 **PowerShell**（开始菜单搜 PowerShell），输入：

```powershell
python --version    # 应显示 Python 3.12 及以上
git --version       # 应显示 git version 2.x
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

## 第 2 步：创建 Python 虚拟环境并安装工具

```powershell
python -m venv .venv
.venv\Scripts\activate        # 前面出现 (.venv) 即成功
pip install -r tools/dev-requirements.txt
```

> 若 `.venv\Scripts\activate` 报「禁止运行脚本」：先执行
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`，选 Y，再重试。
> 若 pip 下载慢：`pip install -r tools/dev-requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple`

## 第 3 步：跑一次体量门禁（验收命令）

```powershell
python scripts/size_gate.py
```

预期输出最后一行是：`结果: 通过 ✓`。把整个输出复制保存，下一步要用。

## 第 4 步：写环境确认文档并提交

1. 新建文件 `docs/team/B-环境确认.md`，粘贴以下模板并填入你的实际输出：

```markdown
# B 环境确认（D1）

- 日期：
- python --version 输出：
- git --version 输出：
- size_gate 输出（末尾几行即可）：
- 遇到的问题及解决：
```

2. 提交并推送：

```powershell
git checkout -b chore/d1-B-env
git add docs/team/B-环境确认.md
git commit -m "chore(team): B 环境就绪确认"
git push -u origin chore/d1-B-env
```

3. 打开仓库网页（push 后终端会显示一个创建 PR 的链接，按 Ctrl+点击；或到仓库页面点 "Compare & pull request"），标题填 `chore(team): B 环境就绪确认`，点 "Create pull request"。
   **PR（Pull Request）= 申请把你的分支合并进主分支**，创建完就算完成。

## 常见问题

| 现象 | 处理 |
|---|---|
| `python` 提示找不到 | 重装并勾选 Add to PATH，装完**重开** PowerShell |
| push 要求登录 | 按提示浏览器登录 GitHub 即可（用你 collaborator 的账号） |
| 其他任何报错 | 截图发群 |
