import { APromise } from "./promiseAPlus.js";

const adapter = {
    deferred: () => {
        const promise = new APromise(() => {});
        return {
            resolve: promise.resolve,
            reject: promise.reject,
            promise,
        };
    },
};

module.exports = adapter;
