const { jikanBaseURL, sleep } = require("../constants");
const { performance } = require('perf_hooks');
const { MangaModel } = require("../mongodb");

var page = 1;
const malIDList = [];
const mangaPageThreshold = 200;

async function satisfyRateLimiting(endTime, startTime) {
    if (endTime - startTime < 3000) {
        const sleepTimeInMillis = 3001 - (endTime - startTime);
        await sleep(sleepTimeInMillis);
    }
}

async function startMangaRequests() {
    await getMangaList();
    console.log(`${malIDList.length} number of manga details will be fetched.`);

    var mangaList = [];
    for (let index = 0; index < malIDList.length; index++) {
        const mangaModel = await getMangaDetails(malIDList[index], 0, 0);

        if (
            mangaModel != null &&
            !mangaModel.genres.some(e => e.name === "Hentai")
        ) {
            mangaList.push(mangaModel);
        }

        if (mangaList.length >= 2000) {
            await insertManga(mangaList);

            mangaList = [];

            console.log(`MangaList reset ${mangaList} ${mangaList.length}.`);
        }
    }

    console.log(`${mangaList.length} number of manga details fetched.`);

    await insertManga(mangaList);

    console.log("Mangas are DONE!");
}

async function getMangaList() {
    const startTime = performance.now();

    const mangaAPI = `${jikanBaseURL}top/manga?page=${page}`;

    let request = new Request(
        mangaAPI, {
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
        console.log("\nManga request error occured", page, error);
        await sleep(1700);
        await getMangaList();
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
        if (hasNext && page < mangaPageThreshold) {
            page += 1;
            await getMangaList();
        }
    } catch (error) {
        console.log("Manga error occured", error);
        return;
    }
}

async function getMangaDetails(malID, charRetryCount, recommendationRetryCount) {
    const baseMangaDetailsAPI = jikanBaseURL + "manga/" + malID;

    const mangaDetailsAPI = `${baseMangaDetailsAPI}/full`;
    const mangaCharactersAPI = `${baseMangaDetailsAPI}/characters`;
    const mangaRecommendationAPI = `${baseMangaDetailsAPI}/recommendations`;

    let request = new Request(
        mangaDetailsAPI, {
            method: 'GET',
        }
    );

    let charRequest = new Request(
        mangaCharactersAPI, {
            method: 'GET',
        }
    );

    let recommendationRequest = new Request(
        mangaRecommendationAPI, {
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
                console.log("404 Not Found. Stopping the request.", malID, mangaDetailsAPI);
                await sleep(300);
                return null;
            } else if (result['status'] == 403) {
                console.log("403 Failed to connect. Let's cool it down for 1 minute.", malID, mangaDetailsAPI);
                await sleep(61000);
                return await getMangaDetails(malID);
            } else if (result['status'] == 408) {
                console.log("408 Timeout exeption. Will wait for 1 minute.", mangaDetailsAPI);
                await sleep(61000);
                return await getMangaDetails(malID);
            } else if (result['status'] == 500) {
                console.log("500 exeption. Will wait for 1 minute.", mangaDetailsAPI);
                await sleep(61000);
                return null;
            } else {
                console.log("Unexpected error occured.", result, mangaDetailsAPI);
                await sleep(62500);
                return await getMangaDetails(malID);
            }
        }

        await sleep(45000);

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
                    console.log("Manga Character 404 Not Found. Canceling the character request.", malID, mangaCharactersAPI);
                    await sleep(5000);
                    return await getMangaDetails(malID, 999, recommendCount);
                } else if (charResult['status'] == 403) {
                    console.log("403 Failed to connect. Let's cool it down for 1 minute. MangaChar ", malID, mangaCharactersAPI);
                    await sleep(61000);
                    return await getMangaDetails(malID, newRetryCount, recommendCount);
                } else if (charResult['status'] == 408) {
                    console.log("408 Timeout exeption. Will wait for 1 minute 20 seconds. MangaChar ", mangaCharactersAPI);
                    await sleep(80000);
                    return await getMangaDetails(malID, newRetryCount, recommendCount);
                } else if (charResult['status'] == 500) {
                    console.log("500 exeption. Will wait for 1 minute. MangaChar", mangaCharactersAPI);
                    await sleep(61000);
                    return await getMangaDetails(malID, 999, recommendCount);
                }  else {
                    console.log("Unexpected error occured. Will wait for 1 minute. MangaChar ", charResult, mangaCharactersAPI);
                    await sleep(61500);
                    return await getMangaDetails(malID, newRetryCount, recommendCount);
                }
            }

            await sleep(61000);
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
                    console.log("Manga Recommendation 404 Not Found. Canceling the recommendation request.", malID, mangaRecommendationAPI);
                    await sleep(5000);
                    return await getMangaDetails(malID, charCount, 999);
                } else if (recommendationResult['status'] == 403) {
                    console.log("403 Failed to connect. Let's cool it down for 1 minute. MangaRecommend ", malID, mangaRecommendationAPI);
                    await sleep(61000);
                    return await getMangaDetails(malID, charCount, newRetryCount);
                } else if (recommendationResult['status'] == 408) {
                    console.log("408 Timeout exeption. Will wait for 1 minute 20 seconds. MangaRecommend ", mangaRecommendationAPI);
                    await sleep(80000);
                    return await getMangaDetails(malID, charCount, newRetryCount);
                } else if (recommendationResult['status'] == 429) {
                    console.log("429 RateLimit exeption. Will wait for 3 minutes. MangaRecommend ", mangaRecommendationAPI);
                    await sleep(180000);
                    return await getMangaDetails(malID, charCount, newRetryCount);
                } else if (recommendationResult['status'] == 500) {
                    console.log("500 exeption. Will wait for 1 minute. MangaRecommend ", mangaRecommendationAPI);
                    await sleep(61000);
                    return await getMangaDetails(malID, charCount, 999);
                } else {
                    console.log("Unexpected error occured. Will wait for 2 minute. MangaRecommend ", recommendationResult, mangaRecommendationAPI);
                    await sleep(120000);
                    return await getMangaDetails(malID, charCount, newRetryCount);
                }
            }

            await sleep(45000);
        }
    } catch (error) {
        console.log("\nManga details request error occured. Will wait for 2 minutes", malID, mangaDetailsAPI, error);
        await sleep(120000);
        return await getMangaDetails(malID, charRetryCount, recommendationRetryCount);
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
            const serializationJson = jsonData['serializations'];
            const serializationList = [];
            if (serializationJson != null && serializationJson != undefined) {
                for (let index = 0; index < serializationJson.length; index++) {
                    const item = serializationJson[index];
                    serializationList.push({
                        name: item['name'],
                        url: item['url'],
                    });
                }
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

            const tempMangaModel = MangaModel({
                title_original: jsonData['title'],
                title_en: jsonData['title_english'],
                title_jp: jsonData['title_japanese'],
                description: jsonData['synopsis'],
                description_extra: jsonData['background'],
                image_url: jsonData['images']['jpg']['large_image_url'],
                small_image_url: jsonData['images']['jpg']['small_image_url'],
                mal_id: jsonData['mal_id'],
                mal_score: jsonData['score'],
                mal_scored_by: jsonData['scored_by'],
                mal_members: jsonData['members'],
                mal_favorites: jsonData['favorites'],
                type: jsonData['type'],
                chapters: jsonData['chapters'],
                volumes: jsonData['volumes'],
                status: jsonData['status'],
                serializations: serializationList,
                is_publishing: jsonData['publishing'],
                published: {
                    from: jsonData['published']['from'],
                    to: jsonData['published']['to'],
                    from_day: jsonData['published']['prop']['from']['day'],
                    from_month: jsonData['published']['prop']['from']['month'],
                    from_year: jsonData['published']['prop']['from']['year'],
                    to_day: jsonData['published']['prop']['to']['day'],
                    to_month: jsonData['published']['prop']['to']['month'],
                    to_year: jsonData['published']['prop']['to']['year'],
                },
                recommendations: recommendationList,
                genres: genreList,
                themes: themeList,
                demographics: demographicList,
                relations: relationList,
                characters: characterList,
                created_at: new Date(),
            })

            return tempMangaModel;
        }

        return null;
    } catch (error) {
        console.log("Manga error occured", malID, error);
        return null;
    }
}

