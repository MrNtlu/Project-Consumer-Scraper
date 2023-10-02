const fs = require("fs");
const gunzip = require("gunzip-file");
const Downloader = require("nodejs-file-downloader");
const { tmdbFileBaseURL, tmdbFileExtension, sleep } = require("../constants");
const ndjsonParser = require("ndjson-parse");
const { GetMovies, GetTVSeries, GetUpcomingMovies } = require("../apis/tmdb");
const { MovieModel, TVSeriesModel } = require("../mongodb");

const date = new Date()
const today = new Date(date.setDate(date.getDate() - 1));
const month = (today.getUTCMonth() + 1 < 10) ? '0' + (today.getUTCMonth() + 1) : today.getUTCMonth() + 1;
const day = (today.getUTCDate() < 10) ? '0' + today.getUTCDate() : today.getUTCDate();
const year = today.getUTCFullYear();

const movieDownloadURL = `movie_ids_${month}_${day}_${year}${tmdbFileExtension}`;
const tvSeriesDownloadURL = `tv_series_ids_${month}_${day}_${year}${tmdbFileExtension}`;
const downloadURLList = [tvSeriesDownloadURL, movieDownloadURL];
const downloadFolder = "downloads"
const movieDownloadPath = `./${downloadFolder}/${movieDownloadURL.replace(".gz", '')}`

const pathList = [];
async function startMovieFileDownload() {
    if (fs.existsSync(downloadFolder)) {
        fs.rmSync(downloadFolder, { recursive: true });

        console.log("Previous files deleted successfully.");
    }

    for (const url of downloadURLList) {
        console.log("Download starting for: ", url);
        const downloader = new Downloader({
            url: tmdbFileBaseURL + url,
            directory: `./${downloadFolder}`,
            cloneFiles: false,
        });

        try {
            const { _, downloadStatus } = await downloader.download();
            const path = `./${downloadFolder}/${url}`;

            console.log("Download status:", downloadStatus);
            pathList.push(path);
        } catch (error) {
            console.log("Download failed", downloader, error);
        }
    }

    await extractFile(pathList[0]);
    await extractFile(pathList[1]);

    await sleep(3000);

    await Promise.all([
        readFile(pathList[0].replace(".gz", ''), false),
        sleep(2000),
        readFile(pathList[1].replace(".gz", ''), true)
    ])
}

async function extractFile(filePath) {
    return new Promise((resolve, _) => {
        gunzip(filePath, filePath.replace(".gz", ''), async function () {
            console.log("Extracted successfully.", filePath);
            resolve();
        })
    })
}

const movieThreshold = 20;
const tvThreshold = 25;

async function readFile(filePath, isMovie) {
    console.log("Reading file", filePath);

    var text = fs.readFileSync(filePath).toString('utf-8');
    const parsedNdJsonList = ndjsonParser(text);
    console.log(`Total ${isMovie ? "movie" : "tv series"} items: `, parsedNdJsonList.length);

    if (isMovie) {
        var movieList = [];
        const upcomingMovieIDList = [];

        console.log("Movie fetch started.");
        for (let index = 0; index < parsedNdJsonList.length; index++) {
            if (parsedNdJsonList[index].popularity > movieThreshold) {
                const movieModel = await GetMovies(parsedNdJsonList[index].id);

                if (movieModel != null && (movieModel.status == "Released" && movieModel.release_date != "")) {
                    movieList.push(movieModel);
                }

                if (movieList.length > 2000) {
                    console.log(`Inserting ${movieList.length} movies`);
                    await insertMovies(movieList, false);
                    console.log(`Inserted ${movieList.length} movies`);

                    movieList = [];
                }
            }
        }
        console.log(`Movie fetch Ended. Inserting remaining movies ${movieList.length}`);

        await insertMovies(movieList, false);

        console.log("Upcoming Movie Fetch Started");
        const upcomingMovieList = await GetUpcomingMovies();

        for (let index = 0; index < upcomingMovieList.length; index++) {
            const element = upcomingMovieList[index];

            if (movieList.find(movie => movie.id == element.toString()) == undefined) {
                const movieModel = await GetMovies(upcomingMovieList[index]);

                if (movieModel != null) {
                    upcomingMovieIDList.push(movieModel);
                }
            }
        }
        console.log("Upcoming Movie Fetch Ended");

        await insertMovies(upcomingMovieIDList, true);
    } else {
        var tvSeriesList = [];

        console.log("TVSeries fetch started.");
        for (let index = 0; index < parsedNdJsonList.length; index++) {
            if (parsedNdJsonList[index].popularity > tvThreshold) {
                const tvModel = await GetTVSeries(parsedNdJsonList[index].id);

                if (
                    tvModel != null &&
                    !(tvModel.genres.some(e => e === "News")) &&
                    !(tvModel.production_companies.some(e => e.origin_country === "JP") && tvModel.genres.some(e => e === "Animation")) &&
                    !tvModel.networks.some(e => e.origin_country === "IN") &&
                    tvModel.first_air_date != ""
                ) {
                    tvSeriesList.push(tvModel);
                }

                if (tvSeriesList.length > 2000) {
                    console.log(`Inserting ${tvSeriesList.length} tv series`);
                    await insertTVSeries(tvSeriesList);
                    console.log(`Inserted ${tvSeriesList.length} tv series`);

                    tvSeriesList = [];
                }
            }
        }
        console.log(`TVSeries fetch ended. Inserting remaining tv series ${tvSeriesList.length}`);

        await insertTVSeries(tvSeriesList);
    }
}

