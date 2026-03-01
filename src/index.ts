import { APromise } from "./promiseAPlus.js";

const a = new APromise((res, rej) => res({ hello: 111 }));
a.then(value => console.log("a", value));
const b = new Promise(res => res({ heloo: 1111 }));
b.then(value => console.log("b", value));
console.log(a, b);
