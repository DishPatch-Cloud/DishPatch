const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const config = require("../config/config");

const PHOTO_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function photoBaseUrl() {
  return config.menuPhotoBaseUrl.replace(/\/$/, "");
}

function photoKey(uuid, contentType) {
  const extension = PHOTO_TYPES[contentType];
  if (!extension || !UUID.test(uuid)) return null;
  return `menu/${uuid}.${extension}`;
}

function photoImageUrl(uuid, contentType) {
  const key = photoKey(uuid, contentType);
  const base = photoBaseUrl();
  if (!key || !base || !config.menuPhotoBucket) return null;
  return `${base}/${key}`;
}

function isPhotoUrl(uuid, imageUrl) {
  const base = photoBaseUrl();
  if (!base || typeof imageUrl !== "string") return false;
  return Object.keys(PHOTO_TYPES).some((contentType) => imageUrl === photoImageUrl(uuid, contentType));
}

async function presignPhotoUpload(uuid, contentType) {
  const key = photoKey(uuid, contentType);
  const imageUrl = photoImageUrl(uuid, contentType);
  if (!key || !imageUrl) return null;
  const client = new S3Client({ region: config.awsRegion });
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
    Bucket: config.menuPhotoBucket,
    Key: key,
    ContentType: contentType,
  }), { expiresIn: 300 });
  return { uploadUrl, imageUrl, expiresIn: 300 };
}

module.exports = {
  PHOTO_TYPES,
  UUID,
  photoKey,
  photoImageUrl,
  isPhotoUrl,
  presignPhotoUpload,
};
