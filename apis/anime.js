const { jikanBaseURL, sleep } = require("../constants");
const { AnimeModel } = require("../mongodb");
const { performance } = require('perf_hooks');

var page = 1;
// Not found ID's [44189, 48631, 49063, 49638, 50364, 51083, 52874, 42965, 35267, 38426, 40293]
const malIDList = [];

async function satisfyRateLimiting(endTime, startTime) {
    if (endTime - startTime < 1300) {
        const sleepTimeInMillis = 1301 - (endTime - startTime);
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

        //TODO: Find a way to delete only existing ones, if new data doesn't have X data don't delete.
        await AnimeModel.deleteMany({});
        await AnimeModel.insertMany(animeList);
    }
    console.log("Animes are DONE!");
}

async function getAnimeList() {
    const startTime = performance.now();

    const animeAPI = `${jikanBaseURL}top/anime?page=${page}`;

    let request = new Request(
        animeAPI, {
            method: 'GET',
        }
    );

    let result;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['status'] != null) {
            throw Error(`${result['status']} ${result['message']}`)
        }
    } catch (error) {
        console.log("\nAnime request error occured", page, error);
        await sleep(1700);
        await getAnimeList();
        return;
    }

    const endTime = performance.now();
    await satisfyRateLimiting(endTime, startTime);

    try {
        const data = result['data'];
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            malIDList.push(item['mal_id']);
        }

        const hasNext = result['pagination']['has_next_page'];
        if (hasNext) {
            page += 1;
            await getAnimeList();
        }
    } catch (error) {
        console.log("Anime error occured", error);
        return;
    }
}

async function getAnimeDetails(malID) {
    const startTime = performance.now();

    const animeDetailsAPI = jikanBaseURL + "anime/" + malID + "/full";

    let request = new Request(
        animeDetailsAPI, {
            method: 'GET',
        }
    )

    let result;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['status'] != null) {
            if (result['status'] == 404) {
                console.log("404 Not Found. Stopping the request.", malID, animeDetailsAPI);
                await sleep(1500);
                return null;
            } else if (result['status'] == 403) {
                console.log("403 Failed to connect. Let's cool it down for 3.5 seconds.", malID, animeDetailsAPI);
                await sleep(3500);
                return await getAnimeDetails(malID);
            } else if (result['status'] == 408) {
                console.log("408 Timeout exeption. Will wait for 3 seconds.", animeDetailsAPI);
                await sleep(3000);
                return await getAnimeDetails(malID);
            } else {
                console.log("Unexpected error occured.", result, animeDetailsAPI);
                await sleep(2000);
                return await getAnimeDetails(malID);
            }
        }
    } catch (error) {
        console.log("\nAnime details request error occured", malID, animeDetailsAPI, error);
        await sleep(1700);
        return await getAnimeDetails(malID);
    }

    const endTime = performance.now();
    await satisfyRateLimiting(endTime, startTime);

    try {
        const jsonData = result['data'];

        if (jsonData != undefined || jsonData != null) {
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
                    mal_id: item['mal_id'],
                });
            }

            const themeJson = jsonData['themes'];
            const themeList = [];
            for (let index = 0; index < themeJson.length; index++) {
                const item = themeJson[index];
                themeList.push({
                    name: item['name'],
                    url: item['url'],
                    mal_id: item['mal_id'],
                });
            }

            const demographicJson = jsonData['demographics'];
            const demographicList = [];
            for (let index = 0; index < demographicJson.length; index++) {
                const item = demographicJson[index];
                demographicList.push({
                    name: item['name'],
                    url: item['url'],
                    mal_id: item['mal_id'],
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
                        mal_id: element['mal_id'],
                        redirect_url: element['url'],
                    });
                }

                relationList.push({
                    relation: item['relation'],
                    source: sourceList,
                });
            }

            const tempAnimeModel = AnimeModel({
                title_original: jsonData['title'],
                title_en: jsonData['title_english'],
                title_jp: jsonData['title_japanese'],
                description: jsonData['synopsis'],
                image_url: jsonData['images']['jpg']['large_image_url'],
                small_image_url: jsonData['images']['jpg']['small_image_url'],
                mal_id: jsonData['mal_id'],
                mal_score: jsonData['score'],
                mal_scored_by: jsonData['scored_by'],
                trailer: jsonData['trailer']['url'],
                type: jsonData['type'],
                source: jsonData['source'],
                episodes: jsonData['episodes'],
                season: jsonData['season'],
                year: jsonData['year'],
                status: jsonData['status'],
                is_airing: jsonData['airing'],
                streaming: streamingList,
                aired: {
                    from: jsonData['aired']['from'],
                    to: jsonData['aired']['to'],
                    from_day: jsonData['aired']['prop']['from']['day'],
                    from_month: jsonData['aired']['prop']['from']['month'],
                    from_year: jsonData['aired']['prop']['from']['year'],
                    to_day: jsonData['aired']['prop']['to']['day'],
                    to_month: jsonData['aired']['prop']['to']['month'],
                    to_year: jsonData['aired']['prop']['to']['year'],
                },
                age_rating: jsonData['rating'],
                producers: producerList,
                studios: studioList,
                genres: genreList,
                themes: themeList,
                demographics: demographicList,
                relations: relationList,
            })

            console.log("Anime", tempAnimeModel);
            return tempAnimeModel;
        }

        return null;
    } catch (error) {
        console.log("Error occured", malID, error);
        return null;
    }
}

module.exports.StartAnimeRequests = startAnimeRequests;