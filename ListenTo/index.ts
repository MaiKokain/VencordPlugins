/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { FluxDispatcher, UserStore } from "@webpack/common";
let logger!: Logger;

export default definePlugin({
    name: "ListenTo",
    description: "just changes your spotify rpc to 'Listening to {ARTIST}' (only first artist is used, if have multiple)",
    authors: [Devs.MaiKokain],
    start() {
        logger = new Logger(this.name);

        FluxDispatcher.subscribe("SPOTIFY_PLAYER_STATE", function(e: SpotifyPlayer) {
            if (e.track === null) return;
            if (e.isPlaying === false) return setActivity();
            try {
                setActivity(generateActivity(e));
            } catch(e) {
                logger.error(e);
            }
        });


    },
    stop() {
        FluxDispatcher.unsubscribe("SPOTIFY_PLAYER_STATE", setActivity);
    },  
});

function setActivity(activity: any = null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity
    });
}

function generateActivity(e: SpotifyPlayer): Activity {
    const artists = generateArtistsData(e.track.artists);
    const as_activ: Activity = {
        flags: 48,
        assets: {
            large_image: `spotify:${e.track.album.image.url.split(/\/image\/(.*?)$/g)[1]}`,
            large_text: e.track.album.name
        },
        details: e.track.name,
        state: artists.artists_name,
        name: e.track.artists[0].name,
        sync_id: e.track.id,
        timestamps: {
            end: e.position < 1000 ? Date.now()+e.track.duration : Date.now()+e.track.duration-e.position
        },
        party: {
            id: `spotify:${UserStore.getCurrentUser().id}`
        },
        metadata: {
            album_id: e.track.album.id,
            artist_ids: artists.artists_ids,
            button_urls: [`http://open.spotify.com/track/${e.track.id}`],
            context_uri: null
        },
        type: 2,
        application_id: UserStore.getCurrentUser().id, // works, just errors in dev console can change to a real app id to stop
        buttons: [`Stream ${e.track.name.length < 20 ? e.track.name : e.track.name.slice(0, 20)+"..."}`]
    };

    return as_activ;
}

function generateArtistsData(artists: SpotifyPlayerTrackArtists[]): generateArtistsDataReturn {
    const artistsData: generateArtistsDataReturn = { artists_name: "", artists_ids: [] };
    if (artists.length < 1) {
        artistsData.artists_name = artists[0].name;
        artistsData.artists_ids.push(artists[0].id.replace(/spotify:artist:/g, ""));
    }

    artists.map((v, i) => {
        if (i === artists.length-1) {
            artistsData.artists_name += `${v.name}`;
        } else {
            artistsData.artists_name += `${v.name}; `;
        }
        artistsData.artists_ids.push(v.id.replace(/spotify:artist:/g, ""));
    });

    return artistsData;
}

interface generateArtistsDataReturn {
    artists_name: string,
    artists_ids: string[]
}

interface Activity {
    name?: string,
    assets?: {
        large_image?: string,
        large_text?: string
    },
    details?: string,
    state?: string,
    timestamps?: {
        start?: number,
        end?: number
    },
    party?: {
        id?: string
    },
    sync_id?: string,
    flags?: number,
    metadata?: {
        album_id: string,
        artist_ids: String[],
        button_urls?: string[],
        context_uri?: any
    },
    type?: 0|2,
    application_id?: string
    buttons?: string[],
}
interface SpotifyPlayer {
    accountId: string,
    volumePercent: number,
    isPlaying: boolean,
    actual_repeat: "on"|"off",
    repeat: boolean,
    position: number,
    device: SpotifyPlayerDevice,
    track: SpotifyPlayerTrack
}

interface SpotifyPlayerDevice {
    id: string,
    is_active: boolean,
    is_private_session: boolean,
    is_restricted: boolean,
    name: string,
    supports_volume: boolean,
    type: string,
    volume_percent: number
}

interface SpotifyPlayerTrack {
    id: string,
    name: string,
    duration: number,
    album: {
        id: string,
        name: string,
        image: {
            height: number,
            url: string,
            width: number
        }
    },
    artists: SpotifyPlayerTrackArtists[],
    isLocal: boolean
}

interface SpotifyPlayerTrackArtists {
    external_urls: {
        spotify: string
    },
    href: string,
    id: string,
    name: string,
    type: "artist",
    uri: string
}
