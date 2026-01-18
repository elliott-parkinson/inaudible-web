import { h } from 'preact';
import model from '../model';
import { container } from "../../../container";
import type { AudiobookshelfApi } from '../../audiobookshelf.api/service';
import { useEffect, useRef } from 'preact/hooks';

export const PlayerDock = () => {
    const { current, open, closePlayer } = model.player;
    const payload = current.value;
    const playerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        model.player.restorePlayer();
    }, []);

    useEffect(() => {
        const target = playerRef.current;
        if (!target) {
            return;
        }
        const onTime = (event: Event) => {
            const detail = (event as CustomEvent).detail as { currentTime?: number };
            if (typeof detail?.currentTime === 'number') {
                model.player.updatePosition(detail.currentTime);
            }
        };
        target.addEventListener('player-timeupdate', onTime);
        return () => {
            target.removeEventListener('player-timeupdate', onTime);
        };
    }, [payload?.libraryItemId]);

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
                    ref={playerRef as any}
                    media-item-id={payload.libraryItemId}
                    api-key={accessToken ?? ""}
                    base-url={baseUrl ?? ""}
                    cover-url={payload.coverUrl ?? ""}
                    start-position={payload.startPosition ?? 0}
                    autoplay={payload.autoplay === false ? "false" : undefined}
                />
            </div>
        </div>
    );
};
