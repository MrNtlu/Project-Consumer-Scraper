const { rawgBaseURL, sleep } = require("../constants");
const { GameModel } = require("../mongodb");
require('dotenv').config()

const rawgAPIKeyList = [
    process.env.RAWG_API_KEY,
    process.env.RAWG_ALT_API_KEY,
    process.env.RAWG_ALT_2_API_KEY,
    process.env.RAWG_ALT_3_API_KEY,
    process.env.RAWG_ALT_4_API_KEY,
    process.env.RAWG_ALT_5_API_KEY,
];
var rawgAPIKey = process.env.RAWG_API_KEY;
var apiKeyPointer = 0;

const gameIDList = [];
var relatedGamesList = [];
var page = 1;
var upcomingPage = 1;
var relatedPage = 1;

function changeAPIKey() {
    apiKeyPointer += 1;
    rawgAPIKey = rawgAPIKeyList[apiKeyPointer];
    console.log("API Key changed.", apiKeyPointer);
}

async function satisfyRateLimiting(endTime, startTime) {
    if (endTime - startTime < 750) {
        const sleepTimeInMillis = 751 - (endTime - startTime);
        await sleep(sleepTimeInMillis);
    }
}

async function startGameRequests() {
    await getGameList();
    await getUpcomingGameList();
    console.log(`${gameIDList.length} number of game details will be fetched.`);

    const gameList = [];
    for (let index = 0; index < gameIDList.length; index++) {
        relatedPage = 1;
        relatedGamesList = [];
        const gameModel = await getGameDetails(gameIDList[index]);

        if (gameModel != null) {
            gameList.push(gameModel);
        }
    }

    console.log(`${gameList.length} number of game details fetched.`);
    if (gameList.length > 0) {
        console.log(`Inserting ${gameList.length} number of items to Game DB`);

        for (let index = 0; index < gameList.length; index++) {
            const element = gameList[index];

            gameList[index] = {
                'updateOne': {
                    'filter': {'rawg_id': element.rawg_id},
                    'update': {
                        "$set": {
                            title: element.title,
                            title_original: element.title_original,
                            description: element.description,
                            tba: element.tba,
                            rawg_id: element.rawg_id,
                            rawg_rating: element.rawg_rating,
                            rawg_rating_count: element.rawg_rating_count,
                            metacritic_score: element.metacritic_score,
                            metacritic_score_by_platform: element.metacritic_score_by_platform,
                            release_date: element.release_date,
                            background_image: element.background_image,
                            subreddit:element.subreddit,
                            age_rating: element.age_rating,
                            related_games: element.related_games,
                            genres: element.genres,
                            tags: element.tags,
                            platforms: element.platforms,
                            developers: element.developers,
                            publishers: element.publishers,
                            stores: element.stores,
                            created_at: new Date(),
                        }
                    }
                },
                'upsert': true,
            }
        }
        await GameModel.bulkWrite(gameList);
        console.log(`Inserted ${gameList.length} number of items to Game DB`);
    }
    console.log("Games are DONE!");
}

async function getGameList() {
    const startTime = performance.now();

    const gameAPI = `${rawgBaseURL}games?page=${page}&key=${rawgAPIKey}&metacritic=1,100&parent_platforms=1,2,3,6,7&page_size=50`;

    let request = new Request(
        gameAPI, {
            method: 'GET',
        }
    )

    let result;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['detail'] != null || result['error'] != null) {
            if (result['error'] != null && result['error'].includes("The monthly API limit reached")) {
                if (apiKeyPointer - 1 < rawgAPIKeyList.length) {
                    changeAPIKey();
                    await sleep(1000);
                    return await getGameList();
                } else {
                    console.log("Out of API Keys.");
                    return null;
                }
            } else {
                throw Error(result['detail'])
            }
        }
    } catch (error) {
        console.log("\nGame request error occured", page, error);
        await sleep(1500);
        await getGameList();
        return;
    }

    const endTime = performance.now();
    await satisfyRateLimiting(endTime, startTime);

    try {
        const results = result['results'];
        for (let index = 0; index < results.length; index++) {
            const item = results[index];
            gameIDList.push(item['id']);
        }

        const shouldIterate = result['next'];
        if (shouldIterate != null) {
            page += 1;
            await getGameList();
        }
    } catch (error) {
        console.log("Game error occured", error);
        return;
    }
}

