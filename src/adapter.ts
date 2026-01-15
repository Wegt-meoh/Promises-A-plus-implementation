import { APromise } from "./promiseAPlus.js";

export const adapter = {
    deferred: () => {
        const promise = new APromise(() => {});
        return {
            resolve: promise.resolve,
            reject: promise.reject,
            promise,
        };
    },
};
