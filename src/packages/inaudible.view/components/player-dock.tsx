import { h } from 'preact';
import model from '../model';
import { container } from "../../../container";
import type { AudiobookshelfApi } from '../../audiobookshelf.api/service';

export const PlayerDock = () => {
    const { current, open, closePlayer } = model.player;
    const payload = current.value;

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
                    <button onClick={() => closePlayer()}>Close</button>
                </div>
                <audiobookshelf-player
                    media-item-id={payload.libraryItemId}
                    api-key={accessToken ?? ""}
                    base-url={baseUrl ?? ""}
                    cover-url={payload.coverUrl ?? ""}
                    start-position={payload.startPosition ?? 0}
                />
            </div>
        </div>
    );
};
