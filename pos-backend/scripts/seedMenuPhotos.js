// scripts/seedMenuPhotos.js
/**
 * Upload the photos in ../resources to the private menu photo bucket and save
 * each dish's CloudFront address in the MenuItems table.
 *
 * Each file must be named <dish uuid>.png. The script uploads it to
 * menu/<dish uuid>.png and sets imageUrl on the dish with that uuid.
 *
 * Take the values from the POS backend stack outputs:
 *   MENU_PHOTO_BUCKET    MenuPhotoBucketName
 *   MENU_PHOTO_BASE_URL  MenuPhotoBaseUrl
 *   MENU_ITEMS_TABLE     MenuItemsTableName
 *
 * Pass --dry-run to list what would change without writing anything.
 */

const fs = require("fs");
const path = require("path");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const config = require("../config/config");
const { setDishImage } = require("../models/menuModel");
const { UUID } = require("../models/menuPhoto");

const RESOURCES_DIR = path.join(__dirname, "../resources");
const dryRun = process.argv.includes("--dry-run");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} from the POS backend stack outputs.`);
  return value;
}

async function seedMenuPhotos() {
  const bucket = required("MENU_PHOTO_BUCKET");
  const baseUrl = required("MENU_PHOTO_BASE_URL").replace(/\/$/, "");
  required("MENU_ITEMS_TABLE");

  if (!fs.existsSync(RESOURCES_DIR)) {
    throw new Error(`Resources folder not found: ${RESOURCES_DIR}`);
  }

  const files = fs
    .readdirSync(RESOURCES_DIR)
    .filter((file) => path.extname(file).toLowerCase() === ".png" && UUID.test(path.basename(file, ".png")));

  if (files.length === 0) {
    console.log("No <dish uuid>.png files found in resources.");
    return;
  }

  const s3 = new S3Client({ region: config.awsRegion });
  let saved = 0;
  let missing = 0;

  for (const file of files) {
    const uuid = path.basename(file, ".png");
    const key = `menu/${uuid}.png`;
    const imageUrl = `${baseUrl}/${key}`;

    if (dryRun) {
      console.log(`Would upload ${file} to s3://${bucket}/${key} and set imageUrl ${imageUrl}`);
      continue;
    }

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.readFileSync(path.join(RESOURCES_DIR, file)),
      ContentType: "image/png",
    }));

    const dish = await setDishImage(uuid, imageUrl);
    if (dish) {
      saved += 1;
      console.log(`Uploaded ${key} and saved it on "${dish.name}".`);
    } else {
      missing += 1;
      console.log(`Uploaded ${key}. No dish has uuid ${uuid}, so no imageUrl was saved.`);
    }
  }

  if (!dryRun) console.log(`Done. ${saved} dish photos saved, ${missing} files had no matching dish.`);
}

seedMenuPhotos()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Photo seed failed:", err.message ?? err);
    process.exit(1);
  });
