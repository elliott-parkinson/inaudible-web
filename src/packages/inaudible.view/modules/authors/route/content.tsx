import { render, h } from 'preact';
import model from '../../../model';
import { useEffect, useLayoutEffect } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { Signal, signal } from '@preact/signals';
import profile from "../../../icons/user.svg";


const viewModel = {
    searchTerm:  signal<string>(""),
}

const controller = () => {
    const route = useRoute();
    const location = useLocation();
    const { data, loading, error, load } = model.authors.list;

    useEffect(() => {
        const unsub = viewModel.searchTerm.subscribe(value => {
            if (value.length >= 3) {
                load({ page: 0, limit: 82, searchTerm: viewModel.searchTerm.value });
            }
            else if (value == "") {
                load({ page: 0, limit: 82 });
            }
        });
        return () => unsub();
    }, []);

    useLayoutEffect(() => {
        load({ page: 0, limit: 82 });
    }, [route]);

    return {
        route,
        location,
        data, error, loading, load,
    }
}

export default () => {
    const {
        route,
        location,
        data, error, loading, load,
    } = controller();

    return <>
        <adw-clamp>
            <section >
                <form className="stack">
                    <input type="search" placeholder="Search Authors" required onInput={(e) => viewModel.searchTerm.value = (e.target as any).value} defaultValue={viewModel.searchTerm.value}/>
                </form>
            </section>
            { loading.value == true ? <section style={{ textAlign: 'center' }}>Loading... {loading.value}</section> : <ol class="authors">
                {data.value.map(author => <li key={author.id} onClick={e => location.route(`/authors/${author.id}`)}>
                    <figure class="author">
                        <picture>
                            <img src={author.pictureUrl} onError={(e) => (e.target as any).src = profile} />
                        </picture>
                        <figcaption>{author.name}</figcaption>
                        <span>{author.numBooks} books</span>
                    </figure>
                </li>)}
            </ol> }
        </adw-clamp>
    </>;
}
