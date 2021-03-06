import axios from "axios";
import wdk from "wikidata-sdk";
import formatEntity from "../lib/formatEntity";
import { DEFAULT_LANGS_CODES } from "../constants/langs";

export default async function getItem(id, languageCode) {
  const url = await new Promise(function (resolve, reject) {
    try {
      resolve(
        wdk.getEntities({
          ids: id,
          languages: [languageCode].concat(DEFAULT_LANGS_CODES),
          props: ["labels", "descriptions", "claims", "sitelinks/urls"],
        })
      );
    } catch (error) {
      reject(error);
    }
  });

  const {
    data: { entities },
  } = await axios.get(url);
  const formattedEntity = await formatEntity(entities[id], languageCode);
  return formattedEntity;
}