async function insertManga(mangaList) {
    console.log(`Inserting ${mangaList.length} number of items to Manga DB.`);

    for (let index = 0; index < mangaList.length; index++) {
        const element = mangaList[index];

        mangaList[index] = {
            'updateOne': {
                'filter': {'mal_id': element.mal_id},
                'update': {
                    "$set": {
                        title_original: element.title_original,
                        title_en: element.title_en,
                        title_jp: element.title_jp,
                        description: element.description,
                        description_extra: element.description_extra,
                        image_url: element.image_url,
                        small_image_url: element.small_image_url,
                        mal_id: element.mal_id,
                        mal_score: element.mal_score,
                        mal_scored_by: element.mal_scored_by,
                        mal_members: element.mal_members,
                        mal_favorites: element.mal_favorites,
                        type: element.type,
                        chapters: element.chapters,
                        volumes: element.volumes,
                        status: element.status,
                        serializations: element.serializations,
                        is_publishing: element.is_publishing,
                        published: element.published,
                        recommendations: element.recommendations,
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
    await MangaModel.bulkWrite(mangaList);
    console.log(`Inserted ${mangaList.length} number of items to Manga DB.`);
}

module.exports.StartMangaRequests = startMangaRequests;
module.exports.GetMangaDetails = getMangaDetails;
module.exports.SatisfyRateLimiting = satisfyRateLimiting;
module.exports.InsertManga = insertManga;