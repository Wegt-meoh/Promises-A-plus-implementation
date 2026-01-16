import util from "util";

type State = "pending" | "fulfilled" | "rejected";
type AnyFunction = (...args: unknown[]) => unknown;

export class APromise {
    #state: State;
    #onFulfilledList: Array<AnyFunction>;
    #onRejectedList: Array<AnyFunction>;
    #hasCalled;
    #value?: unknown;
    #reason?: unknown;

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

    constructor(init: (resolve: typeof this.resolve, reject: typeof this.reject) => void) {
        this.#state = "pending";
        this.#hasCalled = false;
        this.#onFulfilledList = [];
        this.#onRejectedList = [];

        try {
            init.call(this, this.resolve, this.reject);
        }
        catch (error) {
            this.reject(error);
        }
        return this;
    }

    onFulfilled = (value?: unknown) => {
        if (this.#state !== "pending") return;
        this.#state = "fulfilled";
        this.#value = value;
        setTimeout(() => {
            for (const item of this.#onFulfilledList) {
                item.call(undefined, this.#value);
            }
        });
    };

    onRejected = (reason?: unknown) => {
        if (this.#state !== "pending") return;
        this.#state = "rejected";
        this.#reason = reason;
        setTimeout(() => {
            for (const item of this.#onRejectedList) {
                item.call(undefined, this.#reason);
            }
        });
    };

    resolve = (x: unknown) => {
        if (x === this) {
            this.reject(new TypeError("can not resolve promise itself"));
            return;
        }

        if (x instanceof APromise) {
            if (x.#state === "fulfilled") {
                this.onFulfilled(x.#value);
            }

            if (x.#state === "rejected") {
                this.onRejected(x.#reason);
            }

            if (x.#state === "pending") {
                x.then(
                    (value: unknown) => { this.resolve(value); },
                    (reason: unknown) => { this.reject(reason); },
                );
            }
            return;
        }

        if (x instanceof Function || x instanceof Object) {
            try {
                this.then = (x as APromise).then;
                if (this.then instanceof Function) {
                    try {
                        this.then.call(x, this.resolvePromise, this.rejectPromise);
                    }
                    catch (e) {
                        if (!this.#hasCalled) {
                            this.reject(e);
                        }
                    }
                }
                else {
                    this.onFulfilled(x);
                }
            }
            catch (error) {
                this.reject(error);
            }

            return;
        }

        this.onFulfilled(x);
    };

    reject = (x: unknown) => {
        this.onRejected(x);
    };

    resolvePromise = (y: unknown) => {
        if (this.#hasCalled) return;
        this.#hasCalled = true;
        this.resolve(y);
    };

    rejectPromise = (r: unknown) => {
        if (this.#hasCalled) return;
        this.#hasCalled = true;
        this.reject(r);
    };

    then = (onFulfilled: AnyFunction, onRejected: AnyFunction) => {
        const promise = new APromise((resolve, reject) => {
            if (onFulfilled instanceof Function) {
                this.#onFulfilledList.push((...args: unknown[]) => {
                    try {
                        const x = onFulfilled(...args);
                        resolve(x);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            }
            else {
                this.#onFulfilledList.push(() => {
                    resolve(this.#value);
                });
            }

            if (onRejected instanceof Function) {
                this.#onRejectedList.push((...args: unknown[]) => {
                    try {
                        const x = onRejected(...args);
                        resolve(x);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            }
            else {
                this.#onRejectedList.push(() => {
                    reject(this.#reason);
                });
            }
        });

        return promise;
    };
}
