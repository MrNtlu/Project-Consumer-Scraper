const { tmdbBaseMovieAPIURL, tmdbBaseImageURL, tmdbBaseTVSeriesAPIURL, sleep } = require("../constants");
const { MovieModel, TVSeriesModel } = require("../mongodb");
require('dotenv').config()

const tmdbAPIKey = process.env.TMDB_API_KEY;
var page = 1;
const movieIDList = [];

//TODO Don't add animations, conflict with anime.

async function getTVSeries(tvID) {
    const tvAPI = `${tmdbBaseTVSeriesAPIURL}${tvID}?api_key=${tmdbAPIKey}&language=en-US`;
    const translationsTVAPI = `${tmdbBaseTVSeriesAPIURL}${tvID}/translations?api_key=${tmdbAPIKey}&language=en-US`;
    const streamingTVAPI = `${tmdbBaseTVSeriesAPIURL}${tvID}/watch/providers?api_key=${tmdbAPIKey}&language=en-US`;
    const creditsTVAPI = `${tmdbBaseTVSeriesAPIURL}${tvID}/credits?api_key=${tmdbAPIKey}&language=en-US`;

    let request = new Request(
        tvAPI, {
            method: 'GET',
        }
    );

    let streamingRequest = new Request(
        streamingTVAPI, {
            method: 'GET',
        }
    );

    let translationRequest = new Request(
        translationsTVAPI, {
            method: 'GET',
        }
    );

    let creditsRequest = new Request(
        creditsTVAPI, {
            method: 'GET',
        }
    );

    let result;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['success'] != null) {
            throw Error(result["status_message"] != null ? result["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\nTVSeries request error occured", tvAPI, error);
        await sleep(750);
        if (result['status_message'] == "The resource you requested could not be found." || result["status_code"] == 34) {
            console.log("TVSeries resource not found, skipping.");
            return null;
        }
        return await getTVSeries(tvID);
    }

    let streamingResult;
    try {
        streamingResult = await fetch(streamingRequest).then((response) => {
            return response.json();
        });

        if (result['success'] != null) {
            throw Error(result["status_message"] != null ? result["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\nTVSeries streaming request error occured", streamingTVAPI, error);
        await sleep(750);
        return await getTVSeries(tvID);
    }

    let translationResult;
    try {
        translationResult = await fetch(translationRequest).then((response) => {
            return response.json();
        });

        if (translationResult['success'] != null) {
            throw Error(translationResult["status_message"] != null ? translationResult["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\nTVSeries translation request error occured", translationsTVAPI, error);
        await sleep(750);
        return await getTVSeries(tvID);
    }

    let creditsResult;
    try {
        creditsResult = await fetch(creditsRequest).then((response) => {
            return response.json();
        });

        if (creditsResult['success'] != null) {
            throw Error(creditsResult["status_message"] != null ? creditsResult["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\nTVSeries credits request error occured", creditsTVAPI, error);
        await sleep(750);
        return await getTVSeries(tvID);
    }

    try {
        const productionCompaniesJson = result['production_companies'];
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

        const networkJson = result['networks'];
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

        const genresJson = result['genres'];
        const genreList = [];
        for (let index = 0; index < genresJson.length; index++) {
            const item = genresJson[index];
            genreList.push(item['name']);
        }

        const seasonsJson = result['seasons'];
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

        const creditsJson = creditsResult['cast'];
        const creditsList = [];
        for (let index = 0; index < creditsJson.length; index++) {
            const item = creditsJson[index];
            if (item['known_for_department'] == "Acting") {
                creditsList.push({
                    name: item['name'],
                    image: `${tmdbBaseImageURL}original/${item['profile_path']}`,
                    character: item['character'],
                });
            }
        }

        const translationsJson = translationResult['translations'].filter( translation =>
            translation["english_name"] == "Turkish" ||
            translation["english_name"] == "Arabic" ||
            translation["english_name"] == "Spanish" ||
            translation["english_name"] == "French" ||
            translation["english_name"] == "Russian" ||
            translation["english_name"] == "German" ||
            translation["english_name"] == "Japanese" ||
            translation["english_name"] == "Korean" ||
            translation["english_name"] == "Dutch" ||
            translation["english_name"] == "Mandarin" ||
            translation["english_name"] == "Portuguese"
        );
        const translationsList = [];
        for (let index = 0; index < translationsJson.length; index++) {
            const item = translationsJson[index];
            translationsList.push({
                lan_code: item['iso_3166_1'],
                lan_name: item['name'],
                lan_name_en: item['english_name'],
                title: item['data']['name'],
                description: item['data']['overview'],
            });
        }

        var backdropImage = null
        if (result['backdrop_path'] != null && result['backdrop_path'] != undefined) {
            backdropImage = result['backdrop_path']
        }

        if (backdropImage != null) {
            backdropImage = `${tmdbBaseImageURL}original${backdropImage}`
        }

        const tempTVModel = TVSeriesModel({
            title_original: result['original_name'],
            title_en: result['name'],
            description: result['overview'],
            image_url: `${tmdbBaseImageURL}original/${result['poster_path']}`,
            backdrop: backdropImage,
            status: result['status'],
            tmdb_id: result['id'],
            tmdb_popularity: result['popularity'],
            tmdb_vote: result['vote_average'],
            tmdb_vote_count: result['vote_count'],
            total_seasons: result['number_of_seasons'],
            total_episodes: result['number_of_episodes'],
            production_companies: productionCompaniesList,
            first_air_date: result['first_air_date'],
            genres: genreList,
            streaming: parseStreamingJsonData(streamingResult),
            networks: networkList,
            seasons: seasonList,
            actors: creditsList,
            translations: translationsList,
            created_at: new Date(),
        })

        return tempTVModel;
    } catch (error) {
        console.log("TVSeries error occured", tvID, error);
        return null;
    }
}

async function getUpcomingMovies() {
    const upcomingMovieAPI = `${tmdbBaseMovieAPIURL}upcoming?page=${page}&api_key=${tmdbAPIKey}&language=en-US`;

    let request = new Request(
        upcomingMovieAPI, {
            method: 'GET',
        }
    );

    let result;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['success'] != null) {
            throw Error(result["status_message"] != null ? result["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\nUpcoming movie request error occured", page, error);
        await sleep(750);
        return await getUpcomingMovies();
    }

    try {
        const data = result['results'];
        for (let index = 0; index < data.length; index++) {
            const item = data[index];

            if (item['popularity'] > 25) {
                movieIDList.push(item['id']);
            }
        }

        const totalPages = result['total_pages'];
        if (page < totalPages) {
            page += 1;
            return await getUpcomingMovies();
        } else {
            return movieIDList;
        }
    } catch (error) {
        console.log("Upcoming movie error occured", error);
        await sleep(750);
        return await getUpcomingMovies();
    }
}

async function getMovies(movieID) {
    const movieAPI = `${tmdbBaseMovieAPIURL}${movieID}?api_key=${tmdbAPIKey}&language=en-US`;
    const translationsMovieAPI = `${tmdbBaseMovieAPIURL}${movieID}/translations?api_key=${tmdbAPIKey}&language=en-US`;
    const streamingMovieAPI = `${tmdbBaseMovieAPIURL}${movieID}/watch/providers?api_key=${tmdbAPIKey}&language=en-US`;
    const creditsMovieAPI = `${tmdbBaseMovieAPIURL}${movieID}/credits?api_key=${tmdbAPIKey}&language=en-US`;

    let request = new Request(
        movieAPI, {
            method: 'GET',
        }
    );

    let streamingRequest = new Request(
        streamingMovieAPI, {
            method: 'GET',
        }
    );

    let translationRequest = new Request(
        translationsMovieAPI, {
            method: 'GET',
        }
    );

    let creditsRequest = new Request(
        creditsMovieAPI, {
            method: 'GET',
        }
    );

    let result;
    try {
        result = await fetch(request).then((response) => {
            return response.json();
        });

        if (result['success'] != null) {
            throw Error(result["status_message"] != null ? result["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\nMovie request error occured", movieAPI, error);
        await sleep(750);
        if (result['status_message'] == "The resource you requested could not be found." || result["status_code"] == 34) {
            console.log("Movie resource not found, skipping.");
            return null;
        }
        return await getMovies(movieID);
    }

    let streamingResult;
    try {
        streamingResult = await fetch(streamingRequest).then((response) => {
            return response.json();
        });

        if (streamingResult['success'] != null) {
            throw Error(streamingResult["status_message"] != null ? streamingResult["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\nMovie streaming request error occured", streamingMovieAPI, error);
        await sleep(750);
        return await getMovies(movieID);
    }

    let translationResult;
    try {
        translationResult = await fetch(translationRequest).then((response) => {
            return response.json();
        });

        if (translationResult['success'] != null) {
            throw Error(translationResult["status_message"] != null ? translationResult["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\nMovie translations request error occured", translationsMovieAPI, error);
        await sleep(750);
        return await getMovies(movieID);
    }

    let creditsResult;
    try {
        creditsResult = await fetch(creditsRequest).then((response) => {
            return response.json();
        });

        if (creditsResult['success'] != null) {
            throw Error(creditsResult["status_message"] != null ? creditsResult["status_message"] : "Unknown error.")
        }
    } catch (error) {
        console.log("\nMovie credits request error occured", creditsMovieAPI, error);
        await sleep(750);
        return await getMovies(movieID);
    }

    try {
        const productionCompaniesJson = result['production_companies'];
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

        const genresJson = result['genres'];
        const genreList = [];
        for (let index = 0; index < genresJson.length; index++) {
            const item = genresJson[index];
            genreList.push(item['name']);
        }

        const creditsJson = creditsResult['cast'];
        const creditsList = [];
        for (let index = 0; index < creditsJson.length; index++) {
            const item = creditsJson[index];
            if (item['known_for_department'] == "Acting") {
                creditsList.push({
                    name: item['name'],
                    image: `${tmdbBaseImageURL}original/${item['profile_path']}`,
                    character: item['character'],
                });
            }
        }

        const translationsJson = translationResult['translations'].filter( translation =>
            translation["english_name"] == "Turkish" ||
            translation["english_name"] == "Arabic" ||
            translation["english_name"] == "Spanish" ||
            translation["english_name"] == "French" ||
            translation["english_name"] == "Russian" ||
            translation["english_name"] == "German" ||
            translation["english_name"] == "Japanese" ||
            translation["english_name"] == "Korean" ||
            translation["english_name"] == "Dutch" ||
            translation["english_name"] == "Mandarin" ||
            translation["english_name"] == "Portuguese"
        );
        const translationsList = [];
        for (let index = 0; index < translationsJson.length; index++) {
            const item = translationsJson[index];
            translationsList.push({
                lan_code: item['iso_3166_1'],
                lan_name: item['name'],
                lan_name_en: item['english_name'],
                title: item['data']['title'],
                description: item['data']['overview'],
            });
        }

        var backdropImage = null
        if (result['backdrop_path'] != null && result['backdrop_path'] != undefined) {
            backdropImage = result['backdrop_path']
        } else if (
            result['belongs_to_collection'] != null && result['belongs_to_collection'] != undefined &&
            result['belongs_to_collection']['backdrop_path'] != null && result['belongs_to_collection']['backdrop_path'] != undefined
        ) {
            backdropImage = result['belongs_to_collection']['backdrop_path']
        }

        if (backdropImage != null) {
            backdropImage = `${tmdbBaseImageURL}original${backdropImage}`
        }

        const tempMovieModel = MovieModel({
            title_original: result['original_title'],
            title_en: result['title'],
            description: result['overview'],
            image_url: `${tmdbBaseImageURL}original${result['poster_path']}`,
            backdrop: backdropImage,
            status: result['status'],
            length: result['runtime'],
            imdb_id: result['imdb_id'],
            tmdb_id: result['id'],
            tmdb_popularity: result['popularity'],
            tmdb_vote: result['vote_average'],
            tmdb_vote_count: result['vote_count'],
            production_companies: productionCompaniesList,
            release_date: result['release_date'],
            genres: genreList,
            streaming: parseStreamingJsonData(streamingResult),
            actors: creditsList,
            translations: translationsList,
            created_at: new Date(),
        })

        return tempMovieModel;
    } catch (error) {
        console.log("Movie error occured", movieID, error);
        return null;
    }
}

function parseStreamingJsonData(result) {
    try {
        const jsonData = result['results'];
        const streamingList = [];

        Object.keys(jsonData).forEach(function(key) {
            if (
                key == "AT" ||
                key == "AU" ||
                key == "AZ" ||
                key == "BE" ||
                key == "CA" ||
                key == "CH" ||
                key == "DE" ||
                key == "DK" ||
                key == "EG" ||
                key == "ES" ||
                key == "FR" ||
                key == "GB" ||
                key == "HK" ||
                key == "IN" ||
                key == "KR" ||
                key == "MX" ||
                key == "NL" ||
                key == "NO" ||
                key == "PH" ||
                key == "PT" ||
                key == "RU" ||
                key == "SA" ||
                key == "SE" ||
                key == "TR" ||
                key == "TW" ||
                key == "US"
            ) {
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
            }
        });

        return streamingList.length > 0 ? streamingList : null;
    } catch (error) {
        console.log("Streaming parse error occured", error);
        return null;
    }
}

module.exports.GetUpcomingMovies = getUpcomingMovies;
module.exports.GetMovies = getMovies;
module.exports.GetTVSeries = getTVSeries;