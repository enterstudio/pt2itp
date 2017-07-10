const posts = [];

class Post {

    constructor(post = []) {
        for (p of post) {
            posts.push(require(`./post/${p}`).post);
        }

        //Mandatory Post Operations
        posts.push(require('./post/id'));
    }

    feat(f) {
        for (let post of posts) {
            f = post(f);
        }
    }
}

