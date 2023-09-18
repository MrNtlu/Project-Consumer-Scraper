const { jikanBaseURL, sleep } = require("../constants");
const { AnimeModel } = require("../mongodb");
const { performance } = require('perf_hooks');

var page = 1;
var upcomingPage = 1;
const malIDList = [];

async function satisfyRateLimiting(endTime, startTime) {
    if (endTime - startTime < 3000) {
        const sleepTimeInMillis = 3001 - (endTime - startTime);
        await sleep(sleepTimeInMillis);
    }
}

//TODO Pages are limited to 200, remove in the future.
async function startAnimeRequests() {
    await getUpcomingAnimeList();
    await getAnimeList();
    console.log(`${malIDList.length} number of anime details will be fetched.`);

    const animeList = [];
    for (let index = 0; index < malIDList.length; index++) {
        const animeModel = await getAnimeDetails(malIDList[index], 0, 0);

        if (
            animeModel != null &&
            !animeModel.genres.some(e => e.name === "Hentai")
        ) {
            animeList.push(animeModel);
        }
    }

    console.log(`${animeList.length} number of anime details fetched.`);

    await insertAnime(animeList);

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
        if (hasNext && page < 200) {
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

async function getAnimeDetails(malID, charRetryCount, recommendationRetryCount) {
    const baseAnimeDetailsAPI = jikanBaseURL + "anime/" + malID;

    const animeDetailsAPI = `${baseAnimeDetailsAPI}/full`;
    const animeCharactersAPI = `${baseAnimeDetailsAPI}/characters`;
    const animeRecommendationAPI = `${baseAnimeDetailsAPI}/recommendations`;

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

    let recommendationRequest = new Request(
        animeRecommendationAPI, {
            method: 'GET',
        }
    );

    let result;
    let charResult;
    let recommendationResult;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['status'] != null) {
            if (result['status'] == 404) {
                console.log("404 Not Found. Stopping the request.", malID, animeDetailsAPI);
                await sleep(300);
                return null;
            } else if (result['status'] == 403) {
                console.log("403 Failed to connect. Let's cool it down for 1 minute.", malID, animeDetailsAPI);
                await sleep(61000);
                return await getAnimeDetails(malID);
            } else if (result['status'] == 408) {
                console.log("408 Timeout exeption. Will wait for 1 minute.", animeDetailsAPI);
                await sleep(61000);
                return await getAnimeDetails(malID);
            } else {
                console.log("Unexpected error occured.", result, animeDetailsAPI);
                await sleep(62500);
                return await getAnimeDetails(malID);
            }
        }

        await sleep(30000);

        if (charRetryCount <= 25) {
            charResult = await fetch(charRequest).then((response) => {
                return response.json();
            });

            if (charResult['status'] != null) {
                const newRetryCount = charRetryCount + 1;

                let recommendCount;
                if (recommendationRetryCount > 25) {
                    recommendCount = 999;
                } else {
                    recommendCount = 0;
                }

                if (charResult['status'] == 404) {
                    console.log("Anime Character 404 Not Found. Canceling the character request.", malID, animeCharactersAPI);
                    await sleep(5000);
                    return await getAnimeDetails(malID, 999, recommendCount);
                } else if (charResult['status'] == 403) {
                    console.log("403 Failed to connect. Let's cool it down for 1 minute. AnimeChar ", malID, animeCharactersAPI);
                    await sleep(61000);
                    return await getAnimeDetails(malID, newRetryCount, recommendCount);
                } else if (charResult['status'] == 408) {
                    console.log("408 Timeout exeption. Will wait for 1 minute 20 seconds. AnimeChar ", animeCharactersAPI);
                    await sleep(80000);
                    return await getAnimeDetails(malID, newRetryCount, recommendCount);
                } else {
                    console.log("Unexpected error occured. Will wait for 1 minute. AnimeChar ", charResult, animeCharactersAPI);
                    await sleep(61500);
                    return await getAnimeDetails(malID, newRetryCount, recommendCount);
                }
            }

            await sleep(45000);
        }

        if (recommendationRetryCount <= 25) {
            recommendationResult = await fetch(recommendationRequest).then((response) => {
                return response.json();
            });

            if (recommendationResult['status'] != null) {
                const newRetryCount = recommendationRetryCount + 1;

                let charCount;
                if (charRetryCount > 25) {
                    charCount = 999;
                } else {
                    charCount = 0;
                }

                if (recommendationResult['status'] == 404) {
                    console.log("Anime Recommendation 404 Not Found. Canceling the recommendation request.", malID, animeRecommendationAPI);
                    await sleep(5000);
                    return await getAnimeDetails(malID, charCount, 999);
                } else if (recommendationResult['status'] == 403) {
                    console.log("403 Failed to connect. Let's cool it down for 1 minute. AnimeRecommend ", malID, animeRecommendationAPI);
                    await sleep(61000);
                    return await getAnimeDetails(malID, charCount, newRetryCount);
                } else if (recommendationResult['status'] == 408) {
                    console.log("408 Timeout exeption. Will wait for 1 minute 20 seconds. AnimeRecommend ", animeRecommendationAPI);
                    await sleep(80000);
                    return await getAnimeDetails(malID, charCount, newRetryCount);
                } else if (recommendationResult['status'] == 429) {
                    console.log("429 RateLimit exeption. Will wait for 3 minutes. AnimeRecommend ", animeRecommendationAPI);
                    await sleep(180000);
                    return await getAnimeDetails(malID, charCount, newRetryCount);
                } else {
                    console.log("Unexpected error occured. Will wait for 2 minute. AnimeRecommend ", recommendationResult, animeRecommendationAPI);
                    await sleep(120000);
                    return await getAnimeDetails(malID, charCount, newRetryCount);
                }
            }

            await sleep(45000);
        }
    } catch (error) {
        console.log("\nAnime details request error occured. Will wait for 1 minute 30 seconds", malID, animeDetailsAPI, error);
        await sleep(90000);
        return await getAnimeDetails(malID, charRetryCount, recommendationRetryCount);
    }

    try {
        const jsonData = result['data'];

        const characterList = [];
        if (charResult != undefined && charResult['data'] != undefined) {
            const charJsonData = charResult['data'];

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
        }

        const recommendationList = [];
        if (recommendationResult != undefined && recommendationResult['data'] != undefined) {
            const recommendationJsonData = recommendationResult['data'];

            if (recommendationJsonData != undefined && recommendationJsonData != null) {
                for (let index = 0; index < recommendationJsonData.length; index++) {
                    const item = recommendationJsonData[index];
                    const recommendationJson = item['entry'];

                    if (
                        recommendationJson['mal_id'] != null && recommendationJson['mal_id'] != "" &&
                        recommendationJson['title'] != null && recommendationJson['title'] != "" &&
                        recommendationList.length < 10
                    ) {
                        recommendationList.push({
                            mal_id: recommendationJson['mal_id'],
                            title: recommendationJson['title'],
                            image_url: recommendationJson['images']['jpg']['image_url'],
                        });
                    }
                }
            }
        }

        if (jsonData != undefined || jsonData != null) {
            const streamingJson = jsonData['streaming'];
            const streamingList = [];
            if (streamingJson != null && streamingJson != undefined) {
                for (let index = 0; index < streamingJson.length; index++) {
                    const item = streamingJson[index];
                    streamingList.push({
                        name: item['name'],
                        url: item['url'],
                    });
                }
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
                });
            }

            const themeJson = jsonData['themes'];
            const themeList = [];
            for (let index = 0; index < themeJson.length; index++) {
                const item = themeJson[index];
                themeList.push({
                    name: item['name'],
                    url: item['url'],
                });
            }

            const demographicJson = jsonData['demographics'];
            const demographicList = [];
            for (let index = 0; index < demographicJson.length; index++) {
                const item = demographicJson[index];
                demographicList.push({
                    name: item['name'],
                    url: item['url'],
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
                recommendations: recommendationList,
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
        console.log("Anime error occured", malID, error);
        return null;
    }
}

async function insertAnime(animeList) {
    console.log(`Inserting ${animeList.length} number of items to Anime DB.`);

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
                        recommendations: element.recommendations,
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

module.exports.StartAnimeRequests = startAnimeRequests;
module.exports.GetAnimeDetails = getAnimeDetails;
module.exports.SatisfyRateLimiting = satisfyRateLimiting;
module.exports.InsertAnime = insertAnime;