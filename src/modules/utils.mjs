
export const sleep = (secs) => new Promise((res) => {
    setTimeout(() => res(), secs * 1000);
});

export const callIgnoringErrors = (callback, ... args) => {
    try {
        const promise = Promise.resolve(callback(... args));
        promise.catch(() => void 0);
    } catch (e) {}
};
