const { tmdbBasePersonAPIURL, tmdbBaseImageURL, sleep } = require("../constants");
const { PersonModel } = require("../mongodb");
require('dotenv').config()

const tmdbAPIKey = process.env.TMDB_API_KEY;

async function getPersonDetails(personID) {
    const personAPI = `${tmdbBasePersonAPIURL}${personID}?api_key=${tmdbAPIKey}&language=en-US`;
    const imagesPersonAPI = `${tmdbBasePersonAPIURL}${personID}/images?api_key=${tmdbAPIKey}&include_image_language=en,null`

    let request = new Request(
        personAPI, {
            method: 'GET',
        }
    );

    let imagesRequest = new Request(
        imagesPersonAPI, {
            method: 'GET',
        }
    );

    let result;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['success'] != null) {
            throw Error(result["status_message"] != null ? result["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\Person request error occured", personAPI, error);
        await sleep(750);
        if (result != undefined && (result['status_message'] == "The resource you requested could not be found." || result["status_code"] == 34)) {
            console.log("Person resource not found, skipping.");
            return null;
        }
        return await getPersonDetails(personID);
    }

    await sleep(750);

    let imagesResult;
    try {
        imagesResult = await fetch(imagesRequest).then((response) => {
            return response.json();
        });

        if (imagesResult['success'] != null) {
            throw Error(imagesResult["status_message"] != null ? imagesResult["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\Person images request error occured", imagesPersonAPI, error);

        if (imagesResult["status_code"] != null && imagesResult["status_code"] == 11) {
            console.log("Internal Error, waiting for 5s.");
            await sleep(5000);
        } else {
            await sleep(750);
        }
        return await getPersonDetails(personID);
    }

    try {
        var imageUrl = null;
        var thumbImageUrl = null;
        if (result["profile_path"] != null && result["profile_path"] != undefined && result["profile_path"] != "") {
            imageUrl = result["profile_path"];
        }

        if (imageUrl != null) {
            imageUrl = `${tmdbBaseImageURL}original${imageUrl}`;
            thumbImageUrl = `${tmdbBaseImageURL}w154${imageUrl}`;
        }

        const tempPersonModel = PersonModel({
            name: result['name'],
            biography: result['biography'],
            birthday: result['birthday'],
            deathday: result['deathday'],
            tmdb_id: result['id'],
            tmdb_popularity: result['popularity'],
            place_of_birth: result['place_of_birth'],
            image_url: imageUrl,
            thumb_image_url: thumbImageUrl,
            images: parseImageJsonData(imagesResult),
            created_at: new Date(),
        });

        return tempPersonModel;
    } catch (error) {
        console.log("Person error occured", personID, error);
        return null;
    }
}

function parseImageJsonData(result) {
    try {
        const jsonData = result['profiles'];
        const imageList = [];

        for (let index = 0; index < jsonData.length; index++) {
            const item = jsonData[index];

            const image = item['file_path'];
            if (image != null && image != "" && imageList.length < 10) {
                imageList.push(`${tmdbBaseImageURL}original${image}`);
            }
        }

        return imageList;
    } catch (error) {
        console.log("Image parse error occured", error);
        return [];
    }
}

module.exports.GetPersonDetails = getPersonDetails;