async function getUpcomingGameList() {
    const startTime = performance.now();

    const date = new Date();
    const today = date.toISOString().slice(0, 10);

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const nextYear = new Date(year + 1, month, day).toISOString().slice(0, 10);

    const upcomingGameAPI = `${rawgBaseURL}games?page=${upcomingPage}&key=${rawgAPIKey}&dates=${today},${nextYear}&parent_platforms=1,2,3,6,7`;

    let request = new Request(
        upcomingGameAPI, {
            method: 'GET',
        }
    )

    let result;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['detail'] != null || result['error'] != null) {
            if (result['error'] != null && result['error'].includes("The monthly API limit reached")) {
                if (apiKeyPointer - 1 < rawgAPIKeyList.length) {
                    changeAPIKey();
                    await sleep(1000);
                    return await getGameList();
                } else {
                    console.log("Out of API Keys.");
                    return null;
                }
            } else {
                throw Error(result['detail'])
            }
        }
    } catch (error) {
        console.log("\nUpcoming Game request error occured", upcomingPage, error);
        await sleep(1500);
        await getUpcomingGameList();
        return;
    }

    const endTime = performance.now();
    await satisfyRateLimiting(endTime, startTime);

    try {
        const results = result['results'];
        for (let index = 0; index < results.length; index++) {
            const item = results[index];
            if (!gameIDList.includes(item['id'])) {
                gameIDList.push(item['id']);
            }
        }

        const shouldIterate = result['next'];
        if (shouldIterate != null) {
            upcomingPage += 1;
            await getUpcomingGameList();
        }
    } catch (error) {
        console.log("Game error occured", error);
        return;
    }
}

async function getGameDetails(rawgID) {
    const baseDetailsAPI = `${rawgBaseURL}games/${rawgID}`

    const gameDetailsAPI = `${baseDetailsAPI}?key=${rawgAPIKey}`
    const storesAPI = `${baseDetailsAPI}/stores?key=${rawgAPIKey}`

    let gameDetailsRequest = new Request(
        gameDetailsAPI, {
            method: 'GET',
        }
    );

    let storesRequest = new Request(
        storesAPI, {
            method: 'GET',
        }
    );

    let detailsResult;
    let storesResult;
    try {
        const startTime = performance.now();

        detailsResult = await fetch(gameDetailsRequest).then((response) => {
            return response.json();
        });

        const endTime = performance.now();
        await satisfyRateLimiting(endTime, startTime);

        const storesStartTime = performance.now();

        storesResult = await fetch(storesRequest).then((response) => {
            return response.json();
        });

        const storesEndTime = performance.now();
        await satisfyRateLimiting(storesEndTime, storesStartTime);

        if (detailsResult['detail'] != null || detailsResult['error'] != null) {
            if (detailsResult['detail'] != null && detailsResult['detail'].includes("Not found")) {
                console.log("404 Game not found", rawgID);
                await sleep(1500);
                return null;
            } else if (detailsResult['error'] != null && detailsResult['error'].includes("The monthly API limit reached")) {
                if (apiKeyPointer - 1 < rawgAPIKeyList.length) {
                    changeAPIKey();
                    await sleep(1000);
                    return await getGameDetails(rawgID);
                } else {
                    console.log("Out of API Keys.");
                    return null;
                }
            } else {
                console.log("Unexpected game details error occured.", detailsResult);
                await sleep(2000);
                return await getGameDetails(rawgID);
            }
        }

        if (storesResult['detail'] != null || storesResult['error'] != null) {
            if (storesResult['detail'] != null && storesResult['detail'].includes("Not found")) {
                console.log("404 Game not found", rawgID);
                await sleep(1500);
                return null;
            } else if (storesResult['error'] != null && storesResult['error'].includes("The monthly API limit reached")) {
                if (apiKeyPointer - 1 < rawgAPIKeyList.length) {
                    changeAPIKey();
                    await sleep(1000);
                    return await getGameDetails(rawgID);
                } else {
                    console.log("Out of API Keys.");
                    return null;
                }
            } else {
                console.log("Unexpected game details error occured.", storesResult);
                await sleep(2000);
                return await getGameDetails(rawgID);
            }
        }
    } catch (error) {
        console.log("\nGame details request error occured", rawgID, error);
        await sleep(2500);
        return await getGameDetails(rawgID);
    }

    await getRelatedGames(rawgID);

    try {
        const metacriticPlatformsJson = detailsResult['metacritic_platforms'];
        const metacriticPlatformsList = [];
        for (let index = 0; index < metacriticPlatformsJson.length; index++) {
            const item = metacriticPlatformsJson[index];
            metacriticPlatformsList.push({
                score: item['metascore'],
                platform: item['platform']['name'],
            });
        }

        const genresJson = detailsResult['genres'];
        const genreList = [];
        for (let index = 0; index < genresJson.length; index++) {
            const item = genresJson[index];
            genreList.push({
                name: item['name'],
                rawg_id: item['id']
            });
        }

        const tagsJson = detailsResult['tags'];
        const tagList = [];
        for (let index = 0; index < tagsJson.length; index++) {
            const item = tagsJson[index];
            tagList.push(item['name']);
        }

        const platformsJson = detailsResult['platforms'];
        const platformList = [];
        for (let index = 0; index < platformsJson.length; index++) {
            const item = platformsJson[index];
            if (item['platform'] != null && item['platform']['name'] != null) {
                platformList.push(item['platform']['name']);
            }
        }

        const developersJson = detailsResult['developers'];
        const developerList = [];
        for (let index = 0; index < developersJson.length; index++) {
            const item = developersJson[index];
            developerList.push(item['name']);
        }

        const publishersJson = detailsResult['publishers'];
        const publisherList = [];
        for (let index = 0; index < publishersJson.length; index++) {
            const item = publishersJson[index];
            publisherList.push(item['name']);
        }

        const tempGameModel = GameModel({
            title: detailsResult['name'],
            title_original: detailsResult['name_original'],
            description: detailsResult['description'],
            tba: detailsResult['tba'],
            rawg_id: detailsResult['id'],
            rawg_rating: detailsResult['rating'],
            rawg_rating_count: detailsResult['ratings_count'],
            metacritic_score: detailsResult['metacritic'],
            metacritic_score_by_platform: metacriticPlatformsList,
            release_date: detailsResult['released'],
            background_image: detailsResult['background_image'],
            subreddit: detailsResult['reddit_url'],
            age_rating: detailsResult['esrb_rating'] != null
                ? detailsResult['esrb_rating']['name']
                : null,
            related_games: relatedGamesList,
            genres: genreList,
            tags: tagList,
            platforms: platformList,
            developers: developerList,
            publishers: publisherList,
            stores: parseStoreJsonData(storesResult),
            created_at: new Date(),
        });

        return tempGameModel;
    } catch (error) {
        console.log("Game details error occured", rawgID, error);
        return null;
    }
}

