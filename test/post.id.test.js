const post = require('../lib/post/id').post;
const test = require('tape');

test('Post: Id', (t) => {
    t.equals(post(), undefined);
    t.ok(post({}).id);
    t.ok(post({}).id);
    t.ok(post({}).id);
    t.ok(post({}).id);
    t.ok(post({}).id);
    t.ok(post({}).id);

    t.end();
});
