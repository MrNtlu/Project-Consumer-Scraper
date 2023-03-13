const request = require("request-promise");
const { rawgBaseURL, sleep } = require("../constants");
const { GameModel } = require("../mongodb");
require('dotenv').config()

const rawgAPIKeyList = [
    process.env.RAWG_API_KEY,
    process.env.RAWG_ALT_API_KEY,
    process.env.RAWG_ALT_2_API_KEY,
    process.env.RAWG_ALT_3_API_KEY,
    process.env.RAWG_ALT_4_API_KEY,
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
        await GameModel.deleteMany({});
        await GameModel.insertMany(gameList);
    }
}

async function getGameList() {
    const startTime = performance.now();

    const gameAPI = `${rawgBaseURL}games?page=${page}&key=${rawgAPIKey}&metacritic=1,100&parent_platforms=1,2,3,6,7`;

    let result;
    try {
        result = await request(gameAPI);
    } catch (error) {
        console.log("\nGame request error occured", page, error);
        await sleep(1500);
        await getGameList();
        return;
    }

    const endTime = performance.now();
    await satisfyRateLimiting(endTime, startTime);

    try {
        const jsonData = JSON.parse(result);

        const results = jsonData['results'];
        for (let index = 0; index < results.length; index++) {
            const item = results[index];
            gameIDList.push(item['id']);
        }

        const shouldIterate = jsonData['next'];
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

    let result;
    try {
        result = await request(upcomingGameAPI);
    } catch (error) {
        console.log("\nUpcoming Game request error occured", upcomingPage, error);
        await sleep(1500);
        await getUpcomingGameList();
        return;
    }

    const endTime = performance.now();
    await satisfyRateLimiting(endTime, startTime);

    try {
        const jsonData = JSON.parse(result);

        const results = jsonData['results'];
        for (let index = 0; index < results.length; index++) {
            const item = results[index];
            gameIDList.push(item['id']);
        }

        const shouldIterate = jsonData['next'];
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

    let detailsResult;
    let storesResult;
    try {
        const startTime = performance.now();

        [detailsResult, storesResult] = await Promise.all([
            request(gameDetailsAPI),
            request(storesAPI),
        ]);

        const endTime = performance.now();
        await satisfyRateLimiting(endTime, startTime);
    } catch (error) {
        if (error.error != null) {
            try {
                const jsonError = JSON.parse(error.error);

                if (jsonError['detail'] != null && jsonError['detail'].includes("Not found")) {
                    console.log("404 Game not found", rawgID);
                    await sleep(1500);
                    return null;
                } else if (jsonError['error'] != null && jsonError['error'].includes("The monthly API limit reached")) {
                    if (apiKeyPointer - 1 < rawgAPIKeyList.length) {
                        changeAPIKey();
                        await sleep(1000);
                        return await getGameDetails(rawgID);
                    } else {
                        console.log("Out of API Keys.");
                        return null;
                    }
                } else {
                    console.log("Unexpected game details error occured.", jsonError);
                    await sleep(2000);
                    return await getGameDetails(rawgID);
                }
            } catch (_) {
                console.log("\nGame details inner request error occured", rawgID, gameDetailsAPI, storesAPI, error.error);
                await sleep(1700);
                return await getGameDetails(rawgID);
            }
        }

        console.log("\nGame details request error occured", rawgID, error);
        await sleep(1500);
        return await getGameDetails(rawgID);
    }

    await getRelatedGames(rawgID);

    try {
        const gameDetailsJson = JSON.parse(detailsResult);
        const storesJson = JSON.parse(storesResult);

        const metacriticPlatformsJson = gameDetailsJson['metacritic_platforms'];
        const metacriticPlatformsList = [];
        for (let index = 0; index < metacriticPlatformsJson.length; index++) {
            const item = metacriticPlatformsJson[index];
            metacriticPlatformsList.push({
                score: item['metascore'],
                platform: item['platform']['name'],
            });
        }

        const genresJson = gameDetailsJson['genres'];
        const genreList = [];
        for (let index = 0; index < genresJson.length; index++) {
            const item = genresJson[index];
            genreList.push({
                name: item['name'],
                rawg_id: item['id']
            });
        }

        const tagsJson = gameDetailsJson['tags'];
        const tagList = [];
        for (let index = 0; index < tagsJson.length; index++) {
            const item = tagsJson[index];
            tagList.push(item['name']);
        }

        const platformsJson = gameDetailsJson['platforms'];
        const platformList = [];
        for (let index = 0; index < platformsJson.length; index++) {
            const item = platformsJson[index];
            if (item['platform'] != null && item['platform']['name'] != null) {
                platformList.push(item['platform']['name']);
            }
        }

        const developersJson = gameDetailsJson['developers'];
        const developerList = [];
        for (let index = 0; index < developersJson.length; index++) {
            const item = developersJson[index];
            developerList.push(item['name']);
        }

        const publishersJson = gameDetailsJson['publishers'];
        const publisherList = [];
        for (let index = 0; index < publishersJson.length; index++) {
            const item = publishersJson[index];
            publisherList.push(item['name']);
        }

        const tempGameModel = GameModel({
            title: gameDetailsJson['name'],
            title_original: gameDetailsJson['name_original'],
            description: gameDetailsJson['description'],
            tba: gameDetailsJson['tba'],
            rawg_id: gameDetailsJson['id'],
            rawg_rating: gameDetailsJson['rating'],
            rawg_rating_count: gameDetailsJson['ratings_count'],
            metacritic_score: gameDetailsJson['metacritic'],
            metacritic_score_by_platform: metacriticPlatformsList,
            release_date: gameDetailsJson['released'],
            background_image: gameDetailsJson['background_image'],
            subreddit: gameDetailsJson['reddit_url'],
            age_rating: gameDetailsJson['esrb_rating'] != null
                ? gameDetailsJson['esrb_rating']['name']
                : null,
            related_games: relatedGamesList,
            genres: genreList,
            tags: tagList,
            platforms: platformList,
            developers: developerList,
            publishers: publisherList,
            stores: parseStoreJsonData(storesJson),
        });

        return tempGameModel;
    } catch (error) {
        console.log("Game details error occured", rawgID, error);
        return null;
    }
}

async function getRelatedGames(rawgID) {
    const relatedGamesAPI = `${rawgBaseURL}games/${rawgID}/game-series?key=${rawgAPIKey}&page=${relatedPage}`

    let result;
    try {
        result = await request(relatedGamesAPI);
    } catch (error) {
        if (error.error != null) {
            try {
                const jsonError = JSON.parse(error.error);

                console.log("\nRelated Game request error occured", rawgID, jsonError);
                await sleep(1500);
                await getRelatedGames(rawgID);
                return;
            } catch (_) {
                console.log("\nRelated Game inner request error occured", rawgID, error.error);
                await sleep(1500);
                await getRelatedGames(rawgID);
                return;
            }
        }

        console.log("\nRelated Game request error occured", rawgID, error);
        await sleep(1500);
        await getRelatedGames(rawgID);
        return;
    }

    try {
        const jsonData = JSON.parse(result);

        const relatedGamesJson = jsonData['results'];
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

        const shouldIterate = jsonData['next'];
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