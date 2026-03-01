import { APromise } from "./promiseAPlus";

const adapter = {
    deferred: () => {
        const promise = new APromise(() => {});
        return {
            resolve: promise.resolve,
            reject: promise.onRejected,
            promise,
        };
    },
};

module.exports = adapter;
