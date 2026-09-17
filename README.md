# CleanFrame 图片属性清理器

一个零依赖、纯浏览器运行的图片元数据清理工具。所有图片都在当前设备内处理，不会上传到服务器，也不会覆盖原文件。

## 使用

直接双击打开 `index.html`，或在当前目录启动任意静态文件服务器后访问页面：

```powershell
python -m http.server 4173
```

然后打开 <http://localhost:4173>。

## 它能处理什么

工具通过浏览器 Canvas 重新编码图片，从而移除常见的 EXIF、XMP、IPTC、C2PA Content Credentials（包括 PNG 的 `caBX` 分块）、PNG 文本块和 WebP 元数据。支持 JPG、PNG、WebP、GIF（GIF 会导出为 JPG，动画 GIF 不保留动画）。JPEG 可以调整导出质量。

ChatGPT / OpenAI 生成的部分 PNG 会在 `caBX` 分块中携带 C2PA 清单，其中可能包含 `gpt-image`、`trainedAlgorithmicMedia`、生成服务名称和签名证书信息。重新编码后的副本不再携带这个分块，但这不等于改变了图片像素内容。

它只针对文件属性中的嵌入元数据；不会去除图片画面里已经存在的可见水印、文字或标志，也不能改变操作系统或图片查看器额外显示的来源信息。

## 注意

重新编码可能影响色彩配置、动画、透明度或文件体积。原图始终保留，请对导出副本进行检查。
