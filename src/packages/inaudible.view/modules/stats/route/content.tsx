import { render, h } from 'preact';
import model from '../../../model';
import { useLayoutEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import type { MeListeningStats } from '../../../../audiobookshelf.api/interfaces/api/me-listening-stats';

const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const { data, loading, error, load } = model.stats.listening;

    useLayoutEffect(() => {
        load();
    }, [route]);

    return {
        data,
        loading,
        error,
        location,
    };
};

const formatSeconds = (value?: number) => {
    if (!value || !Number.isFinite(value)) {
        return "0m";
    }
    const minutes = Math.floor(value / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
};

const formatDate = (value?: number) => {
    if (!value || !Number.isFinite(value)) {
        return "Unknown";
    }
    return new Date(value).toLocaleDateString();
};

export default () => {
    const { data, loading, error, location } = controller();
    const stats = data.value;
    const sessions = stats?.recentSessions ?? [];
    const sessionByItem = new Map<string, { lastUpdated: number; firstStarted: number }>();

    for (const session of sessions) {
        const itemId = session.libraryItemId;
        if (!itemId) {
            continue;
        }
        const startedAt = Number(session.startedAt ?? session.updatedAt ?? 0);
        const updatedAt = Number(session.updatedAt ?? startedAt);
        const existing = sessionByItem.get(itemId);
        if (!existing) {
            sessionByItem.set(itemId, { lastUpdated: updatedAt, firstStarted: startedAt });
            continue;
        }
        sessionByItem.set(itemId, {
            lastUpdated: Math.max(existing.lastUpdated, updatedAt),
            firstStarted: Math.min(existing.firstStarted || startedAt, startedAt || existing.firstStarted),
        });
    }

    const items = (Object.values(stats?.items ?? {}) as MeListeningStats.ListeningItem[])
        .filter(item => (item.timeListening ?? 0) > 0)
        .map(item => {
            const timing = sessionByItem.get(item.id);
            return {
                ...item,
                lastUpdated: timing?.lastUpdated ?? 0,
                firstStarted: timing?.firstStarted ?? 0,
            };
        })
        .sort((a, b) => (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0));

    return (
        <adw-clamp>
            <h2>Listening Stats</h2>
            {loading.value ? (
                <section style={{ textAlign: 'center' }}>Loading...</section>
            ) : error.value ? (
                <section style={{ textAlign: 'center' }}>{error.value}</section>
            ) : (
                <>
                    <h3>Summary</h3>
                    <adw-preferences-group>
                        <adw-action-row>
                            <span>Total Listening Time</span>
                            <span>{formatSeconds(stats?.totalTime)}</span>
                        </adw-action-row>
                        <adw-action-row>
                            <span>Items With Listening Time</span>
                            <span>{Object.keys(stats?.items ?? {}).length}</span>
                        </adw-action-row>
                        <adw-action-row>
                            <span>Recent Sessions</span>
                            <span>{stats?.recentSessions?.length ?? 0}</span>
                        </adw-action-row>
                        <adw-action-row>
                            <span>Today</span>
                            <span>{formatSeconds(stats?.today ?? 0)}</span>
                        </adw-action-row>
                    </adw-preferences-group>
                </>
            )}

            {!loading.value && !error.value && items.length > 0 && (
                <>
                    <h3>Listened Items</h3>
                    <adw-preferences-group>
                        {items.map(item => (
                            <adw-action-row
                                key={item.id}
                                onClick={() => location.route(`/books/${item.id}`)}
                            >
                                <span>
                                    {(item.mediaMetadata as { title?: string })?.title ?? item.id}
                                    {` • Started ${formatDate(item.firstStarted)}`}
                                </span>
                                <span>{formatSeconds(item.timeListening)}</span>
                            </adw-action-row>
                        ))}
                    </adw-preferences-group>
                </>
            )}
        </adw-clamp>
    );
};
