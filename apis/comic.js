const { sleep, comicBaseURL } = require("../constants");
const { ComicModel } = require("../mongodb");
require('dotenv').config()

const comicAPIKeyList = [
    process.env.COMIC_API_KEY,
    process.env.COMIC_ALT_API_KEY,
];
var comicAPIKey = process.env.COMIC_API_KEY;
var apiKeyPointer = 0;

var comicIDList = [48134, 21843, ];
const publisherList = [10, 31, 8, 15, 18, 32, 364, 34, 89, 252, 464];

const publisherCode = 4010;
const volumeCode = 4050;

function changeAPIKey() {
    apiKeyPointer += 1;
    comicAPIKey = comicAPIKeyList[apiKeyPointer];
    console.log("API Key changed.", apiKeyPointer);
}

async function satisfyRateLimiting(endTime, startTime) {
    if (endTime - startTime < 3000) {
        const sleepTimeInMillis = 3001 - (endTime - startTime);
        await sleep(sleepTimeInMillis);
    }
}

async function startComicRequests() {
    await getComicList();
    console.log(`${comicIDList.length} number of comic volumes will be fetched.`);

    var comicList = [];
    for (let index = 0; index < comicIDList.length; index++) {
        const comicModel = await getComicVolume(comicIDList[index]);

        if (comicModel != null) {
            comicList.push(comicModel);
        }

        if (comicList.length >= 2500) {
            await insertComic(comicList);

            comicList = [];

            console.log(`ComicList reset ${comicList} ${comicList.length}.`);
        }
    }

    console.log(`${comicList.length} number of comic volumes fetched.`);

    await insertComic(comicList);

    console.log("Comics are DONE!");
}

async function getComicList() {
    comicIDList = [48134, 21843];

    for (let index = 0; index < publisherList.length; index++) {
        const startTime = performance.now();

        const publisherID = publisherList[index];

        const comicAPI = `${comicBaseURL}publisher/${publisherCode}-${publisherID}/?api_key=${comicAPIKey}&format=json`;

        let request = new Request(
            comicAPI, {
                method: 'GET',
            }
        )

        let result;
        try {
            result = await fetch(request).then((response) => {
                return response.json();
            });

            if (result["status_code"] != 1 || result["error"] != "OK") {
                if (apiKeyPointer != 0) {
                    changeAPIKey();
                    await sleep(1000);
                    await getComicList();
                } else {
                    console.log("Out of API keys.", result["error"]);
                    return;
                }
            }
        } catch (error) {
            console.log("\nComic request error occured", comicAPI, error);
            await sleep(1500);
            await getComicList();
            return;
        }

        const endTime = performance.now();
        await satisfyRateLimiting(endTime, startTime);

        try {
            const volumes = result['results']['volumes'];
            for (let index = 0; index < volumes.length; index++) {
                const item = volumes[index];
                comicIDList.push(item['id']);
            }
        } catch (error) {
            console.log("Comic error occured", error);
            return;
        }
    }
}

async function getComicVolume(comicID) {
    const volumeAPI = `${comicBaseURL}volume/${volumeCode}-${comicID}/?api_key=${comicAPIKey}&format=json`;

    let volumeRequest = new Request(
        volumeAPI, {
            method: 'GET',
        }
    );

    let result;
    try {
        const startTime = performance.now();

        result = await fetch(volumeRequest).then((response) => {
            return response.json();
        });

        const endTime = performance.now();
        await satisfyRateLimiting(endTime, startTime);

        if (result['status_code'] != 1 || result['error'] != "OK") {
            if (apiKeyPointer != 0) {
                changeAPIKey();
                await sleep(1000);
                return await getComicVolume(comicID);
            } else {
                console.log("Out of API keys.", result["error"]);
                return null;
            }
        }
    } catch (error) {
        console.log("\nComic Volume request error occured", comicID, volumeAPI, error);
        await sleep(5000);
        return await getComicVolume(comicID);
    }

    try {
        const volumeResult = result['results'];

        const charJson = volumeResult['characters'];
        const charList = [];

        var charCount = charJson.length;
        if (charCount > 100) {
            charCount = 100;
        }
        for (let index = 0; index < charCount; index++) {
            const item = charJson[index];

            charList.push({
                comic_id: item['id'],
                name: item['name'],
                count: item['count'],
            });
        }

        const tempComicModel = ComicModel({
            title_en: volumeResult['name'],
            image_url: volumeResult['image']['original_url'],
            thumb_image_url: volumeResult['image']['thumb_url'],
            count_of_issues: volumeResult['count_of_issues'],
            description: volumeResult['description'],
            comic_id: volumeResult['id'],
            start_year: volumeResult['start_year'],
            publisher: {
                comic_id: volumeResult['publisher']['id'],
                name: volumeResult['publisher']['name'],
            },
            characters: charList,
            created_at: new Date(),
        });

        return tempComicModel;
    } catch (error) {
        console.log("Comic volume error occured", comicID, volumeAPI, error);
        return null;
    }
}

async function insertComic(comicList) {
    console.log(`Inserting ${comicList.length} number of items to Comic Books DB`);

    for (let index = 0; index < comicList.length; index++) {
        const element = comicList[index];

        comicList[index] = {
            'updateOne': {
                'filter': {'comic_id': element.comic_id},
                'update': {
                    "$set": {
                        title_en: element.title_en,
                        image_url: element.image_url,
                        thumb_image_url: element.thumb_image_url,
                        count_of_issues: element.count_of_issues,
                        description: element.description,
                        comic_id: element.comic_id,
                        start_year: element.start_year,
                        publisher: element.publisher,
                        characters: element.characters,
                        created_at: new Date(),
                    }
                },
                'upsert': true,
            }
        }
    }

    try {
        await ComicModel.bulkWrite(comicList);
        console.log(`Inserted ${comicList.length} number of items to Comic Books DB`);
    } catch (error) {
        console.log(`Error occured while inserting comic books ${error}`);
    }
}

module.exports.StartComicRequests = startComicRequests;
