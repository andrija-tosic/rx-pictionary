import fetch from 'node-fetch'

export namespace API {

    type FetchHeaders = {
        [key: string]: string
    }

    export function fetchAPI<T>(resource: string, method: 'GET' | 'PUT' | 'POST', body?: Partial<T>) {
        const fetchUrl = `${process.env.API_URL!}:${process.env.API_PORT}`;

        let fetchHeader: FetchHeaders | undefined = undefined;

        if (method === 'PUT' || method === 'POST') {
            fetchHeader = {
                'Content-Type': 'application/json'
            }
        }

        return fetch(`${fetchUrl}/${resource}`, {
            method: method,
            headers: fetchHeader,
            body: JSON.stringify(body)
        });
    }
}
