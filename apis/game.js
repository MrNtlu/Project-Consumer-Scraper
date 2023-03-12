const request = require("request-promise");
const { rawgBaseURL } = require("../constants");
const { GameModel } = require("../mongodb");
require('dotenv').config()

const rawgAPIKey = process.env.RAWG_API_KEY;
const gameIDList = [];
var relatedGamesList = [];
var page = 1;
var upcomingPage = 1;
var relatedPage = 1;

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
    console.log("Game IDList fetch started for ", page);

    const gameAPI = `${rawgBaseURL}games?page=${page}&key=${rawgAPIKey}&metacritic=1,100&parent_platforms=1,2,3,6,7`;
    const result = await request(gameAPI);

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
    console.log("Upcoming Game IDList fetch started for ", upcomingPage);

    const date = new Date();
    const today = date.toISOString().slice(0, 10);

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const nextYear = new Date(year + 1, month, day).toISOString().slice(0, 10);

    const upcomingGameAPI = `${rawgBaseURL}games?page=${upcomingPage}&key=${rawgAPIKey}&dates=${today},${nextYear}&parent_platforms=1,2,3,6,7`;
    const result = await request(upcomingGameAPI);

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


    const [detailsResult, storesResult] = await Promise.all([
        request(gameDetailsAPI),
        request(storesAPI),
        getRelatedGames(rawgID),
    ]);

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
                rawgID: item['id']
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
            titleOriginal: gameDetailsJson['name_original'],
            description: gameDetailsJson['description'],
            tba: gameDetailsJson['tba'],
            rawgID: gameDetailsJson['id'],
            rawgRating: gameDetailsJson['rating'],
            rawgRatingCount: gameDetailsJson['ratings_count'],
            metacriticScore: gameDetailsJson['metacritic'],
            metacriticScoreByPlatform: metacriticPlatformsList,
            releaseDate: gameDetailsJson['released'],
            backgroundImage: gameDetailsJson['background_image'],
            subReddit: gameDetailsJson['reddit_url'],
            ageRating: gameDetailsJson['esrb_rating'] != null
                ? gameDetailsJson['esrb_rating']['name']
                : null,
            relatedGames: relatedGamesList,
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
    const result = await request(relatedGamesAPI);

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
                        releaseDate: item['released'],
                        rawgID: item['id'],
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
                storeID: item['store_id'],
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