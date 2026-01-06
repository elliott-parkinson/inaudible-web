import { render, h } from 'preact';
import { MainContent } from './layouts/main-content';
import { LocationProvider } from 'preact-iso';
import { signal, useSignalEffect } from '@preact/signals';

import { container } from "../../container";
import type { InaudibleService } from '../inaudible.service';

import arrowsRotate from "./icons/arrows-rotate.svg";

import { BottomNav } from './components/bottom-nav';
import type { AudiobookshelfApi } from '../audiobookshelf.api/service';
import { useLayoutEffect } from 'preact/hooks';

const loading = signal<boolean>(false);
const total = signal<number>(100);
const complete = signal<number>(0);

const defaultLibrary = "f887bdf8-abcd-4ab3-83f4-2b91e661343b";


let inaudible;

const synchronize = async () => {
    console.info(' - synchronizing - ')
    loading.value = true;

    if (!inaudible) {
        inaudible = container.get("inaudible.service") as InaudibleService;
        inaudible.sync.addEventListener("progress", (event: CustomEvent) => {
            console.info("progress", event.detail);
            total.value = event.detail.total;
            complete.value = event.detail.complete;
        });
    }

    complete.value = 1;
    total.value = 100;
    await inaudible.sync.synchronize(defaultLibrary);

    console.info(" - sync complete - ");

    setTimeout(() => {
      complete.value = 0;
      loading.value = false;
    }, 1000);
}

const auth = {
	loggedIn: signal(false),
};


const controller = () => {
 	const api = container.get("audiobookshelf.api") as AudiobookshelfApi;

	auth.loggedIn.value = api.loggedIn();

	api.events.on("login", (data) => {
		auth.loggedIn.value = true;
		console.log("login", data);
	});

	api.events.on("logout", () => {
		auth.loggedIn.value = false;
		console.log("logout");
	});

    useLayoutEffect(() => {
	    const dialog = document.getElementById('login-dialog') as HTMLDialogElement;
	    dialog.showModal();
    }, []);

    useSignalEffect(() => {
    	console.log("aut->loggedIn", auth.loggedIn.value);
		const dialog = document.getElementById('login-dialog') as HTMLDialogElement;
		if (auth.loggedIn.value) {
			dialog.close();
		} else {
			dialog.showModal();
		}
    });

	return {
		...auth,
		login: async () => {
			const form = document.getElementById('login-form') as HTMLFormElement;
			const server = (form.elements.namedItem('server-url') as HTMLInputElement).value;
			const username = (form.elements.namedItem('username') as HTMLInputElement).value;
			const password = (form.elements.namedItem('password') as HTMLInputElement).value;

			const result = await api.login(username, password, server);
			console.log('result', result);
			auth.loggedIn.value = true;
		}
	};
}

const App = () => {
	const auth = controller();

	return <LocationProvider>
		<adw-header>
			<meter min={0} max={total.value} value={complete.value}></meter>
			<section></section>
			Inaudible
			<section>
				<button title="sync" disabled={auth.loggedIn.value ? true : undefined}>
					<adw-icon onClick={e => synchronize()}><img src={arrowsRotate} alt="sync" /></adw-icon>
				</button>
			</section>
		</adw-header>
		<adw-content>
			<MainContent />

		</adw-content>
		<dialog id="login-dialog" is="adw-dialog">
			<adw-header>
				<section></section>
				Inaudible Login
				<section></section>
			</adw-header>
			<form id="login-form" class="stack wide" slot="body">
				<p>Please enter your audiobookshelf credentials to login.</p>
				<label>
					Server Url
					<input name="server-url" type="text" placeholder="Server URL" defaultValue={localStorage.getItem("abs_api_baseUrl")} />
				</label>
				<label>
					Username
					<input name="username" type="text" placeholder="Username" defaultValue={localStorage.getItem("abs_api_username")} />
				</label>
				<label>
					Password
					<input name="password" type="password" placeholder="Password" />
				</label>
			</form>
			<footer class="center">
				<button class="primary" onClick={() => auth.login()}>Login</button>
			</footer>
		</dialog>
		<BottomNav />
	</LocationProvider>;
}
export const init = async () => {
    render(<App />, document.getElementById('app'));
}
