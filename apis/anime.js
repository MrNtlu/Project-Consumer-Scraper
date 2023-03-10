const request = require("request-promise");
const { jikanBaseURL, sleep } = require("../constants");
const { AnimeModel } = require("../mongodb");
const { performance } = require('perf_hooks');

var page = 1;
const malIDList = [];

async function satisfyRateLimiting(endTime, startTime) {
    if (endTime - startTime < 1000) {
        const sleepTimeInMillis = 1001 - (endTime - startTime);
        console.log(`Sleeping for ${sleepTimeInMillis}`);
        await sleep(sleepTimeInMillis);
    }
}

async function startAnimeRequests() {
    await getAnimeList();
    console.log(`${malIDList.length} number of anime details will be fetched.`);

    const animeList = [];
    for (let index = 0; index < malIDList.length; index++) {
        const animeModel = await getAnimeDetails(malIDList[index]);

        if (animeModel != null) {
            animeList.push(animeModel);
        }
    }

    console.log(`${animeList.length} number of anime details fetched.`);
    if (animeList.length > 0) {
        console.log(`Inserting ${animeList.length} number of items to Anime DB.`);
        await AnimeModel.deleteMany({});
        await AnimeModel.insertMany(animeList);
    }
}

async function getAnimeList() {
    const startTime = performance.now();
    console.log("Mal IDList fetch started for ", page);

    const animeAPI = `${jikanBaseURL}top/anime?page=${page}`;
    const result = await request(animeAPI);

    const endTime = performance.now();

    await satisfyRateLimiting(endTime, startTime);
    try {
        const jsonData = JSON.parse(result);

        const data = jsonData['data'];
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            malIDList.push(item['mal_id']);
        }

        const hasNext = jsonData['pagination']['has_next_page'];
        if (hasNext) {
            page += 1;
            await getAnimeList();
        }
    } catch (error) {
        console.log("Error occured", error);
        return;
    }
}

async function getAnimeDetails(malID) {
    const startTime = performance.now();
    console.log("Get details by mal ID ", malID);

    const animeDetailsAPI = jikanBaseURL + "anime/" + malID + "/full";
    const result = await request(animeDetailsAPI);

    const endTime = performance.now();

    await satisfyRateLimiting(endTime, startTime);
    try {
        const jsonData = JSON.parse(result)['data'];

        const streamingJson = jsonData['streaming'];
        const streamingList = [];
        for (let index = 0; index < streamingJson.length; index++) {
            const item = streamingJson[index];
            streamingList.push({
                name: item['name'],
                url: item['url'],
            });
        }

        const producerJson = jsonData['producers'];
        const producerList = [];
        for (let index = 0; index < producerJson.length; index++) {
            const item = producerJson[index];
            producerList.push({
                name: item['name'],
                url: item['url'],
            });
        }

        const studioJson = jsonData['studios'];
        const studioList = [];
        for (let index = 0; index < studioJson.length; index++) {
            const item = studioJson[index];
            studioList.push({
                name: item['name'],
                url: item['url'],
            });
        }

        const genreJson = jsonData['genres'];
        const genreList = [];
        for (let index = 0; index < genreJson.length; index++) {
            const item = genreJson[index];
            genreList.push({
                name: item['name'],
                url: item['url'],
                malID: item['mal_id'],
            });
        }

        const themeJson = jsonData['themes'];
        const themeList = [];
        for (let index = 0; index < themeJson.length; index++) {
            const item = themeJson[index];
            themeList.push({
                name: item['name'],
                url: item['url'],
                malID: item['mal_id'],
            });
        }

        const demographicJson = jsonData['demographics'];
        const demographicList = [];
        for (let index = 0; index < demographicJson.length; index++) {
            const item = demographicJson[index];
            demographicList.push({
                name: item['name'],
                url: item['url'],
                malID: item['mal_id'],
            });
        }

        const relationJson = jsonData['relations'];
        const relationList = [];
        for (let index = 0; index < relationJson.length; index++) {
            const item = relationJson[index];

            const sourceList = [];
            for (let i = 0; i < item['entry'].length; i++) {
                const element = item['entry'][i];

                sourceList.push({
                    name: element['name'],
                    type: element['type'],
                    malID: element['mal_id'],
                    redirectURL: element['url'],
                });
            }

            relationList.push({
                relation: item['relation'],
                source: sourceList,
            });
        }

        const tempAnimeModel = AnimeModel({
            titleOriginal: jsonData['title'],
            titleEn: jsonData['title_english'],
            titleJP: jsonData['title_japanese'],
            description: jsonData['synopsis'],
            imageURL: jsonData['images']['jpg']['large_image_url'],
            smallImageURL: jsonData['images']['jpg']['small_image_url'],
            malID: jsonData['mal_id'],
            malScore: jsonData['score'],
            malScoredBy: jsonData['scored_by'],
            trailer: jsonData['trailer']['url'],
            type: jsonData['type'],
            source: jsonData['source'],
            episodes: jsonData['episodes'],
            season: jsonData['season'],
            year: jsonData['year'],
            status: jsonData['status'],
            isCurrentlyAiring: jsonData['airing'],
            streaming: streamingList,
            aired: {
                from: jsonData['aired']['from'],
                to: jsonData['aired']['to'],
                fromDay: jsonData['aired']['prop']['from']['day'],
                fromMonth: jsonData['aired']['prop']['from']['month'],
                fromYear: jsonData['aired']['prop']['from']['year'],
                toDay: jsonData['aired']['prop']['to']['day'],
                toMonth: jsonData['aired']['prop']['to']['month'],
                toYear: jsonData['aired']['prop']['to']['year'],
            },
            ageRating: jsonData['rating'],
            producers: producerList,
            studios: studioList,
            genres: genreList,
            themes: themeList,
            demographics: demographicList,
            relations: relationList,
        })

        return tempAnimeModel;
    } catch (error) {
        console.log("Error occured", error);
        return null;
    }
}

module.exports.StartAnimeRequests = startAnimeRequests;