import { h } from 'preact';
import model from '../model';
import { container } from "../../../container";
import type { AudiobookshelfApi } from '../../audiobookshelf.api/service';
import { useEffect } from 'preact/hooks';
import { AudiobookPlayerView } from './audiobook-player';
import closeIcon from "../icons/process-stop-symbolic.svg";

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
                <div className="adw-player-header">
                    <strong>{payload.title}</strong>
                    <button onClick={() => closePlayer()}>
                        <adw-icon style="width: 1.4em; height: 1.4em;">
                            <img src={closeIcon} alt="Close player" />
                        </adw-icon>
                    </button>
                </div>
                <AudiobookPlayerView
                    mediaItemId={payload.libraryItemId}
                    apiKey={accessToken ?? ""}
                    baseUrl={baseUrl ?? ""}
                    coverUrl={payload.coverUrl ?? ""}
                    startPosition={payload.startPosition ?? 0}
                    autoplay={payload.autoplay !== false}
                    onTimeUpdate={(currentTime) => {
                        model.player.updatePosition(currentTime);
                    }}
                />
            </div>
        </div>
    );
};
