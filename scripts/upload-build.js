const { S3Storage } = require("coze-coding-dev-sdk");
const fs = require("fs");
const path = require("path");

async function uploadBuild() {
  const storage = new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    accessKey: "",
    secretKey: "",
    bucketName: process.env.COZE_BUCKET_NAME,
    region: "cn-beijing",
  });

  const filePath = path.join(__dirname, "..", "logistics-performance-netlify.tar.gz");
  
  if (!fs.existsSync(filePath)) {
    console.error("文件不存在:", filePath);
    process.exit(1);
  }

  console.log("开始上传文件...");
  const fileContent = fs.readFileSync(filePath);
  
  const key = await storage.uploadFile({
    fileContent: fileContent,
    fileName: "logistics-performance-netlify.tar.gz",
    contentType: "application/gzip",
  });

  console.log("上传成功, key:", key);

  // 生成签名 URL (有效期 7 天)
  const signedUrl = await storage.generatePresignedUrl({
    key: key,
    expireTime: 604800, // 7 天
  });

  console.log("\n下载链接:");
  console.log(signedUrl);
}

uploadBuild().catch(console.error);
