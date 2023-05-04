const fs = require("fs");
const gunzip = require("gunzip-file");
const Downloader = require("nodejs-file-downloader");
const { tmdbFileBaseURL, tmdbFileExtension, sleep } = require("../constants");
const ndjsonParser = require("ndjson-parse");
const { GetMovies, GetTVSeries } = require("../apis/tmdb");
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

    pathList.forEach(async path => {
        extractFile(path);
    });

    await sleep(3000);

    await Promise.all([
        readFile(pathList[0].replace(".gz", ''), false),
        readFile(pathList[1].replace(".gz", ''), true)
    ])
}

function extractFile(filePath) {
    gunzip(filePath, filePath.replace(".gz", ''), async function () {
        console.log("Extracted successfully.", filePath);
    })
}

async function readFile(filePath, isMovie) {
    console.log("Reading file", filePath);

    var text = fs.readFileSync(filePath).toString('utf-8');
    const parsedNdJsonList = ndjsonParser(text);
    console.log(`Total ${isMovie ? "movie" : "tv series"} items: `, parsedNdJsonList.length);

    if (isMovie) {
        console.log("Movie fetch started.");

        const movieList = [];
        for (let index = 0; index < parsedNdJsonList.length; index++) {
            if (parsedNdJsonList[index].popularity > 15) {
                const movieModel = await GetMovies(parsedNdJsonList[index].id);

                if (movieModel != null && (movieModel.status == "Released" && movieModel.release_date != "")) {
                    movieList.push(movieModel);
                }
            }
        }

        console.log("Movie fetch Ended.");
        if (movieList.length > 0) {
            console.log(`Inserting ${movieList.length} number of items to Movie DB.`);

            for (let index = 0; index < movieList.length; index++) {
                const element = movieList[index];

                movieList[index] = {
                    'updateOne': {
                        'filter': {'tmdb_id': element.tmdb_id},
                        'update': {
                            "$set": {
                                title_original: element.title_original,
                                title_en: element.title_en,
                                description: element.description,
                                image_url: element.image_url,
                                small_image_url: element.small_image_url,
                                status: element.status,
                                length: element.length,
                                imdb_id: element.imdb_id,
                                tmdb_id: element.tmdb_id,
                                tmdb_popularity: element.tmdb_popularity,
                                tmdb_vote: element.tmdb_vote,
                                tmdb_vote_count: element.tmdb_vote_count,
                                production_companies: element.production_companies,
                                release_date: element.release_date,
                                genres: element.genres,
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
            await MovieModel.bulkWrite(movieList);
            console.log(`Inserted ${movieList.length} number of items to Movie DB.`);
        }
    } else {
        console.log("TVSeries fetch started.");

        const tvSeriesList = [];
        for (let index = 0; index < 50; index++) {
            if (parsedNdJsonList[index].popularity > 15) {
                const tvModel = await GetTVSeries(parsedNdJsonList[index].id);

                if (tvModel != null && tvModel.first_air_date != "") {
                    tvSeriesList.push(tvModel);
                }
            }
        }

        console.log("TVSeries fetch ended.");
        if (tvSeriesList.length > 0) {
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
                                small_image_url: element.small_image_url,
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
            await TVSeriesModel.bulkWrite(tvSeriesList);

            console.log(`Inserted ${tvSeriesList.length} number of items to TVSeries DB.`);
        }
    }
}

module.exports.StartMovieFileDownload = startMovieFileDownload;