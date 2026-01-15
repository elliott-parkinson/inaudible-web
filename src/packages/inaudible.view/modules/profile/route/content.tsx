import { render, h } from 'preact';
import model from '../../../model';
import { useLayoutEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';

const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const { data, loading, error, load, logout } = model.profile.details;

    useLayoutEffect(() => {
        load();
    }, [route]);

    return {
        data,
        loading,
        error,
        logout: async () => {
            await logout();
            location.route("/discover");
        },
    };
};

export default () => {
    const { data, loading, error, logout } = controller();
    const profile = data.value;

    return (
        <adw-clamp>
            <h2>Profile</h2>
            {loading.value ? (
                <section style={{ textAlign: 'center' }}>Loading...</section>
            ) : error.value ? (
                <section style={{ textAlign: 'center' }}>{error.value}</section>
            ) : (
                <section class="stack">
                    <label>
                        Username
                        <input type="text" value={profile?.username ?? ""} disabled />
                    </label>
                    <label>
                        Account Type
                        <input type="text" value={profile?.type ?? ""} disabled />
                    </label>
                </section>
            )}

            <h3>Change Password</h3>
            <form class="stack" onSubmit={(event) => event.preventDefault()}>
                <label>
                    Password
                    <input type="password" name="password" autoComplete="current-password" />
                </label>
                <label>
                    New Password
                    <input type="password" name="new-password" autoComplete="new-password" />
                </label>
                <label>
                    Confirm Password
                    <input type="password" name="confirm-password" autoComplete="new-password" />
                </label>
                <button type="submit" class="primary">Update Password</button>
            </form>

            <h3>Session</h3>
            <button onClick={() => logout()}>Logout</button>
        </adw-clamp>
    );
};
