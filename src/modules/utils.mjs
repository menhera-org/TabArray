
export const sleep = (secs) => new Promise((res) => {
    setTimeout(() => res(), secs * 1000);
});
