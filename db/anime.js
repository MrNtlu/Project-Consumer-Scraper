const { SatisfyRateLimiting, GetAnimeDetails, InsertAnime } = require("../apis/anime");
const { jikanBaseURL, sleep } = require("../constants");
const { AnimeModel } = require("../mongodb");
const { performance } = require('perf_hooks');

var upcomingPage = 1;
const malIDList = [];

const date = new Date()
const today = new Date(date.setDate(date.getDate() - 7));
const month = (today.getUTCMonth() + 1 < 10) ? '0' + (today.getUTCMonth() + 1) : today.getUTCMonth() + 1;
const day = (today.getUTCDate() < 10) ? '0' + today.getUTCDate() : today.getUTCDate();
const year = today.getUTCFullYear();

async function getUpcomingAnimeFromDB() {
    console.log("Upcoming Anime DB Started");

    try {
        const animes = await AnimeModel.find({
            is_airing: false,
            $or: [
                {
                    status: "Not yet aired",
                },
                {
                    "aired.from": {
                        $gt: `${year}-${month}-${day}`,
                    },
                },
            ],
        }).select('mal_id');

        const animeIDList = animes.map(anime => anime.mal_id);
        console.log(`Upcoming Anime DB Ended. ${animeIDList.length} number of anime details will be fetched.`);

        const animeList = [];
        for (let index = 0; index < animeIDList.length; index++) {
            const animeModel = await GetAnimeDetails(animeIDList[index], 0);

            if (
                animeModel != null &&
                !animeModel.genres.some(e => e.name === "Hentai")
            ) {
                animeList.push(animeModel);
            }
        }
        console.log(`${animeList.length} number of anime details fetched.`);

        await InsertAnime(animeList);
    } catch (error) {
        console.log("Get upcoming anime from db error", error);
    }
}

async function fetchUpcomingAnime() {
    await getUpcomingAnime();

    console.log(`${malIDList.length} number of anime details will be fetched.`);

    const animeList = [];
    for (let index = 0; index < malIDList.length; index++) {
        const animeModel = await GetAnimeDetails(malIDList[index], 0);

        if (
            animeModel != null &&
            !animeModel.genres.some(e => e.name === "Hentai")
        ) {
            animeList.push(animeModel);
        }
    }
    console.log(`${animeList.length} number of anime details fetched.`);

    await InsertAnime(animeList);

    console.log("Animes are DONE!");
}

async function getUpcomingAnime() {
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
        await getUpcomingAnime();
        return;
    }

    const endTime = performance.now();
    await SatisfyRateLimiting(endTime, startTime);

    try {
        const data = result['data'];
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            malIDList.push(item['mal_id']);
        }

        const hasNext = result['pagination']['has_next_page'];
        if (hasNext) {
            upcomingPage += 1;
            await getUpcomingAnime();
        }
    } catch (error) {
        console.log("Upcoming Anime error occured", error);
        return;
    }
}

module.exports.GetUpcomingAnimeFromDB = getUpcomingAnimeFromDB;
module.exports.FetchUpcomingAnime = fetchUpcomingAnime;
