const { jikanBaseURL, sleep } = require("../constants");
const { AnimeModel } = require("../mongodb");
const { performance } = require('perf_hooks');

var page = 1;
var upcomingPage = 1;
const malIDList = [];

//TODO: Exclude ecchi animes via APi, if not if anime has ecchi as genre don't save.

async function satisfyRateLimiting(endTime, startTime) {
    if (endTime - startTime < 1300) {
        const sleepTimeInMillis = 1301 - (endTime - startTime);
        await sleep(sleepTimeInMillis);
    }
}

async function startAnimeRequests() {
    await getUpcomingAnimeList();
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

        for (let index = 0; index < animeList.length; index++) {
            const element = animeList[index];

            animeList[index] = {
                'updateOne': {
                    'filter': {'mal_id': element.mal_id},
                    'update': {
                        "$set": {
                            title_original: element.title_original,
                            title_en: element.title_en,
                            title_jp: element.title_jp,
                            description: element.description,
                            image_url: element.image_url,
                            small_image_url: element.small_image_url,
                            mal_id: element.mal_id,
                            mal_score: element.mal_score,
                            mal_scored_by: element.mal_scored_by,
                            mal_members: element.mal_members,
                            mal_favorites: element.mal_favorites,
                            trailer: element.trailer,
                            type: element.type,
                            source: element.source,
                            episodes: element.episodes,
                            season: element.season,
                            year: element.year,
                            status: element.status,
                            is_airing: element.is_airing,
                            streaming: element.streaming,
                            aired: element.aired,
                            age_rating: element.age_rating,
                            producers: element.producers,
                            studios: element.studios,
                            genres: element.genres,
                            themes: element.themes,
                            demographics: element.demographics,
                            relations: element.relations,
                            characters: element.characters,
                            created_at: new Date(),
                        }
                    },
                    'upsert': true,
                }
            }
        }
        await AnimeModel.bulkWrite(animeList);
        console.log(`Inserted ${animeList.length} number of items to Anime DB.`);
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

async function getUpcomingAnimeList() {
    const startTime = performance.now();

    const upcomingAnimeAPI = `${jikanBaseURL}seasons/upcoming?page=${upcomingPage}`;

    let request = new Request(
        upcomingAnimeAPI, {
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
        console.log("\nUpcoming Anime request error occured", upcomingPage, error);
        await sleep(1700);
        await getUpcomingAnimeList();
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
            upcomingPage += 1;
            await getUpcomingAnimeList();
        }
    } catch (error) {
        console.log("Upcoming Anime error occured", error);
        return;
    }
}

async function getAnimeDetails(malID) {
    const baseAnimeDetailsAPI = jikanBaseURL + "anime/" + malID;

    const animeDetailsAPI = `${baseAnimeDetailsAPI}/full`;
    const animeCharactersAPI = `${baseAnimeDetailsAPI}/characters`;

    let request = new Request(
        animeDetailsAPI, {
            method: 'GET',
        }
    );

    let charRequest = new Request(
        animeCharactersAPI, {
            method: 'GET',
        }
    );

    let result;
    let charResult;
    try {
        const startTime = performance.now();

        result = await fetch(request).then((response) => {
            return response.json();
        });

        const endTime = performance.now();
        await satisfyRateLimiting(endTime, startTime);

        const charStartTime = performance.now();

        charResult = await fetch(charRequest).then((response) => {
            return response.json();
        });

        const charEndTime = performance.now();
        await satisfyRateLimiting(charEndTime, charStartTime);

        if (result['status'] != null) {
            if (result['status'] == 404) {
                console.log("404 Not Found. Stopping the request.", malID, animeDetailsAPI);
                await sleep(1500);
                return null;
            } else if (result['status'] == 403) {
                console.log("403 Failed to connect. Let's cool it down for 6 seconds.", malID, animeDetailsAPI);
                await sleep(6000);
                return await getAnimeDetails(malID);
            } else if (result['status'] == 408) {
                console.log("408 Timeout exeption. Will wait for 5 seconds.", animeDetailsAPI);
                await sleep(5000);
                return await getAnimeDetails(malID);
            } else {
                console.log("Unexpected error occured.", result, animeDetailsAPI);
                await sleep(2500);
                return await getAnimeDetails(malID);
            }
        }

        if (charResult['status'] != null) {
            if (charResult['status'] == 404) {
                console.log("Anime Character 404 Not Found. Stopping the request.", malID, animeCharactersAPI);
                await sleep(1500);
                return null;
            } else if (charResult['status'] == 403) {
                console.log("403 Failed to connect. Let's cool it down for 6 seconds. AnimeChar ", malID, animeCharactersAPI);
                await sleep(6000);
                return await getAnimeDetails(malID);
            } else if (charResult['status'] == 408) {
                console.log("408 Timeout exeption. Will wait for 5 seconds. AnimeChar ", animeCharactersAPI);
                await sleep(5000);
                return await getAnimeDetails(malID);
            } else {
                console.log("Unexpected error occured. AnimeChar ", charResult, animeCharactersAPI);
                await sleep(2500);
                return await getAnimeDetails(malID);
            }
        }
    } catch (error) {
        console.log("\nAnime details request error occured", malID, animeDetailsAPI, error);
        await sleep(2000);
        return await getAnimeDetails(malID);
    }

    try {
        const jsonData = result['data'];

        const charJsonData = charResult['data'];
        const characterList = [];
        if (charJsonData != undefined || charJsonData != null) {
            for (let index = 0; index < charJsonData.length; index++) {

                const item = charJsonData[index];
                const characterJson = item['character'];
                characterList.push({
                    mal_id: characterJson['mal_id'],
                    name: characterJson['name'],
                    image: characterJson['images']['jpg']['image_url'],
                    role: item['role']
                });
            }
        }

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
                characters: characterList,
                created_at: new Date(),
            })

            return tempAnimeModel;
        }

        return null;
    } catch (error) {
        console.log("Error occured", malID, error);
        return null;
    }
}

module.exports.StartAnimeRequests = startAnimeRequests;