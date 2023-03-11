const request = require("request-promise");
const { tmdbBaseMovieAPIURL, tmdbBaseImageURL, tmdbBaseTVSeriesAPIURL } = require("../constants");
const { MovieModel, TVSeriesModel } = require("../mongodb");
require('dotenv').config()

const tmdbAPIKey = process.env.TMDB_API_KEY;

async function getTVSeries(tvID) {
    console.log("Fetch started with tv ID:", tvID);

    const tvAPI = `${tmdbBaseTVSeriesAPIURL}${tvID}?api_key=${tmdbAPIKey}&language=en-US`;
    const streamingMovieAPI = `${tmdbBaseTVSeriesAPIURL}${tvID}/watch/providers?api_key=${tmdbAPIKey}&language=en-US`;
    const result = await request(tvAPI);

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
                originCountry: item['origin_country']
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

        const seasonsJson = jsonData['seasons'];
        const seasonList = [];
        for (let index = 0; index < seasonsJson.length; index++) {
            const item = seasonsJson[index];
            if (parseInt(item['season_number']) != 0) {
                seasonList.push({
                    airDate: item['air_date'],
                    episodeCount: item['episode_count'],
                    name: item['name'],
                    description: item['overview'],
                    seasonNum: item['season_number'],
                    imageURL: `${tmdbBaseImageURL}original/${item['poster_path']}`,
                });
            }
        }

        const tempTVModel = TVSeriesModel({
            titleOriginal: jsonData['original_name'],
            titleEn: jsonData['name'],
            description: jsonData['overview'],
            imageURL: `${tmdbBaseImageURL}original/${jsonData['poster_path']}`,
            smallImageURL: `${tmdbBaseImageURL}w342/${jsonData['poster_path']}`,
            status: jsonData['status'],
            tmdbID: jsonData['id'],
            tmdbPopularity: jsonData['popularity'],
            tmdbVote: jsonData['vote_average'],
            tmdbVoteCount: jsonData['vote_count'],
            productionCompanies: productionCompaniesList,
            networks: networkList,
            releaseDate: jsonData['first_air_date'],
            genres: genreList,
            seasons: seasonList,
            streaming: parseStreamingJsonData(streamingResult),
            created_at: new Date()
        })

        return tempTVModel;
    } catch (error) {
        console.log("TVSeries error occured", error);
        return null;
    }
}

async function getMovies(movieID) {
    console.log("Fetch started with ID:", movieID);

    const movieAPI = `${tmdbBaseMovieAPIURL}${movieID}?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
    const streamingMovieAPI = `${tmdbBaseMovieAPIURL}${movieID}/watch/providers?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
    const result = await request(movieAPI);

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
            titleOriginal: jsonData['original_title'],
            titleEn: jsonData['title'],
            description: jsonData['overview'],
            imageURL: `${tmdbBaseImageURL}original/${jsonData['poster_path']}`,
            smallImageURL: `${tmdbBaseImageURL}w342/${jsonData['poster_path']}`,
            status: jsonData['status'],
            length: jsonData['runtime'],
            imdbID: jsonData['imdb_id'],
            tmdbID: jsonData['id'],
            tmdbPopularity: jsonData['popularity'],
            tmdbVote: jsonData['vote_average'],
            tmdbVoteCount: jsonData['vote_count'],
            productionCompanies: productionCompaniesList,
            releaseDate: jsonData['release_date'],
            genres: genreList,
            streaming: parseStreamingJsonData(streamingResult),
            created_at: new Date()
        })

        return tempMovieModel;
    } catch (error) {
        console.log("Movie error occured", error);
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
                    countryCode: key,
                    streamingPlatforms: flatrateList.length > 0 ? flatrateList : null,
                    buyOptions: buyList.length > 0 ? buyList : null,
                    rentOptions: rentList.length > 0 ? rentList : null
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