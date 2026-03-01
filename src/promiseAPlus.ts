import util from "util";

type State = "pending" | "fulfilled" | "rejected";
type AnyFunction = (...args: unknown[]) => unknown;
type APromiseLike<T> = {
    then<TResult1 = T, TResult2 = never>(onfulfilled: (value: T) => TResult1 | APromiseLike<TResult1> | undefined | null,
        onRejected: (reason: unknown) => TResult2 | APromiseLike<TResult2> | undefined | null
    ): APromiseLike<TResult1 | TResult2>
};
type AwaitPromiseLike<T> = T extends undefined | null ? T
    : T extends object & {
        then(onfulfilled: infer F, ...args: infer _): unknown
    } ? F extends (value: infer V, ...args: infer _) => unknown ? AwaitPromiseLike<V>
            : never
        : T;

export class APromise<T> {
    #state: State;
    #onFulfilledList: Array<AnyFunction>;
    #onRejectedList: Array<AnyFunction>;
    #value?: T;
    #reason?: unknown;

    resolvePromise = (promise: APromise<T>, x: T | APromiseLike<T>, resolve: (value: T) => void, reject: (reason: unknown) => void) => {
        if (promise === x) {
            reject(new TypeError("can not resolve promise with itself."));
            return;
        }

        if (x instanceof APromise) {
            if (x.#state === "pending") {
                x.then(resolve, reject);
            }
            else if (x.#state === "fulfilled") {
                resolve(x.#value);
            }
            else {
                reject(x.#reason);
            }
            return;
        }

        if (Object.prototype.toString.call(x) === "[object Object]" || Object.prototype.toString.call(x) === "[object Function]") {
            try {
                const retrivedThen = (x as APromise<T>).then;
                if (Object.prototype.toString.call(retrivedThen) === "[object Function]") {
                    let hasResolved = false;
                    try {
                        retrivedThen.call(x, (y) => {
                            if (hasResolved) return;
                            hasResolved = true;
                            this.resolvePromise(promise, y, resolve, reject);
                        }, (r) => {
                            if (hasResolved) return;
                            hasResolved = true;
                            reject(r);
                        });
                    }
                    catch (e) {
                        if (!hasResolved) {
                            reject(e);
                        }
                    }
                }
                else {
                    this.onFulfilled(x as T);
                }
            }
            catch (e) {
                reject(e);
            }
            return;
        }

        this.onFulfilled(x as T);
    };

    [util.inspect.custom]() {
        if (this.#state === "pending") {
            return `Promise{ <${this.#state}> }`;
        }
        else if (this.#state === "rejected") {
            return `Promise{ ${this.#reason} }`;
        }
        else {
            return `Promise{ ${this.#value} }`;
        }
    }

    constructor(init: (resolve: (x: T | APromiseLike<T>) => void, reject: (r: unknown) => void) => void) {
        this.#state = "pending";
        this.#onFulfilledList = [];
        this.#onRejectedList = [];

        try {
            init.call(this, this.resolve, this.onRejected);
        }
        catch (e) {
            this.onRejected(e);
        }
    }

    resolve = (x: T | APromiseLike<T>) => {
        this.resolvePromise(this, x, this.onFulfilled, this.onRejected);
    };

    onFulfilled = (value: T) => {
        if (this.#state !== "pending") return;
        this.#state = "fulfilled";
        this.#value = value;
        this.#onFulfilledList.forEach(fn => fn());
    };

    onRejected = (reason?: unknown) => {
        if (this.#state !== "pending") return;
        this.#state = "rejected";
        this.#reason = reason;
        this.#onRejectedList.forEach(fn => fn());
    };

    then = <TResult1 = T, TResult2 = never>(onFulfilled?: (value: T) => TResult1 | APromiseLike<TResult1> | undefined | null, onRejected?: (value: unknown) => TResult2 | APromiseLike<TResult2> | undefined | null) => {
        const promise = new APromise((resolve, reject) => {
            if (this.#state === "fulfilled") {
                setTimeout(() => {
                    if (typeof onFulfilled === "function") {
                        try {
                            const x = onFulfilled(this.#value!);
                            resolve(x);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                    else {
                        resolve(this.#value);
                    }
                });
            }
            if (this.#state === "rejected") {
                setTimeout(() => {
                    if (typeof onRejected === "function") {
                        try {
                            const x = onRejected(this.#reason);
                            resolve(x);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                    else {
                        reject(this.#reason);
                    }
                });
            }
            if (this.#state === "pending") {
                this.#onFulfilledList.push(() => {
                    setTimeout(() => {
                        if (typeof onFulfilled === "function") {
                            try {
                                const x = onFulfilled(this.#value!);
                                resolve(x);
                            }
                            catch (e) {
                                reject(e);
                            }
                        }
                        else {
                            resolve(this.#value);
                        }
                    });
                });
                this.#onRejectedList.push(() => {
                    setTimeout(() => {
                        if (typeof onRejected === "function") {
                            try {
                                const x = onRejected(this.#reason);
                                resolve(x);
                            }
                            catch (e) {
                                reject(e);
                            }
                        }
                        else {
                            reject(this.#reason);
                        }
                    });
                });
            }
        });

        return promise;
    };
}