async function getRelatedGames(rawgID) {
    const relatedGamesAPI = `${rawgBaseURL}games/${rawgID}/game-series?key=${rawgAPIKey}&page=${relatedPage}`

    let request = new Request(
        relatedGamesAPI, {
            method: 'GET',
        }
    )

    let result;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['detail'] != null || result['error'] != null) {
            console.log("\nRelated Game inner request error occured", rawgID, result);
            await sleep(1500);
            await getRelatedGames(rawgID);
            return;
        }
    } catch (error) {
        console.log("\nRelated Game request error occured", rawgID, error);
        await sleep(2500);
        await getRelatedGames(rawgID);
        return;
    }

    try {
        const relatedGamesJson = result['results'];
        for (let index = 0; index < relatedGamesJson.length; index++) {
            const item = relatedGamesJson[index];

            if (item['released'] != null) {
                const releaseDate = new Date(item['released']);
                const isUpcomingGame = releaseDate >= new Date();

                if (isUpcomingGame || item['metacritic'] != null) {
                    relatedGamesList.push({
                        name: item['name'],
                        release_date: item['released'],
                        rawg_id: item['id'],
                    });
                }
            }
        }

        const shouldIterate = result['next'];
        if (shouldIterate != null) {
            relatedPage += 1;
            await getRelatedGames(rawgID);
        }
    } catch (error) {
        console.log("Related games error occured", error);
        return;
    }
}

function parseStoreJsonData(result) {
    const storeList = [];

    try {
        const storeJson = result['results'];
        for (let index = 0; index < storeJson.length; index++) {
            const item = storeJson[index];
            storeList.push({
                store_id: item['store_id'],
                url: item['url'],
            });
        }

        return storeList.length > 0 ? storeList : null;
    } catch (error) {
        console.log("Store parse error occured", error);
        return null;
    }
}

module.exports.StartGameRequests = startGameRequests;