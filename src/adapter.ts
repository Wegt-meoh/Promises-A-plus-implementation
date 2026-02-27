import { APromise } from "./promiseAPlus";

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
