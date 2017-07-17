module.exports.post = (feat) => {
    if (!feat) return;

    feat.id =  Math.floor((Math.random() * 2147483647) + 1);

    return feat;
}
