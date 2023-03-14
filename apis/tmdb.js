const request = require("request-promise");
const { tmdbBaseMovieAPIURL, tmdbBaseImageURL, tmdbBaseTVSeriesAPIURL } = require("../constants");
const { MovieModel, TVSeriesModel } = require("../mongodb");
require('dotenv').config()

const tmdbAPIKey = process.env.TMDB_API_KEY;

async function getTVSeries(tvID) {
    const tvAPI = `${tmdbBaseTVSeriesAPIURL}${tvID}?api_key=${tmdbAPIKey}&language=en-US`;
    const streamingMovieAPI = `${tmdbBaseTVSeriesAPIURL}${tvID}/watch/providers?api_key=${tmdbAPIKey}&language=en-US`;

    let result;
    try {
        result = await request(tvAPI);
    } catch (error) {
        console.log("\nTVSeries request error occured", tvAPI, error);
        await sleep(750);
        return await getTVSeries(tvAPI);
    }

    try {
        const jsonData = JSON.parse(result);
        const streamingResult = await request(streamingMovieAPI);

        const productionCompaniesJson = jsonData['production_companies'];
        const productionCompaniesList = [];
        for (let index = 0; index < productionCompaniesJson.length; index++) {
            const item = productionCompaniesJson[index];
            productionCompaniesList.push({
                logo: (item['logo_path'] != null)
                    ? `${tmdbBaseImageURL}original/${item['logo_path']}`
                    : null,
                name: item['name'],
                origin_country: item['origin_country']
            });
        }

        const networkJson = jsonData['networks'];
        const networkList = [];
        for (let index = 0; index < networkJson.length; index++) {
            const item = networkJson[index];
            networkList.push({
                logo: (item['logo_path'] != null)
                    ? `${tmdbBaseImageURL}original/${item['logo_path']}`
                    : null,
                name: item['name'],
                origin_country: item['origin_country']
            });
        }

        const genresJson = jsonData['genres'];
        const genreList = [];
        for (let index = 0; index < genresJson.length; index++) {
            const item = genresJson[index];
            genreList.push({
                name: item['name'],
                tmdb_id: item['id'],
            });
        }

        const seasonsJson = jsonData['seasons'];
        const seasonList = [];
        for (let index = 0; index < seasonsJson.length; index++) {
            const item = seasonsJson[index];
            if (parseInt(item['season_number']) != 0) {
                seasonList.push({
                    air_date: item['air_date'],
                    episode_count: item['episode_count'],
                    name: item['name'],
                    description: item['overview'],
                    season_num: item['season_number'],
                    image_url: `${tmdbBaseImageURL}original/${item['poster_path']}`,
                });
            }
        }

        const tempTVModel = TVSeriesModel({
            title_original: jsonData['original_name'],
            title_en: jsonData['name'],
            description: jsonData['overview'],
            image_url: `${tmdbBaseImageURL}original/${jsonData['poster_path']}`,
            small_image_url: `${tmdbBaseImageURL}w342/${jsonData['poster_path']}`,
            status: jsonData['status'],
            tmdb_id: jsonData['id'],
            tmdb_popularity: jsonData['popularity'],
            tmdb_vote: jsonData['vote_average'],
            tmdb_vote_count: jsonData['vote_count'],
            total_seasons: jsonData['number_of_seasons'],
            total_episodes: jsonData['number_of_episodes'],
            production_companies: productionCompaniesList,
            first_air_date: jsonData['first_air_date'],
            genres: genreList,
            streaming: parseStreamingJsonData(streamingResult),
            networks: networkList,
            seasons: seasonList,
            created_at: new Date()
        })

        return tempTVModel;
    } catch (error) {
        console.log("TVSeries error occured", tvID, error);
        return null;
    }
}

