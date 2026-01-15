type ThenFunction = (onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => APromiseType;
type State = "pending" | "fulfilled" | "rejected";
interface APromiseType {
    state: State
    then: ThenFunction
}

export class APromise implements APromiseType {
    state: State;
    onFulfilledList: Array<(...args: unknown[]) => unknown>;
    onRejectedList: Array<(...args: unknown[]) => unknown>;
    hasCalled;
    value?: unknown;
    reason?: unknown;

    onFulfilled(value?: unknown) {
        this.state = "fulfilled";
        this.value = value;
        for (const item of this.onFulfilledList) {
            item.call(undefined, this.value);
        }
    }

    onRejected(reason?: unknown) {
        this.state = "rejected";
        this.reason = reason;
        for (const item of this.onRejectedList) {
            item.call(undefined, this.reason);
        }
    }

    resolve(x: unknown) {
        if (x === this) {
            this.reject(new TypeError("can not resolve promise itself"));
            return;
        }

        if (x instanceof APromise) {
            if (x.state === "fulfilled") {
                this.onFulfilled(x.value);
            }

            if (x.state === "rejected") {
                this.onRejected(x.reason);
            }

            if (x.state === "pending") {
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
                        if (!this.hasCalled) {
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
    }

    reject(x: unknown) {
        this.onRejected(x);
    }

    resolvePromise(y: unknown) {
        if (this.hasCalled) return;
        this.hasCalled = true;
        this.resolve(y);
    }

    rejectPromise(r: unknown) {
        if (this.hasCalled) return;
        this.hasCalled = true;
        this.reject(r);
    }

    constructor(init: (resolve: typeof this.resolve, reject: typeof this.reject) => void) {
        this.state = "pending";
        this.hasCalled = false;
        this.onFulfilledList = [];
        this.onRejectedList = [];

        try {
            init.call(this, this.resolve, this.reject);
        }
        catch (error) {
            this.reject(error);
        }
        return this;
    }

    then(onFulfilled: unknown, onRejected: unknown) {
        if (onFulfilled instanceof Function) {
            this.onFulfilledList.push(onFulfilled as (...args: unknown[]) => unknown);
        }

        if (onRejected instanceof Function) {
            this.onRejectedList.push(onRejected as (...args: unknown[]) => unknown);
        }

        const promise = new APromise((resolve) => {
            resolve(this);
        });

        return promise;
    }
}
