const posts = [];

class Post {

    constructor(post) {
        for (p of post) {
            posts.push(require(`./post/${p}`).post);
        }
    }

    feat(f) {
        for (let post of posts) {
            f = post(f);
        }
    }
}

