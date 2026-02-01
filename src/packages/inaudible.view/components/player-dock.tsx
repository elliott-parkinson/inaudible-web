import { h } from 'preact';
import model from '../model';
import { container } from "../../../container";
import type { AudiobookshelfApi } from '../../audiobookshelf.api/service';
import { useEffect } from 'preact/hooks';
import { AudiobookPlayerView } from './audiobook-player';

export const PlayerDock = () => {
    const { current, open, closePlayer } = model.player;
    const payload = current.value;
    useEffect(() => {
        model.player.restorePlayer();
    }, []);

    if (!open.value || !payload) {
        return null;
    }

    const api = container.get("audiobookshelf.api") as AudiobookshelfApi;
    const accessToken = api.getAccessToken();
    const baseUrl = api.getBaseUrl();

    return (
        <div className="adw-player-dock">
            <div className="adw-player">
                <AudiobookPlayerView
                    mediaItemId={payload.libraryItemId}
                    apiKey={accessToken ?? ""}
                    baseUrl={baseUrl ?? ""}
                    coverUrl={payload.coverUrl ?? ""}
                    title={payload.title ?? ""}
                    author={payload.author ?? ""}
                    startPosition={payload.startPosition ?? 0}
                    autoplay={payload.autoplay !== false}
                    onTimeUpdate={(currentTime) => {
                        model.player.updatePosition(currentTime);
                    }}
                    onClose={() => closePlayer()}
                />
            </div>
        </div>
    );
};
