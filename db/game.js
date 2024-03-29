const { SatisfyRateLimiting, InsertGame } = require("../apis/game");
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
    process.env.RAWG_ALT_6_API_KEY,
    process.env.RAWG_ALT_7_API_KEY,
];
var rawgAPIKey = process.env.RAWG_API_KEY;
var apiKeyPointer = 0;

const date = new Date()
const today = new Date(date.setDate(date.getDate() - 7));
const month = (today.getUTCMonth() + 1 < 10) ? '0' + (today.getUTCMonth() + 1) : today.getUTCMonth() + 1;
const day = (today.getUTCDate() < 10) ? '0' + today.getUTCDate() : today.getUTCDate();
const year = today.getUTCFullYear();

const gameIDList = [];
var relatedGamesList = [];
var upcomingPage = 1;
var relatedPage = 1;

function changeAPIKey() {
    apiKeyPointer += 1;
    rawgAPIKey = rawgAPIKeyList[apiKeyPointer];
    console.log("API Key changed.", apiKeyPointer);
}

async function getUpcomingGamesFromDB() {
    console.log("Upcoming Games DB Started");

    try {
        const games = await GameModel.find({
            $or: [
            {
                tba: true,
            },
            {
                release_date: {
                    $gt: `${year}-${month}-${day}`,
                },
            },
            ],
        }).select('rawg_id');

        const gameIDList = games.map(game => game.rawg_id);
        console.log(`Upcoming Games DB Ended. ${gameIDList.length} number of game details will be fetched.`);

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

        await InsertGame(gameList);
    } catch (error) {
        console.log("Get upcoming game from db error", error);
    }
}

async function fetchUpcomingGames() {
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

    await InsertGame(gameList);

    console.log("Games are DONE!");
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
                if (apiKeyPointer + 1 < rawgAPIKeyList.length) {
                    changeAPIKey();
                    await sleep(1000);
                    return await getUpcomingGameList();
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
    await SatisfyRateLimiting(endTime, startTime);

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
    const screenshotsAPI = `${baseDetailsAPI}/screenshots?key=${rawgAPIKey}`

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

    let screenshotsRequest = new Request(
        screenshotsAPI, {
            method: 'GET',
        }
    );

    let detailsResult;
    let storesResult;
    let screenshotsResult;
    try {
        const startTime = performance.now();

        detailsResult = await fetch(gameDetailsRequest).then((response) => {
            return response.json();
        });

        const endTime = performance.now();
        await SatisfyRateLimiting(endTime, startTime);

        const storesStartTime = performance.now();

        storesResult = await fetch(storesRequest).then((response) => {
            return response.json();
        });

        const storesEndTime = performance.now();
        await SatisfyRateLimiting(storesEndTime, storesStartTime);

        const screenshotsStartTime = performance.now();

        screenshotsResult = await fetch(screenshotsRequest).then((response) => {
            return response.json();
        });

        const screenshotsEndTime = performance.now();
        await SatisfyRateLimiting(screenshotsEndTime, screenshotsStartTime);

        if (detailsResult['detail'] != null || detailsResult['error'] != null) {
            if (detailsResult['detail'] != null && detailsResult['detail'].includes("Not found")) {
                console.log("404 Game not found", rawgID);
                await sleep(1500);
                return null;
            } else if (detailsResult['error'] != null && detailsResult['error'].includes("The monthly API limit reached")) {
                if (apiKeyPointer + 1 < rawgAPIKeyList.length) {
                    changeAPIKey();
                    await sleep(1000);
                    return await getGameDetails(rawgID);
                } else {
                    console.log("Out of API Keys.");
                    return null;
                }
            } else {
                console.log("Unexpected game details error occured.", gameDetailsRequest, detailsResult);
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
                if (apiKeyPointer + 1 < rawgAPIKeyList.length) {
                    changeAPIKey();
                    await sleep(1000);
                    return await getGameDetails(rawgID);
                } else {
                    console.log("Out of API Keys.");
                    return null;
                }
            } else {
                console.log("Unexpected game store details error occured.", storesAPI, storesResult);
                await sleep(2000);
                return await getGameDetails(rawgID);
            }
        }

        if (screenshotsResult['detail'] != null || screenshotsResult['error'] != null) {
            if (screenshotsResult['detail'] != null && screenshotsResult['detail'].includes("Not found")) {
                console.log("404 Game not found", rawgID);
                await sleep(1500);
                return null;
            } else if (screenshotsResult['error'] != null && screenshotsResult['error'].includes("The monthly API limit reached")) {
                if (apiKeyPointer + 1 < rawgAPIKeyList.length) {
                    changeAPIKey();
                    await sleep(1000);
                    return await getGameDetails(rawgID);
                } else {
                    console.log("Out of API Keys.");
                    return null;
                }
            } else {
                console.log("Unexpected game screenshot details error occured.", screenshotsAPI, screenshotsResult);
                await sleep(2000);
                return await getGameDetails(rawgID);
            }
        }
    } catch (error) {
        console.log("\nGame details request error occured", rawgID, gameDetailsAPI, error);
        await sleep(5000);
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
            genreList.push(item['name']);
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
            image_url: detailsResult['background_image'] != null
                ? detailsResult['background_image']
                : "",
            age_rating: detailsResult['esrb_rating'] != null
                ? detailsResult['esrb_rating']['name']
                : null,
            related_games: relatedGamesList,
            genres: genreList,
            tags: tagList,
            platforms: platformList,
            developers: developerList,
            publishers: publisherList,
            screenshots: parseScreenshotJsonData(screenshotsResult),
            stores: parseStoreJsonData(storesResult),
            created_at: new Date(),
        });

        return tempGameModel;
    } catch (error) {
        console.log("Game details error occured", rawgID, gameDetailsRequest, error);
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
            if (result['detail'] != null && result['detail'].includes("Not found")) {
                console.log("404 Game not found", rawgID);
                await sleep(1500);
                return;
            } else if (result['error'] != null && result['error'].includes("The monthly API limit reached")) {
                if (apiKeyPointer + 1 < rawgAPIKeyList.length) {
                    changeAPIKey();
                    await sleep(1000);
                    return await getRelatedGames(rawgID);
                } else {
                    console.log("Out of API Keys.");
                    return null;
                }
            } else {
                console.log("\nRelated Game inner request error occured", rawgID, relatedGamesAPI, result);
                await sleep(1500);
                await getRelatedGames(rawgID);
                return;
            }
        }
    } catch (error) {
        console.log("\nRelated Game request error occured", rawgID, relatedGamesAPI, error);
        await sleep(4000);
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
        console.log("Related games error occured", request, error);
        return;
    }
}

function parseScreenshotJsonData(result) {
    const screenshotList = [];

    try {
        const screenshotJson = result['results'];
        for (let index = 0; index < screenshotJson.length; index++) {
            const item = screenshotJson[index];

            const image = item['image'];
            const isDeleted = item['is_deleted'];

            if (
                image != null && image != "" &&
                isDeleted != null && isDeleted == false
            ) {
                screenshotList.push(image);
            }
        }

        return screenshotList.length > 0 ? screenshotList : null;
    } catch (error) {
        console.log("Screenshot parse error occured", error);
        return null;
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

module.exports.FetchUpcomingGames = fetchUpcomingGames;
module.exports.GetUpcomingGamesFromDB = getUpcomingGamesFromDB;