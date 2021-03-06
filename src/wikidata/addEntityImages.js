import { IMAGE_ID, LOGO_ID, TWITTER_ID } from "../constants/properties";
import { IMAGE_SIZE } from "../constants/tree";

export default async function getEntityImages(entity, currentLangCode) {
  entity.thumbnails = [];
  entity.images = [];

  const imageClaim = entity.simpleClaims[IMAGE_ID];
  if (imageClaim) {
    imageClaim.forEach((image, index) => {
      entity.thumbnails.push({
        url: getCommonsUrlByFile(image.value),
        alt: `${entity.label}'s Image ${index + 1} from Wikimedia Commons`,
      });
      entity.images.push({
        url: getCommonsUrlByFile(image.value, IMAGE_SIZE * 2),
        alt: `${entity.label}'s Image ${index + 1} from Wikimedia Commons`,
      });
    });
  }

  const twitterClaim = entity.simpleClaims[TWITTER_ID];
  if (twitterClaim) {
    //https://github.com/siddharthkp/twitter-avatar
    twitterClaim.forEach((image) => {
      const img = {
        url: `https://twitter-avatar.now.sh/${image.value}`,
        alt: `${entity.label}'s Twitter image`,
      };
      entity.thumbnails.push(img);
      entity.images.push(img);
    });
  }

  //Logo last, people might have logos like Trump
  const logoClaim = entity.simpleClaims[LOGO_ID];
  if (logoClaim) {
    logoClaim.forEach((image, index) => {
      entity.thumbnails.push({
        url: getCommonsUrlByFile(image.value),
        alt: `${entity.label}'s Logo ${index + 1} from Wikimedia Commons`,
      });
      entity.images.push({
        url: getCommonsUrlByFile(image.value, IMAGE_SIZE * 2),
        alt: `${entity.label}'s Logo ${index + 1} from Wikimedia Commons`,
      });
    });
  }
}

function getCommonsUrlByFile(filename, size = IMAGE_SIZE) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}${
    size ? `?width=${size}px` : ""
  }`;
}
