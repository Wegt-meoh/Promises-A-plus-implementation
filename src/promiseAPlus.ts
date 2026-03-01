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
    // 2.1
    #state: State;
    #onFulfilledList: Array<AnyFunction>;
    #onRejectedList: Array<AnyFunction>;
    #value?: T;
    #reason?: unknown;

    // 2.3
    resolvePromise = (promise: APromise<T>, x: T | APromiseLike<T>, resolve: (value: T) => void, reject: (reason: unknown) => void) => {
        if (promise === x) {
            // 2.3.1
            reject(new TypeError("can not resolve promise with itself."));
            return;
        }

        // 2.3.2
        if (x instanceof APromise) {
            if (x.#state === "pending") {
                // 2.3.2.1
                x.then(resolve, reject);
            }
            else if (x.#state === "fulfilled") {
                // 2.3.2.2
                resolve(x.#value);
            }
            else {
                // 2.3.2.3
                reject(x.#reason);
            }
            return;
        }

        // 2.3.3
        if (Object.prototype.toString.call(x) === "[object Object]" || Object.prototype.toString.call(x) === "[object Function]") {
            try {
                // 2.3.3.1
                const retrivedThen = (x as APromise<T>).then;
                if (Object.prototype.toString.call(retrivedThen) === "[object Function]") {
                    let hasResolved = false;
                    try {
                        // 2.3.3.3
                        retrivedThen.call(x, (y) => {
                            // 2.3.3.3.3
                            if (hasResolved) return;
                            hasResolved = true;
                            // 2.3.3.3.1
                            this.resolvePromise(promise, y, resolve, reject);
                        }, (r) => {
                            // 2.3.3.3.3
                            if (hasResolved) return;
                            hasResolved = true;
                            // 2.3.3.3.2
                            reject(r);
                        });
                    }
                    catch (e) {
                        // 2.3.3.3.4.1
                        if (!hasResolved) {
                            // 2.3.3.3.4.2
                            reject(e);
                        }
                    }
                }
                else {
                    // 2.3.3.4
                    this.onFulfilled(x as T);
                }
            }
            catch (e) {
                // 2.3.3.2
                reject(e);
            }
            return;
        }

        // 2.3.4
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
        // 2.1.1, 2.1.2
        if (this.#state !== "pending") return;
        this.#state = "fulfilled";
        this.#value = value;
        // 2.2.6.1
        this.#onFulfilledList.forEach(fn => fn());
    };

    onRejected = (reason?: unknown) => {
        // 2.1.1, 2.1.3
        if (this.#state !== "pending") return;
        this.#state = "rejected";
        this.#reason = reason;
        // 2.2.6.2
        this.#onRejectedList.forEach(fn => fn());
    };

    // 2.2, 2.2.1, 2.2.6, 2.2.7
    then = <TResult1 = T, TResult2 = never>(onFulfilled?: (value: T) => TResult1 | APromiseLike<TResult1> | undefined | null, onRejected?: (value: unknown) => TResult2 | APromiseLike<TResult2> | undefined | null) => {
        // 2.2.5
        const noThisOnFulfilled = typeof onFulfilled !== "function" ? onFulfilled : onFulfilled.bind(undefined);
        // 2.2.5
        const noThisOnRejected = typeof onRejected !== "function" ? onRejected : onRejected.bind(undefined);

        const promise = new APromise((resolve, reject) => {
            if (this.#state === "fulfilled") {
                // 2.2.4
                setTimeout(() => {
                    // 2.2.2
                    if (typeof noThisOnFulfilled === "function") {
                        try {
                            // 2.2.2.1, 2.2.2.2, 2.2.2.3
                            const x = noThisOnFulfilled(this.#value!);
                            // 2.2.7.1
                            resolve(x);
                        }
                        catch (e) {
                            // 2.2.7.2
                            reject(e);
                        }
                    }
                    else {
                        // 2.2.7.3
                        resolve(this.#value);
                    }
                });
            }
            if (this.#state === "rejected") {
                // 2.2.4
                setTimeout(() => {
                    // 2.2.3
                    if (typeof noThisOnRejected === "function") {
                        try {
                            // 2.2.3.1, 2.2.3.2, 2.2.3.3
                            const x = noThisOnRejected(this.#reason);
                            // 2.2.7.1
                            resolve(x);
                        }
                        catch (e) {
                            // 2.2.7.2
                            reject(e);
                        }
                    }
                    else {
                        // 2.2.7.4
                        reject(this.#reason);
                    }
                });
            }
            if (this.#state === "pending") {
                this.#onFulfilledList.push(() => {
                    setTimeout(() => {
                        if (typeof noThisOnFulfilled === "function") {
                            try {
                            // 2.2.2.1, 2.2.2.2, 2.2.2.3
                                const x = noThisOnFulfilled(this.#value!);
                                // 2.2.7.1
                                resolve(x);
                            }
                            catch (e) {
                                // 2.2.7.2
                                reject(e);
                            }
                        }
                        else {
                            // 2.2.7.3
                            resolve(this.#value);
                        }
                    });
                });
                this.#onRejectedList.push(() => {
                    setTimeout(() => {
                        if (typeof noThisOnRejected === "function") {
                            try {
                            // 2.2.3.1, 2.2.3.2, 2.2.3.3
                                const x = noThisOnRejected(this.#reason);
                                // 2.2.7.1
                                resolve(x);
                            }
                            catch (e) {
                                // 2.2.7.2
                                reject(e);
                            }
                        }
                        else {
                            // 2.2.7.4
                            reject(this.#reason);
                        }
                    });
                });
            }
        });

        return promise;
    };
}
