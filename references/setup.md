# 安装与账号配置

## 1、使用这个分享包

将 ZIP 中的整个 `xiaohongshu-product-breakdown` 文件夹放到支持本地 skill 的工具目录。Codex 通常使用 `~/.codex/skills/`；设置了 `CODEX_HOME` 时使用该目录下的 `skills/`。保留文件夹里的脚本和 references，不要只复制 SKILL.md。

如果本轮技能列表未更新，开启新会话后调用：

> 使用 $xiaohongshu-product-breakdown 拆解我指定的产品，生成图片、文案和 Tag。

这个包没有个人头像、固定作者名或机器专属路径。其他支持 Markdown 工作流的代理可以读 SKILL.md 执行，但工具接入、技能发现方式和运行环境要由宿主提供，不能保证所有平台原生兼容。

## 2、最少需要什么

- 开始任务：产品名称或官方链接。
- 正式制作：能够浏览和获取官方素材的工具，以及查看生成图片的能力。
- 可选品牌信息：账号名、自己的头像、两行栏目标题、标语、发布正文结尾。
- 只给产品也可以制作，无品牌配置默认省略作者署名，避免填入示例文字。

复制 `assets/brand.example.json` 到工作目录并修改。该文件是配置示例，不要把“你的账号名称”当正式署名。

```json
{
  "accountName": "产品观察笔记",
  "avatar": "./my-avatar.png",
  "tagline": "把产品看明白",
  "columnTitle": ["AI 产品拆解", "从功能到场景"],
  "closingLine": "关注产品观察笔记，一起拆解 AI 产品。"
}
```

`avatar` 相对 brand.json 所在目录解析，也可以填绝对路径。没有头像填 `null`，未填写的字符串可留空。`--avatar` 优先于配置内头像路径。头像只作为作者署名，不决定被拆产品的配色。

## 3、运行环境

附带脚本需要 Node.js、`@napi-rs/canvas`、Python 3（打包使用标准库）和可用中文字体。不需要浏览器排版，不生成 HTML。

优先使用现有依赖。没有 Canvas 时，可在 skill 文件夹执行：

```sh
npm ci
```

也可设置 `XHS_CANVAS_MODULE` 为已安装模块的绝对路径。脚本兼容本机 Codex 缓存运行时的常见位置，但不依赖该位置存在。

中文字体自动查找 macOS PingFang、Linux Noto Sans CJK 和 Windows 微软雅黑。找不到时用 `XHS_FONT_PATH` 指定本机 `.ttf`、`.ttc` 或 `.otf` 文件。字体不随包分发。Linux 环境可使用发行版的 Noto CJK 字体包。

```sh
# macOS / Linux 示例
export XHS_FONT_PATH="/path/to/chinese-font.ttc"
```

```powershell
# Windows PowerShell 示例
$env:XHS_FONT_PATH = "C:\Windows\Fonts\msyh.ttc"
```

Windows 可用 `py -3` 替代 `python3`。本包脚本在制作环境完成验证；其他系统的依赖与字体需在本机验证。

## 4、快速验证与真实任务

在 skill 文件夹运行历史示例，无需作者资料：

```sh
python3 scripts/fetch_example_assets.py
node scripts/render.cjs --content assets/example-content.json --assets assets/example-media --out ./demo-output
python3 scripts/package.py --content assets/example-content.json --out ./demo-output
```

带账号信息：

```sh
node scripts/render.cjs --content /path/to/content.json --assets /path/to/assets --brand /path/to/brand.json --out /path/to/new-output
python3 scripts/package.py --content /path/to/content.json --out /path/to/new-output
```

使用新输出目录，避免覆盖已有成稿。示例中的 ElevenLabs 文案为历史资料，只用于说明结构，正式发布前须核对当前产品事实。示例产品图来自官方公开页面，来源记录在 `assets/example-media/asset-sources.json`；这些第三方素材不代表本 skill 拥有商标或图片权利。