async function insertMovies(movieList, isUpcoming) {
    console.log(`Inserting ${isUpcoming ? "upcoming" : ""} ${movieList.length} number of items to Movie DB.`);

    for (let index = 0; index < movieList.length; index++) {
        const element = movieList[index];

        var status = element.status;
        if (element.release_date != undefined && element.release_date != "") {
            const releaseDate = new Date(element.release_date);

            if (releaseDate > today) {
                status = "Upcoming"
            } else {
                status = "Released"
            }
        }

        movieList[index] = {
            'updateOne': {
                'filter': {'tmdb_id': element.tmdb_id},
                'update': {
                    "$set": {
                        title_original: element.title_original,
                        title_en: element.title_en,
                        description: element.description,
                        backdrop: element.backdrop,
                        image_url: element.image_url,
                        status: isUpcoming ? "Upcoming" : status,
                        length: element.length,
                        imdb_id: element.imdb_id,
                        tmdb_id: element.tmdb_id,
                        tmdb_popularity: element.tmdb_popularity,
                        tmdb_vote: element.tmdb_vote,
                        tmdb_vote_count: element.tmdb_vote_count,
                        production_companies: element.production_companies,
                        release_date: element.release_date,
                        genres: element.genres,
                        images: element.images,
                        videos: element.videos,
                        recommendations: element.recommendations,
                        streaming: element.streaming,
                        actors: element.actors,
                        translations: element.translations,
                        created_at: new Date(),
                    }
                },
                'upsert': true,
            }
        }
    }
    try {
        await MovieModel.bulkWrite(movieList);
        console.log(`Inserted ${isUpcoming ? "upcoming" : ""} ${movieList.length} number of items to Movie DB.`);
    } catch(error) {
        console.log("Movie Insert error", error);
    }
}

async function insertTVSeries(tvSeriesList) {
    console.log(`Inserting ${tvSeriesList.length} number of items to TVSeries DB.`);

    for (let index = 0; index < tvSeriesList.length; index++) {
        const element = tvSeriesList[index];

        tvSeriesList[index] = {
            'updateOne': {
                'filter': {'tmdb_id': element.tmdb_id},
                'update': {
                    "$set": {
                        title_original: element.title_original,
                        title_en: element.title_en,
                        description: element.description,
                        image_url: element.image_url,
                        backdrop: element.backdrop,
                        status: element.status,
                        tmdb_id: element.tmdb_id,
                        tmdb_popularity: element.tmdb_popularity,
                        tmdb_vote: element.tmdb_vote,
                        tmdb_vote_count: element.tmdb_vote_count,
                        total_seasons: element.total_seasons,
                        total_episodes: element.total_episodes,
                        production_companies: element.production_companies,
                        first_air_date: element.first_air_date,
                        genres: element.genres,
                        images: element.images,
                        videos: element.videos,
                        recommendations: element.recommendations,
                        streaming: element.streaming,
                        networks: element.networks,
                        seasons: element.seasons,
                        actors: element.actors,
                        translations: element.translations,
                        created_at: new Date(),
                    }
                },
                'upsert': true,
            }
        }
    }
    try {
        await TVSeriesModel.bulkWrite(tvSeriesList);
        console.log(`Inserted ${tvSeriesList.length} number of items to TVSeries DB.`);
    } catch(error) {
        console.log("TV Insert error", error);
    }
}

module.exports.StartMovieFileDownload = startMovieFileDownload;
module.exports.InsertMovies = insertMovies;
module.exports.InsertTVSeries = insertTVSeries;