async function getMovies(movieID) {
    const movieAPI = `${tmdbBaseMovieAPIURL}${movieID}?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
    const streamingMovieAPI = `${tmdbBaseMovieAPIURL}${movieID}/watch/providers?api_key=${process.env.TMDB_API_KEY}&language=en-US`;

    let result;
    try {
        result = await request(movieAPI);
    } catch (error) {
        console.log("\nMovie request error occured", movieAPI, error);
        await sleep(750);
        return await getMovies(movieID);
    }

    let streamingResult;
    try {
        streamingResult = await request(streamingMovieAPI);
    } catch (error) {
        console.log("\nMovie streaming request error occured", streamingMovieAPI, error);
        await sleep(750);
        return await getMovies(movieID);
    }

    try {
        const jsonData = JSON.parse(result);

        const productionCompaniesJson = jsonData['production_companies'];
        const productionCompaniesList = [];
        for (let index = 0; index < productionCompaniesJson.length; index++) {
            const item = productionCompaniesJson[index];
            productionCompaniesList.push({
                logo: (item['logo_path'] != null)
                    ? `${tmdbBaseImageURL}original/${item['logo_path']}`
                    : null,
                name: item['name'],
                originCountry: item['origin_country']
            });
        }

        const genresJson = jsonData['genres'];
        const genreList = [];
        for (let index = 0; index < genresJson.length; index++) {
            const item = genresJson[index];
            genreList.push({
                name: item['name'],
                tmdbID: item['id'],
            });
        }

        const tempMovieModel = MovieModel({
            title_original: jsonData['original_title'],
            title_en: jsonData['title'],
            description: jsonData['overview'],
            image_url: `${tmdbBaseImageURL}original/${jsonData['poster_path']}`,
            small_image_url: `${tmdbBaseImageURL}w342/${jsonData['poster_path']}`,
            status: jsonData['status'],
            length: jsonData['runtime'],
            imdb_id: jsonData['imdb_id'],
            tmdb_id: jsonData['id'],
            tmdb_popularity: jsonData['popularity'],
            tmdb_vote: jsonData['vote_average'],
            tmdb_vote_count: jsonData['vote_count'],
            production_companies: productionCompaniesList,
            release_date: jsonData['release_date'],
            genres: genreList,
            streaming: parseStreamingJsonData(streamingResult),
            created_at: new Date()
        })

        return tempMovieModel;
    } catch (error) {
        console.log("Movie error occured", movieID, error);
        return null;
    }
}

function parseStreamingJsonData(result) {
    try {
        const jsonData = JSON.parse(result)['results'];
        const streamingList = [];

        Object.keys(jsonData).forEach(function(key) {
            const data = jsonData[key];

            const flatrateList = [];
            const rentList = [];
            const buyList = [];

            try {
                const flatrateJson = data['flatrate'];
                for (let index = 0; index < flatrateJson.length; index++) {
                    const item = flatrateJson[index];
                    flatrateList.push({
                        logo: `${tmdbBaseImageURL}original/${item['logo_path']}`,
                        name: item['provider_name'],
                    });
                }
            } catch(_) {}

            try {
                const rentJson = data['rent'];
                for (let index = 0; index < rentJson.length; index++) {
                    const item = rentJson[index];
                    rentList.push({
                        logo: `${tmdbBaseImageURL}original/${item['logo_path']}`,
                        name: item['provider_name'],
                    });
                }
            } catch(_) {}

            try {
                const buyJson = data['buy'];
                for (let index = 0; index < buyJson.length; index++) {
                    const item = buyJson[index];
                    buyList.push({
                        logo: `${tmdbBaseImageURL}original/${item['logo_path']}`,
                        name: item['provider_name'],
                    });
                }
            } catch(_) {}

            if (flatrateList.length > 0 || buyList.length > 0 || rentList.length > 0) {
                streamingList.push({
                    country_code: key,
                    streaming_platforms: flatrateList.length > 0 ? flatrateList : null,
                    buy_options: buyList.length > 0 ? buyList : null,
                    rent_options: rentList.length > 0 ? rentList : null
                });
            }
        });

        return streamingList.length > 0 ? streamingList : null;
    } catch (error) {
        console.log("Streaming parse error occured", error);
        return null;
    }
}

module.exports.GetMovies = getMovies;
module.exports.GetTVSeries = getTVSeries;